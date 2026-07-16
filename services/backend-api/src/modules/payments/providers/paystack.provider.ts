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

interface PaystackEnvelope {
  status?: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

const PAYSTACK_TEST_SECRET_PREFIX = ["sk", "test", ""].join("_");

@Injectable()
export class PaystackProvider implements PaymentProvider {
  readonly name = "paystack" as const;

  constructor(private readonly config: ConfigService) {}

  async initialize(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    const email = this.customerEmail(input);
    const response = await this.request("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email,
        amount: this.toMinorUnits(input.amount),
        currency: input.currency,
        reference: input.transactionReference,
        callback_url: this.config.get<string>("PAYSTACK_CALLBACK_URL") || undefined,
        metadata: input.metadata
      })
    });
    const data = response.data ?? {};
    return {
      transactionReference: this.string(data.reference) ?? input.transactionReference,
      authorizationUrl: this.string(data.authorization_url) ?? null,
      accessCode: this.string(data.access_code) ?? null,
      providerResponse: response as unknown as Record<string, unknown>
    };
  }

  async verify(transactionReference: string): Promise<VerifyPaymentResult> {
    const response = await this.request(`/transaction/verify/${encodeURIComponent(transactionReference)}`);
    const data = response.data ?? {};
    return {
      transactionReference: this.string(data.reference) ?? transactionReference,
      successful: this.string(data.status)?.toLowerCase() === "success",
      amountMinor: this.number(data.amount),
      currency: this.string(data.currency),
      providerResponse: response as unknown as Record<string, unknown>
    };
  }

  async parseWebhook(
    payload: Record<string, unknown>,
    context?: PaymentWebhookContext
  ): Promise<WebhookPaymentResult> {
    if (!context?.rawBody || !context.signature || !this.validSignature(context.rawBody, context.signature)) {
      throw new UnauthorizedException("Invalid Paystack webhook signature");
    }
    const data = this.record(payload.data);
    const eventType = this.string(payload.event) ?? "paystack.unknown";
    return {
      eventType,
      transactionReference: this.string(data.reference) ?? null,
      successful: eventType === "charge.success" && this.string(data.status)?.toLowerCase() === "success",
      verified: true,
      amountMinor: this.number(data.amount),
      currency: this.string(data.currency),
      providerResponse: payload
    };
  }

  private async request(path: string, init: RequestInit = {}): Promise<PaystackEnvelope> {
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
      const body = await response.json() as PaystackEnvelope;
      if (!response.ok || body.status !== true) {
        throw new BadGatewayException(body.message || "Paystack request failed");
      }
      return body;
    } catch (error) {
      if (error instanceof BadGatewayException || error instanceof BadRequestException) throw error;
      throw new BadGatewayException("Paystack is currently unavailable");
    } finally {
      clearTimeout(timeout);
    }
  }

  private validSignature(rawBody: Buffer, supplied: string): boolean {
    const expected = createHmac("sha512", this.webhookSecret()).update(rawBody).digest("hex");
    const received = supplied.trim().toLowerCase();
    if (received.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  }

  private toMinorUnits(amount: string): number {
    const [whole = "0", fraction = ""] = amount.split(".");
    const minor = Number(whole) * 100 + Number(`${fraction}00`.slice(0, 2));
    if (!Number.isSafeInteger(minor) || minor <= 0) throw new BadRequestException("Invalid payment amount");
    return minor;
  }

  private secretKey(): string {
    this.assertTestModeOnly();
    const key = this.config.get<string>("PAYSTACK_SECRET_KEY")?.trim();
    if (!key) {
      throw new BadRequestException("Paystack Test Mode credentials are not configured");
    }
    if (!key.startsWith(PAYSTACK_TEST_SECRET_PREFIX)) {
      throw new BadRequestException("Paystack Test Mode requires a test secret key");
    }
    return key;
  }
  private webhookSecret(): string {
    return this.config.get<string>("PAYSTACK_WEBHOOK_SECRET") || this.secretKey();
  }
  private baseUrl(): string {
    return this.config.get<string>("PAYSTACK_BASE_URL", "https://api.paystack.co").replace(/\/+$/, "");
  }
  private record(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }
  private string(value: unknown): string | undefined {
    return typeof value === "string" ? value : undefined;
  }
  private number(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  }
  private customerEmail(input: InitializePaymentInput): string {
    const email = input.customerEmail?.trim();
    if (email) return email;
    this.assertTestModeOnly();
    return `checkout+${this.safeReference(input.transactionReference)}@sandbox.karigo.com.ng`;
  }
  private safeReference(reference: string): string {
    return reference
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "payment";
  }
  private assertTestModeOnly(): void {
    const mode = this.config.get<string>("PAYSTACK_MODE")?.trim().toLowerCase();
    const liveEnabled = this.config.get<string>("PAYMENTS_LIVE_ENABLED", "false").trim().toLowerCase() === "true";
    if (liveEnabled) {
      throw new BadRequestException("Live Paystack payments are disabled");
    }
    if (mode !== "test") {
      throw new BadRequestException("Paystack Test Mode must be explicitly enabled");
    }
  }
}
