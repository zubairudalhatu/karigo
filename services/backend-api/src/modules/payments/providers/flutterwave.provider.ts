import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "crypto";
import {
  InitializePaymentInput,
  InitializePaymentResult,
  PaymentProvider,
  PaymentWebhookContext,
  VerifyPaymentResult,
  WebhookPaymentResult
} from "./payment-provider.interface";
import {
  configText,
  PaymentInitializationStage,
  PaymentProviderInitializationException
} from "./payment-provider-diagnostics";

interface FlutterwaveEnvelope {
  status?: string;
  message?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

interface FlutterwaveTokenCache {
  token: string;
  expiresAtMs: number;
}

@Injectable()
export class FlutterwaveProvider implements PaymentProvider {
  readonly name = "flutterwave" as const;
  private readonly logger = new Logger(FlutterwaveProvider.name);
  private tokenCache: FlutterwaveTokenCache | null = null;

  constructor(private readonly config: ConfigService) {}

  async initialize(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    const response = await this.request(this.checkoutPath(), {
      method: "POST",
      body: JSON.stringify({
        tx_ref: input.transactionReference,
        reference: input.transactionReference,
        amount: input.amount,
        currency: input.currency || "NGN",
        redirect_url: this.redirectUrl(),
        callback_url: this.redirectUrl(),
        narration: "KariGO order payment",
        description: "KariGO order payment",
        customer: {
          email: this.customerEmail(input),
          phonenumber: input.customerPhone,
          phone_number: input.customerPhone,
          name: this.string(input.metadata.customerName)
        },
        customizations: {
          title: "KariGO",
          description: "KariGO order payment",
          logo: this.logoUrl()
        },
        meta: input.metadata,
        metadata: input.metadata
      })
    }, "initialize-transaction");

    const data = this.record(response.data) ?? {};
    const checkoutLink = this.checkoutUrlFromResponse(response);
    this.logCheckoutDiagnostic(input, response, checkoutLink.alias);
    const authorizationUrl = checkoutLink.url;
    if (!authorizationUrl) {
      const safeDiagnostics = this.safeResponseDiagnostics(response);
      throw this.initializationException(
        "initialize-transaction",
        "Flutterwave checkout link was not returned.",
        safeDiagnostics.statusCode,
        "FLUTTERWAVE_CHECKOUT_LINK_MISSING",
        safeDiagnostics
      );
    }

    return {
      transactionReference: this.string(data.tx_ref) ?? this.string(response.tx_ref) ?? input.transactionReference,
      authorizationUrl,
      accessCode: this.string(data.flw_ref) ?? this.string(response.flw_ref) ?? null,
      providerResponse: response as unknown as Record<string, unknown>
    };
  }

  async verify(transactionReference: string): Promise<VerifyPaymentResult> {
    const response = await this.request(
      `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(transactionReference)}`,
      { method: "GET" }
    );
    const data = this.record(response.data) ?? {};
    return {
      transactionReference: this.string(data.tx_ref) ?? transactionReference,
      successful: this.string(data.status)?.toLowerCase() === "successful",
      amountMinor: this.toMinorAmount(data.amount),
      currency: this.string(data.currency),
      providerResponse: response as unknown as Record<string, unknown>
    };
  }

  async parseWebhook(
    payload: Record<string, unknown>,
    context?: PaymentWebhookContext
  ): Promise<WebhookPaymentResult> {
    if (!context?.rawBody || !context.signature || !this.validSignature(context.rawBody, context.signature)) {
      throw new UnauthorizedException("Invalid Flutterwave webhook signature");
    }
    const data = this.record(payload.data) ?? {};
    const eventType = this.string(payload.event) ?? "flutterwave.unknown";
    const status = this.string(data.status)?.toLowerCase();
    return {
      eventType,
      transactionReference: this.string(data.tx_ref) ?? this.string(payload.tx_ref) ?? null,
      successful: status === "successful",
      verified: true,
      amountMinor: this.toMinorAmount(data.amount),
      currency: this.string(data.currency),
      providerResponse: payload
    };
  }

  private async request(
    path: string,
    init: RequestInit,
    stage: PaymentInitializationStage = "provider-response"
  ): Promise<FlutterwaveEnvelope> {
    const normalizedPath = this.normalizedPath(path);
    const baseUrl = this.baseUrl();
    return this.providerRequest(`${baseUrl}${normalizedPath}`, normalizedPath, init, stage, false);
  }

  private async providerRequest(
    url: string,
    path: string,
    init: RequestInit,
    stage: PaymentInitializationStage,
    retryingAfterUnauthorized: boolean
  ): Promise<FlutterwaveEnvelope> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const token = await this.accessToken(retryingAfterUnauthorized);
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(init.headers ?? {})
        }
      });
      const parsedBody = await response.json().catch(() => ({}));
      const body = (this.record(parsedBody) ?? {}) as FlutterwaveEnvelope;
      Object.defineProperty(body, "__httpStatusCode", { value: response.status, enumerable: false });
      this.logger.log(
        `Flutterwave provider response provider=flutterwave environment=${this.environmentLabel()} baseHost=${this.hostFromUrl(this.baseUrl())} path=${path} stage=${stage} statusCode=${response.status} responseKeys=${this.safeKeys(body).join("|") || "none"} dataKeys=${this.safeKeys(this.record(body.data)).join("|") || "none"}`
      );
      if (response.status === 401 && !retryingAfterUnauthorized) {
        this.tokenCache = null;
        this.logger.warn(
          `Flutterwave provider authorization retry provider=flutterwave environment=${this.environmentLabel()} baseHost=${this.hostFromUrl(this.baseUrl())} path=${path} stage=${stage} statusCode=401 tokenRefreshAttempted=true`
        );
        return this.providerRequest(url, path, init, stage, true);
      }
      if (!response.ok || body.status?.toLowerCase() !== "success") {
        if (response.status === 401) {
          throw this.authException(stage, response.status, this.safeResponseDiagnostics(body));
        }
        throw this.initializationException(stage, body.message || "Flutterwave request failed", response.status);
      }
      return body;
    } catch (error) {
      if (
        error instanceof PaymentProviderInitializationException
        || error instanceof BadGatewayException
        || error instanceof BadRequestException
      ) throw error;
      throw this.initializationException(stage, "Flutterwave is currently unavailable");
    } finally {
      clearTimeout(timeout);
    }
  }

  private async accessToken(forceRefresh = false): Promise<string> {
    this.assertLiveMode();
    const now = Date.now();
    if (!forceRefresh && this.tokenCache && this.tokenCache.expiresAtMs - 60_000 > now) {
      return this.tokenCache.token;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const tokenUrl = this.tokenUrl();
    try {
      const response = await fetch(tokenUrl, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.clientId(),
          client_secret: this.clientSecret(),
          grant_type: "client_credentials"
        }).toString()
      });
      const parsedBody = await response.json().catch(() => ({}));
      const body = this.record(parsedBody) ?? {};
      const token = this.string(body.access_token);
      const expiresInSeconds = this.positiveNumber(body.expires_in) ?? 600;
      this.logger.log(
        `Flutterwave auth token response provider=flutterwave environment=${this.environmentLabel()} authHost=${this.hostFromUrl(tokenUrl)} stage=auth-token statusCode=${response.status} tokenFetched=${Boolean(token)} tokenExpiresInSeconds=${token ? expiresInSeconds : "n/a"} responseKeys=${this.safeKeys(body).join("|") || "none"}`
      );
      if (!response.ok || !token) {
        throw this.authException("auth-token", response.status, {
          responseKeys: this.safeKeys(body),
          statusCode: response.status,
          tokenFetched: false
        });
      }
      this.tokenCache = {
        token,
        expiresAtMs: now + Math.max(expiresInSeconds - 60, 60) * 1000
      };
      return token;
    } catch (error) {
      if (
        error instanceof PaymentProviderInitializationException
        || error instanceof BadGatewayException
        || error instanceof BadRequestException
      ) throw error;
      throw this.authException("auth-token");
    } finally {
      clearTimeout(timeout);
    }
  }

  private clientId(): string {
    const value = configText(this.config.get<unknown>("FLUTTERWAVE_CLIENT_ID"));
    if (!value) {
      throw new BadRequestException("missing FLUTTERWAVE_CLIENT_ID");
    }
    return value;
  }

  private clientSecret(): string {
    const value = configText(this.config.get<unknown>("FLUTTERWAVE_CLIENT_SECRET"));
    if (!value) {
      throw new BadRequestException("missing FLUTTERWAVE_CLIENT_SECRET");
    }
    return value;
  }

  private baseUrl(): string {
    const value = (configText(this.config.get<unknown>("FLUTTERWAVE_BASE_URL", "https://f4bexperience.flutterwave.com")) ?? "https://f4bexperience.flutterwave.com").replace(/\/+$/, "");
    if (!value.startsWith("https://")) {
      throw new BadRequestException("FLUTTERWAVE_BASE_URL must use HTTPS");
    }
    if (value.toLowerCase().includes("sandbox")) {
      throw new BadRequestException("FLUTTERWAVE_BASE_URL must be a live Flutterwave API URL");
    }
    return value;
  }

  private tokenUrl(): string {
    const value = configText(
      this.config.get<unknown>(
        "FLUTTERWAVE_TOKEN_URL",
        "https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token"
      )
    ) ?? "https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token";
    if (!value.startsWith("https://")) {
      throw new BadRequestException("FLUTTERWAVE_TOKEN_URL must use HTTPS");
    }
    return value;
  }

  private checkoutPath(): string {
    return this.normalizedPath(configText(this.config.get<unknown>("FLUTTERWAVE_CHECKOUT_PATH", "/payments")) ?? "/payments");
  }

  private normalizedPath(path: string): string {
    const value = path.trim() || "/payments";
    return value.startsWith("/") ? value : `/${value}`;
  }

  private redirectUrl(): string {
    const value = configText(this.config.get<unknown>("FLUTTERWAVE_REDIRECT_URL"))
      ?? configText(this.config.get<unknown>("FLUTTERWAVE_CALLBACK_URL"));
    if (!value) {
      throw new BadRequestException("missing FLUTTERWAVE_REDIRECT_URL");
    }
    if (!value.startsWith("https://")) {
      throw new BadRequestException("FLUTTERWAVE_REDIRECT_URL must use HTTPS");
    }
    return value;
  }

  private webhookSecret(): string {
    const value = configText(this.config.get<unknown>("FLUTTERWAVE_SECRET_HASH"))
      ?? configText(this.config.get<unknown>("FLUTTERWAVE_WEBHOOK_SECRET"));
    if (!value) {
      throw new BadRequestException("missing FLUTTERWAVE_SECRET_HASH or FLUTTERWAVE_WEBHOOK_SECRET");
    }
    return value;
  }

  private assertLiveMode(): void {
    const liveEnabled = configText(this.config.get<unknown>("PAYMENTS_LIVE_ENABLED", "false"))?.toLowerCase() === "true";
    const selectedProvider = configText(this.config.get<unknown>("PAYMENTS_PROVIDER"))
      ?? configText(this.config.get<unknown>("PAYMENT_PROVIDER"));
    const environment = configText(this.config.get<unknown>("FLUTTERWAVE_ENVIRONMENT"))?.toLowerCase();
    if (!liveEnabled) {
      throw new BadRequestException("PAYMENTS_LIVE_ENABLED must be true for Flutterwave live checkout");
    }
    if (selectedProvider !== "flutterwave") {
      throw new BadRequestException("PAYMENTS_PROVIDER must be flutterwave for Flutterwave live checkout");
    }
    if (environment !== "live") {
      throw new BadRequestException("FLUTTERWAVE_ENVIRONMENT must be live for Flutterwave live checkout");
    }
  }

  private validSignature(rawBody: Buffer, supplied: string): boolean {
    const secret = this.webhookSecret();
    const received = supplied.trim();
    if (this.safeEquals(received, secret)) return true;
    const expected = createHmac("sha256", secret).update(rawBody).digest("base64");
    return this.safeEquals(received, expected);
  }

  private safeEquals(received: string, expected: string): boolean {
    const receivedBuffer = Buffer.from(received);
    const expectedBuffer = Buffer.from(expected);
    if (receivedBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(receivedBuffer, expectedBuffer);
  }

  private checkoutUrl(value: unknown): string | null {
    const candidate = this.string(value);
    if (!candidate) return null;
    try {
      const parsed = new URL(candidate);
      return parsed.protocol === "https:" && parsed.hostname ? candidate : null;
    } catch {
      return null;
    }
  }

  private checkoutUrlFromResponse(response: FlutterwaveEnvelope): { url: string | null; alias: string | null } {
    const data = this.record(response.data) ?? {};
    const candidates = [
      ["data.link", data.link],
      ["link", response.link],
      ["data.authorization_url", data.authorization_url],
      ["data.authorizationUrl", data.authorizationUrl],
      ["data.checkout_url", data.checkout_url],
      ["data.checkoutUrl", data.checkoutUrl],
      ["data.paymentUrl", data.paymentUrl],
      ["data.payment_url", data.payment_url],
      ["data.url", data.url],
      ["authorizationUrl", response.authorizationUrl],
      ["authorization_url", response.authorization_url],
      ["checkoutUrl", response.checkoutUrl],
      ["checkout_url", response.checkout_url],
      ["paymentUrl", response.paymentUrl],
      ["payment_url", response.payment_url],
      ["url", response.url]
    ];
    for (const [alias, candidate] of candidates) {
      const checkoutUrl = this.checkoutUrl(candidate);
      if (checkoutUrl) return { url: checkoutUrl, alias: String(alias) };
    }
    return { url: null, alias: null };
  }

  private safeResponseDiagnostics(response: FlutterwaveEnvelope) {
    return {
      responseKeys: this.safeKeys(response),
      dataKeys: this.safeKeys(this.record(response.data)),
      statusCode: this.statusCode(response)
    };
  }

  private logCheckoutDiagnostic(
    input: InitializePaymentInput,
    response: FlutterwaveEnvelope,
    linkAlias: string | null
  ): void {
    this.logger.log(
      `Flutterwave checkout initialization provider=flutterwave environment=${this.environmentLabel()} baseHost=${this.hostFromUrl(this.baseUrl())} amount=${input.amount} currency=${input.currency || "NGN"} txRef=${input.transactionReference} statusCode=${this.statusCode(response) ?? "n/a"} responseKeys=${this.safeKeys(response).join("|") || "none"} dataKeys=${this.safeKeys(this.record(response.data)).join("|") || "none"} checkoutLinkFound=${linkAlias ? "true" : "false"} checkoutLinkAlias=${linkAlias ?? "none"}`
    );
  }

  private safeKeys(value?: Record<string, unknown>): string[] {
    return value ? Object.keys(value).sort() : [];
  }

  private statusCode(response: FlutterwaveEnvelope): number | undefined {
    const value = response.__httpStatusCode;
    return typeof value === "number" ? value : undefined;
  }

  private environmentLabel(): string {
    return configText(this.config.get<unknown>("FLUTTERWAVE_ENVIRONMENT"))?.toLowerCase() ?? "unset";
  }

  private hostFromUrl(url: string): string {
    try {
      return new URL(url).host;
    } catch {
      return "invalid-host";
    }
  }

  private toMinorAmount(value: unknown): number | undefined {
    const amount = typeof value === "number" ? value : typeof value === "string" ? Number(value) : undefined;
    if (amount === undefined || !Number.isFinite(amount)) return undefined;
    return Math.round(amount * 100);
  }

  private positiveNumber(value: unknown): number | undefined {
    const amount = typeof value === "number" ? value : typeof value === "string" ? Number(value) : undefined;
    if (amount === undefined || !Number.isFinite(amount) || amount <= 0) return undefined;
    return amount;
  }

  private record(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
  }

  private string(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  private customerEmail(input: InitializePaymentInput): string {
    const email = input.customerEmail?.trim();
    if (email) return email;
    return `checkout+${this.safeReference(input.transactionReference)}@karigo.com.ng`;
  }

  private logoUrl(): string | undefined {
    const value = configText(this.config.get<unknown>("KARIGO_EMAIL_LOGO_URL"));
    return value?.startsWith("https://") ? value : undefined;
  }

  private safeReference(reference: string): string {
    return reference
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "payment";
  }

  private initializationException(
    stage: PaymentInitializationStage,
    message: string,
    httpStatusCode?: number,
    code?: string,
    safeDiagnostics?: Record<string, unknown>
  ): PaymentProviderInitializationException {
    return new PaymentProviderInitializationException({
      provider: this.name,
      stage,
      message,
      httpStatusCode,
      providerMessage: message,
      code,
      safeDiagnostics
    });
  }

  private authException(
    stage: PaymentInitializationStage,
    httpStatusCode?: number,
    safeDiagnostics?: Record<string, unknown>
  ): PaymentProviderInitializationException {
    return this.initializationException(
      stage,
      "Flutterwave authentication failed.",
      httpStatusCode,
      "FLUTTERWAVE_AUTH_FAILED",
      safeDiagnostics
    );
  }
}
