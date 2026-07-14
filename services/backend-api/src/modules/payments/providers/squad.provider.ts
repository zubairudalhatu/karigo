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

interface SquadEnvelope {
  status?: number | string;
  success?: boolean;
  message?: string;
  data?: Record<string, unknown> | null;
}

const SQUAD_SANDBOX_SECRET_PREFIX = ["sandbox", "sk", ""].join("_");

@Injectable()
export class SquadProvider implements PaymentProvider {
  readonly name = "squad" as const;

  constructor(private readonly config: ConfigService) {}

  async initialize(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    const email = input.customerEmail?.trim();
    if (!email) {
      throw new BadRequestException("An email address is required for Squad payment");
    }
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
    });
    const data = this.record(response.data) ?? {};
    return {
      transactionReference: this.string(data.transaction_ref) ?? input.transactionReference,
      authorizationUrl: this.string(data.checkout_url) ?? null,
      accessCode: this.string(data.access_token) ?? null,
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

  private async request(path: string, init: RequestInit): Promise<SquadEnvelope> {
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
        throw new BadGatewayException(body.message || "Squad request failed");
      }
      return body;
    } catch (error) {
      if (error instanceof BadGatewayException || error instanceof BadRequestException) throw error;
      throw new BadGatewayException("Squad is currently unavailable");
    } finally {
      clearTimeout(timeout);
    }
  }

  private secretKey(): string {
    this.assertSandboxOnly();
    const key = this.config.get<string>("SQUAD_SECRET_KEY")?.trim();
    if (!key) {
      throw new BadRequestException("Squad sandbox credentials are not configured");
    }
    if (!key.startsWith(SQUAD_SANDBOX_SECRET_PREFIX)) {
      throw new BadRequestException("Squad sandbox mode requires a sandbox secret key");
    }
    return key;
  }

  private baseUrl(): string {
    const value = this.config.get<string>("SQUAD_BASE_URL", "https://sandbox-api-d.squadco.com").replace(/\/+$/, "");
    if (!value.startsWith("https://") || value.includes("api-d.squadco.com") && !value.includes("sandbox")) {
      throw new BadRequestException("Squad sandbox base URL must use HTTPS and must not be the live API host");
    }
    return value;
  }

  private assertSandboxOnly(): void {
    const mode = this.config.get<string>("SQUAD_MODE")?.trim().toLowerCase();
    const liveEnabled = this.config.get<string>("PAYMENTS_LIVE_ENABLED", "false").trim().toLowerCase() === "true";
    if (liveEnabled) throw new BadRequestException("Live Squad payments are disabled");
    if (!["test", "sandbox"].includes(mode ?? "")) {
      throw new BadRequestException("Squad sandbox mode must be explicitly enabled");
    }
  }

  private validSignature(rawBody: Buffer, supplied: string): boolean {
    const secret = this.config.get<string>("SQUAD_WEBHOOK_SECRET")?.trim() || this.secretKey();
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

  private record(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
  }

  private string(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  private number(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  }
}
