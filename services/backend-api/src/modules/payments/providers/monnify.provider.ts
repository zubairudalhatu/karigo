import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import {
  InitializePaymentInput,
  InitializePaymentResult,
  PaymentProvider,
  PaymentWebhookContext,
  VerifyPaymentResult,
  WebhookPaymentResult
} from "./payment-provider.interface";

interface MonnifyEnvelope {
  requestSuccessful?: boolean;
  responseMessage?: string;
  responseBody?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

@Injectable()
export class MonnifyProvider implements PaymentProvider {
  readonly name = "monnify" as const;

  constructor(private readonly config: ConfigService) {}

  async initialize(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    const email = input.customerEmail?.trim();
    if (!email) {
      throw new BadRequestException("An email address is required for Monnify payment");
    }
    const token = await this.accessToken();
    const response = await this.request("/api/v1/merchant/transactions/init-transaction", {
      method: "POST",
      body: JSON.stringify({
        amount: this.toMajorUnits(input.amount),
        paymentReference: input.transactionReference,
        paymentDescription: `KariGO payment ${input.transactionReference}`,
        currencyCode: input.currency,
        contractCode: this.contractCode(),
        redirectUrl: this.config.get<string>("MONNIFY_CALLBACK_URL") || undefined,
        customerEmail: email,
        customerName: email,
        metaData: input.metadata
      })
    }, token);
    const data = this.body(response);
    return {
      transactionReference: this.string(data.paymentReference) ?? input.transactionReference,
      authorizationUrl: this.string(data.checkoutUrl) ?? this.string(data.paymentUrl) ?? null,
      accessCode: this.string(data.transactionReference) ?? null,
      providerResponse: response as unknown as Record<string, unknown>
    };
  }

  async verify(transactionReference: string): Promise<VerifyPaymentResult> {
    const token = await this.accessToken();
    const response = await this.request(`/api/v2/transactions/${encodeURIComponent(transactionReference)}`, {
      method: "GET"
    }, token);
    const data = this.body(response);
    const status = this.string(data.paymentStatus) ?? this.string(data.status);
    return {
      transactionReference: this.string(data.paymentReference) ?? transactionReference,
      successful: status?.toUpperCase() === "PAID",
      amountMinor: this.majorAmountToMinor(data.amountPaid ?? data.totalPayable ?? data.amount),
      currency: this.string(data.currencyCode) ?? this.string(data.currency),
      providerResponse: response as unknown as Record<string, unknown>
    };
  }

  async parseWebhook(
    payload: Record<string, unknown>,
    context?: PaymentWebhookContext
  ): Promise<WebhookPaymentResult> {
    if (!context?.rawBody || !context.signature || !this.validSignature(context.rawBody, context.signature)) {
      throw new UnauthorizedException("Invalid Monnify webhook signature");
    }
    const eventType = this.string(payload.eventType) ?? this.string(payload.event) ?? "monnify.unknown";
    const eventData = this.record(payload.eventData) ?? this.record(payload.data) ?? payload;
    const status = this.string(eventData.paymentStatus) ?? this.string(eventData.status);
    return {
      eventType,
      transactionReference: this.string(eventData.paymentReference) ?? this.string(eventData.transactionReference) ?? null,
      successful: this.successfulEvent(eventType, status),
      verified: true,
      amountMinor: this.majorAmountToMinor(eventData.amountPaid ?? eventData.totalPayable ?? eventData.amount),
      currency: this.string(eventData.currencyCode) ?? this.string(eventData.currency),
      providerResponse: payload
    };
  }

  private async accessToken(): Promise<string> {
    const credentials = Buffer.from(`${this.apiKey()}:${this.secretKey()}`).toString("base64");
    const response = await this.request("/api/v1/auth/login", {
      method: "POST",
      headers: { Authorization: `Basic ${credentials}` }
    }, undefined, false);
    const data = this.body(response);
    const token = this.string(data.accessToken) ?? this.string(data.token);
    if (!token) throw new BadGatewayException("Monnify authentication did not return an access token");
    return token;
  }

  private async request(
    path: string,
    init: RequestInit,
    bearerToken?: string,
    includeJsonHeader = true
  ): Promise<MonnifyEnvelope> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(`${this.baseUrl()}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          ...(includeJsonHeader ? { "Content-Type": "application/json" } : {}),
          ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
          ...(init.headers ?? {})
        }
      });
      const body = await response.json().catch(() => ({})) as MonnifyEnvelope;
      const successful = body.requestSuccessful !== false;
      if (!response.ok || !successful) {
        throw new BadGatewayException(body.responseMessage || "Monnify request failed");
      }
      return body;
    } catch (error) {
      if (error instanceof BadGatewayException || error instanceof BadRequestException) throw error;
      throw new BadGatewayException("Monnify is currently unavailable");
    } finally {
      clearTimeout(timeout);
    }
  }

  private apiKey(): string {
    const key = this.config.get<string>("MONNIFY_API_KEY")?.trim();
    if (!key) throw new BadRequestException("Monnify sandbox credentials are not configured");
    return key;
  }

  private secretKey(): string {
    this.assertSandboxOnly();
    const key = this.config.get<string>("MONNIFY_SECRET_KEY")?.trim();
    if (!key) throw new BadRequestException("Monnify sandbox credentials are not configured");
    return key;
  }

  private contractCode(): string {
    const code = this.config.get<string>("MONNIFY_CONTRACT_CODE")?.trim();
    if (!code) throw new BadRequestException("Monnify contract code is not configured");
    return code;
  }

  private baseUrl(): string {
    const value = this.config.get<string>("MONNIFY_BASE_URL", "https://sandbox.monnify.com").replace(/\/+$/, "");
    if (!value.startsWith("https://") || value.includes("api.monnify.com")) {
      throw new BadRequestException("Monnify sandbox base URL must use HTTPS and must not be the live API host");
    }
    return value;
  }

  private assertSandboxOnly(): void {
    const mode = this.config.get<string>("MONNIFY_MODE")?.trim().toLowerCase();
    const liveEnabled = this.config.get<string>("PAYMENTS_LIVE_ENABLED", "false").trim().toLowerCase() === "true";
    if (liveEnabled) throw new BadRequestException("Live Monnify payments are disabled");
    if (!["test", "sandbox"].includes(mode ?? "")) {
      throw new BadRequestException("Monnify sandbox mode must be explicitly enabled");
    }
  }

  private validSignature(rawBody: Buffer, supplied: string): boolean {
    const secret = this.config.get<string>("MONNIFY_WEBHOOK_SECRET")?.trim() || this.secretKey();
    const hmacSignature = createHmac("sha512", secret).update(rawBody).digest("hex");
    const shaSignature = createHash("sha512").update(`${secret}${rawBody.toString("utf8")}`).digest("hex");
    return this.safeEqual(hmacSignature, supplied) || this.safeEqual(shaSignature, supplied);
  }

  private safeEqual(expected: string, supplied: string): boolean {
    const received = supplied.trim().replace(/\s+/g, "").toLowerCase();
    const normalizedExpected = expected.trim().replace(/\s+/g, "").toLowerCase();
    if (received.length !== normalizedExpected.length) return false;
    return timingSafeEqual(Buffer.from(received), Buffer.from(normalizedExpected));
  }

  private successfulEvent(eventType: string, status?: string): boolean {
    const event = eventType.toUpperCase();
    const normalizedStatus = status?.toUpperCase();
    return ["SUCCESSFUL_TRANSACTION", "SUCCESSFUL_COLLECTION", "COLLECTION"].includes(event)
      && normalizedStatus === "PAID";
  }

  private toMajorUnits(amount: string): number {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) throw new BadRequestException("Invalid payment amount");
    return parsed;
  }

  private majorAmountToMinor(value: unknown): number | undefined {
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : undefined;
    if (parsed === undefined || !Number.isFinite(parsed)) return undefined;
    return Math.round(parsed * 100);
  }

  private body(envelope: MonnifyEnvelope): Record<string, unknown> {
    return this.record(envelope.responseBody) ?? this.record(envelope.data) ?? {};
  }

  private record(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
  }

  private string(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }
}
