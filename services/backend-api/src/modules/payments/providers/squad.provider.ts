import {
  BadGatewayException,
  BadRequestException,
  Injectable,
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

interface SquadEnvelope {
  status?: number | string;
  success?: boolean;
  message?: string;
  data?: Record<string, unknown> | null;
}

const SQUAD_SANDBOX_SECRET_PREFIX = ["sandbox", "sk", ""].join("_");
type SquadMode = "sandbox" | "live";

@Injectable()
export class SquadProvider implements PaymentProvider {
  readonly name = "squad" as const;

  constructor(private readonly config: ConfigService) {}

  async initialize(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    const email = this.customerEmail(input);
    const response = await this.request("/transaction/initiate", {
      method: "POST",
      body: JSON.stringify({
        amount: this.toMinorUnits(input.amount),
        email,
        currency: input.currency,
        initiate_type: "inline",
        transaction_ref: input.transactionReference,
        callback_url: this.config.get<string>("SQUAD_CALLBACK_URL") || undefined,
        metadata: input.metadata
      })
    }, "initialize-transaction");
    const data = this.record(response.data) ?? {};
    const authorizationUrl = this.checkoutUrl(response, data);
    if (!authorizationUrl) {
      throw this.initializationException("initialize-transaction", "Squad did not return a secure checkout URL");
    }
    return {
      transactionReference: this.string(data.transaction_ref) ?? this.string(data.transactionRef) ?? input.transactionReference,
      authorizationUrl,
      accessCode: this.string(data.access_token) ?? this.string(data.accessToken) ?? null,
      providerResponse: response as unknown as Record<string, unknown>
    };
  }

  async verify(transactionReference: string): Promise<VerifyPaymentResult> {
    const response = await this.request(`/transaction/verify/${encodeURIComponent(transactionReference)}`, {
      method: "GET"
    });
    const data = this.record(response.data) ?? {};
    const status = this.string(data.transaction_status);
    return {
      transactionReference: this.string(data.transaction_ref) ?? transactionReference,
      successful: status?.toLowerCase() === "success",
      amountMinor: this.number(data.transaction_amount),
      currency: this.string(data.transaction_currency_id) ?? this.string(data.currency),
      providerResponse: response as unknown as Record<string, unknown>
    };
  }

  async parseWebhook(
    payload: Record<string, unknown>,
    context?: PaymentWebhookContext
  ): Promise<WebhookPaymentResult> {
    if (!context?.rawBody || !context.signature || !this.validSignature(context.rawBody, context.signature)) {
      throw new UnauthorizedException("Invalid Squad webhook signature");
    }
    const eventType = this.string(payload.Event) ?? this.string(payload.event) ?? "squad.unknown";
    const body = this.record(payload.Body) ?? this.record(payload.body) ?? {};
    const status = this.string(body.transaction_status);
    return {
      eventType,
      transactionReference: this.string(body.transaction_ref) ?? this.string(payload.TransactionRef) ?? null,
      successful: eventType.toLowerCase() === "charge_successful" && status?.toLowerCase() === "success",
      verified: true,
      amountMinor: this.number(body.amount),
      currency: this.string(body.currency),
      providerResponse: payload
    };
  }

  private async request(
    path: string,
    init: RequestInit,
    stage: PaymentInitializationStage = "provider-response"
  ): Promise<SquadEnvelope> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(`${this.baseUrl()}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.secretKey()}`,
          "Content-Type": "application/json",
          ...(init.headers ?? {})
        }
      });
      const body = await response.json().catch(() => ({})) as SquadEnvelope;
      if (!response.ok || body.success === false || (typeof body.status === "number" && body.status >= 400)) {
        throw this.initializationException(stage, body.message || "Squad request failed", response.status);
      }
      return body;
    } catch (error) {
      if (
        error instanceof PaymentProviderInitializationException
        || error instanceof BadGatewayException
        || error instanceof BadRequestException
      ) throw error;
      throw this.initializationException(stage, "Squad is currently unavailable");
    } finally {
      clearTimeout(timeout);
    }
  }

  private secretKey(): string {
    const mode = this.assertConfiguredMode();
    const key = configText(this.config.get<unknown>("SQUAD_SECRET_KEY"));
    if (!key) {
      throw new BadRequestException("missing SQUAD_SECRET_KEY");
    }
    if (mode === "sandbox" && !key.startsWith(SQUAD_SANDBOX_SECRET_PREFIX)) {
      throw new BadRequestException("SQUAD_SECRET_KEY does not match the expected sandbox key format");
    }
    if (mode === "live" && key.startsWith(SQUAD_SANDBOX_SECRET_PREFIX)) {
      throw new BadRequestException("SQUAD_SECRET_KEY must be a live Squad key when SQUAD_MODE=live");
    }
    return key;
  }

  private baseUrl(): string {
    const mode = this.assertConfiguredMode();
    const fallback = mode === "sandbox" ? "https://sandbox-api-d.squadco.com" : undefined;
    const value = configText(this.config.get<unknown>("SQUAD_BASE_URL", fallback))?.replace(/\/+$/, "");
    if (!value) {
      throw new BadRequestException("missing SQUAD_BASE_URL");
    }
    if (!value.startsWith("https://")) {
      throw new BadRequestException("SQUAD_BASE_URL must use HTTPS");
    }
    if (mode === "sandbox" && value.includes("api-d.squadco.com") && !value.includes("sandbox")) {
      throw new BadRequestException("Squad sandbox base URL must use HTTPS and must not be the live API host");
    }
    if (mode === "live" && value.toLowerCase().includes("sandbox")) {
      throw new BadRequestException("SQUAD_BASE_URL must be a live Squad API host when SQUAD_MODE=live");
    }
    return value;
  }

  private assertConfiguredMode(): SquadMode {
    const mode = configText(this.config.get<unknown>("SQUAD_MODE"))?.toLowerCase();
    const liveEnabled = configText(this.config.get<unknown>("PAYMENTS_LIVE_ENABLED", "false"))?.toLowerCase() === "true";
    if (mode === "live") {
      if (!liveEnabled) {
        throw new BadRequestException("PAYMENTS_LIVE_ENABLED must be true for Squad live mode");
      }
      const selectedProvider = configText(this.config.get<unknown>("PAYMENTS_PROVIDER"))
        ?? configText(this.config.get<unknown>("PAYMENT_PROVIDER"));
      if (selectedProvider !== "squad") {
        throw new BadRequestException("PAYMENTS_PROVIDER must be squad for Squad live mode");
      }
      if (configText(this.config.get<unknown>("SQUAD_LIVE_ACTIVATION_APPROVED"))?.toLowerCase() !== "true") {
        throw new BadRequestException("SQUAD_LIVE_ACTIVATION_APPROVED must be true for Squad live mode");
      }
      if (!configText(this.config.get<unknown>("SQUAD_CALLBACK_URL"))?.startsWith("https://")) {
        throw new BadRequestException("SQUAD_CALLBACK_URL must use HTTPS for Squad live mode");
      }
      if (!configText(this.config.get<unknown>("SQUAD_WEBHOOK_SECRET"))) {
        throw new BadRequestException("missing SQUAD_WEBHOOK_SECRET");
      }
      return "live";
    }
    if (liveEnabled) throw new BadRequestException("PAYMENTS_LIVE_ENABLED must be false for Squad Sandbox");
    if (!["test", "sandbox"].includes(mode ?? "")) {
      throw new BadRequestException("missing SQUAD_MODE=test or sandbox");
    }
    return "sandbox";
  }

  private validSignature(rawBody: Buffer, supplied: string): boolean {
    const mode = this.assertConfiguredMode();
    const secret = configText(this.config.get<unknown>("SQUAD_WEBHOOK_SECRET"))
      || (mode === "sandbox" ? this.secretKey() : undefined);
    if (!secret) {
      throw new BadRequestException("missing SQUAD_WEBHOOK_SECRET");
    }
    const expected = createHmac("sha512", secret).update(rawBody).digest("hex").toUpperCase();
    const received = supplied.trim().replace(/\s+/g, "").toUpperCase();
    if (received.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  }

  private toMinorUnits(amount: string): number {
    const [whole = "0", fraction = ""] = amount.split(".");
    const minor = Number(whole) * 100 + Number(`${fraction}00`.slice(0, 2));
    if (!Number.isSafeInteger(minor) || minor <= 0) throw new BadRequestException("Invalid payment amount");
    return minor;
  }

  private checkoutUrl(envelope: SquadEnvelope, data: Record<string, unknown>): string | null {
    const candidates = [
      data.checkout_url,
      data.checkoutUrl,
      data.checkout_link,
      data.checkoutLink,
      data.payment_url,
      data.paymentUrl,
      data.payment_link,
      data.paymentLink,
      data.authorization_url,
      data.authorizationUrl,
      data.redirect_url,
      data.redirectUrl,
      data.url,
      data.link,
      envelope.data,
      (envelope as Record<string, unknown>).checkout_url,
      (envelope as Record<string, unknown>).checkoutUrl,
      (envelope as Record<string, unknown>).payment_url,
      (envelope as Record<string, unknown>).paymentUrl,
      (envelope as Record<string, unknown>).authorization_url,
      (envelope as Record<string, unknown>).authorizationUrl,
      (envelope as Record<string, unknown>).url
    ];
    const candidate = candidates.map((value) => this.string(value)).find(Boolean);
    if (!candidate) return null;
    try {
      const parsed = new URL(candidate);
      return parsed.protocol === "https:" && parsed.hostname ? candidate : null;
    } catch {
      return null;
    }
  }

  private record(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
  }

  private string(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  private number(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  }

  private customerEmail(input: InitializePaymentInput): string {
    const email = input.customerEmail?.trim();
    if (email) return email;
    if (this.assertConfiguredMode() === "live") {
      throw new BadRequestException("Customer email is required for Squad live checkout");
    }
    return `checkout+${this.safeReference(input.transactionReference)}@sandbox.karigo.com.ng`;
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
    httpStatusCode?: number
  ): PaymentProviderInitializationException {
    return new PaymentProviderInitializationException({
      provider: this.name,
      stage,
      message,
      httpStatusCode,
      providerMessage: message
    });
  }
}
