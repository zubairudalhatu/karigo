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

interface FlutterwaveEnvelope {
  status?: string;
  message?: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class FlutterwaveProvider implements PaymentProvider {
  readonly name = "flutterwave" as const;

  constructor(private readonly config: ConfigService) {}

  async initialize(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    const response = await this.request("/payments", {
      method: "POST",
      body: JSON.stringify({
        tx_ref: input.transactionReference,
        amount: input.amount,
        currency: input.currency || "NGN",
        redirect_url: this.redirectUrl(),
        customer: {
          email: this.customerEmail(input),
          phonenumber: input.customerPhone,
          name: this.string(input.metadata.customerName)
        },
        customizations: {
          title: "KariGO",
          description: "KariGO order payment",
          logo: this.logoUrl()
        },
        meta: input.metadata
      })
    }, "initialize-transaction");

    const data = this.record(response.data) ?? {};
    const authorizationUrl = this.checkoutUrl(data.link ?? data.authorization_url ?? data.authorizationUrl);
    if (!authorizationUrl) {
      throw this.initializationException("initialize-transaction", "Flutterwave did not return a secure checkout URL");
    }

    return {
      transactionReference: this.string(data.tx_ref) ?? input.transactionReference,
      authorizationUrl,
      accessCode: this.string(data.flw_ref) ?? null,
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
      const body = await response.json().catch(() => ({})) as FlutterwaveEnvelope;
      if (!response.ok || body.status?.toLowerCase() !== "success") {
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

  private secretKey(): string {
    this.assertLiveMode();
    const key = configText(this.config.get<unknown>("FLUTTERWAVE_SECRET_KEY"));
    if (!key) {
      throw new BadRequestException("missing FLUTTERWAVE_SECRET_KEY");
    }
    if (key.toUpperCase().includes("TEST")) {
      throw new BadRequestException("FLUTTERWAVE_SECRET_KEY must be a live Flutterwave key");
    }
    return key;
  }

  private baseUrl(): string {
    const value = (configText(this.config.get<unknown>("FLUTTERWAVE_BASE_URL", "https://api.flutterwave.com/v3")) ?? "https://api.flutterwave.com/v3").replace(/\/+$/, "");
    if (!value.startsWith("https://")) {
      throw new BadRequestException("FLUTTERWAVE_BASE_URL must use HTTPS");
    }
    if (value.toLowerCase().includes("sandbox")) {
      throw new BadRequestException("FLUTTERWAVE_BASE_URL must be a live Flutterwave API URL");
    }
    return value;
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

  private toMinorAmount(value: unknown): number | undefined {
    const amount = typeof value === "number" ? value : typeof value === "string" ? Number(value) : undefined;
    if (amount === undefined || !Number.isFinite(amount)) return undefined;
    return Math.round(amount * 100);
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
