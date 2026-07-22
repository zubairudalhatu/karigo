import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UtilityServiceType, UtilityTransactionStatus } from "@prisma/client";
import {
  UtilityProviderClient,
  UtilityPurchaseInput,
  UtilityPurchaseResult,
  UtilityQuoteInput,
  UtilityQuoteResult,
  UtilityRecipientValidationResult
} from "./utility-provider.interface";

type JsonRecord = Record<string, unknown>;

const DEFAULT_PATHS = {
  validateRecipient: "/utilities/validate-recipient",
  quote: "/utilities/quote",
  purchase: "/utilities/purchase",
  status: "/utilities/status/{reference}"
};

@Injectable()
export class AccelerateUtilityProvider implements UtilityProviderClient {
  private readonly logger = new Logger(AccelerateUtilityProvider.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.baseUrl() && this.apiKey());
  }

  async validateRecipient(serviceType: UtilityServiceType, recipient: string): Promise<UtilityRecipientValidationResult> {
    const configuredPath = this.optionalValue("ACCELERATE_VALIDATE_RECIPIENT_PATH");
    if (!configuredPath) {
      return this.localRecipientValidation(serviceType, recipient);
    }

    try {
      const response = await this.post(configuredPath, {
        serviceType,
        recipient
      });
      const data = this.dataObject(response);
      const normalizedRecipient = this.firstString(data, ["normalizedRecipient", "recipient", "customerId", "meterNumber", "smartcardNumber"]);
      const recipientName = this.firstString(data, ["recipientName", "customerName", "name"]);
      const valid = this.booleanish(data.valid) ?? this.booleanish(data.isValid) ?? Boolean(normalizedRecipient);

      return valid
        ? { isValid: true, normalizedRecipient: normalizedRecipient ?? recipient.trim(), recipientName }
        : { isValid: false, message: this.safeProviderMessage(response, "Recipient could not be validated.") };
    } catch (error) {
      this.logger.warn(`Accelerate recipient validation failed type=${serviceType} reason=${this.safeErrorMessage(error)}`);
      return { isValid: false, message: "Utilities provider recipient validation is temporarily unavailable." };
    }
  }

  async quote(input: UtilityQuoteInput): Promise<UtilityQuoteResult> {
    this.assertConfigured();
    const response = await this.post(this.path("ACCELERATE_QUOTE_PATH", DEFAULT_PATHS.quote), this.payload(input));
    return {
      providerStatus: this.providerStatus(response, "ACCELERATE_QUOTED"),
      customerNote: "Your utility request is ready for provider processing. KariGO will confirm once fulfillment is complete.",
      metadata: this.safeMetadata(response, "quote")
    };
  }

  async purchase(input: UtilityPurchaseInput): Promise<UtilityPurchaseResult> {
    try {
      this.assertConfigured();
      const response = await this.post(this.path("ACCELERATE_PURCHASE_PATH", DEFAULT_PATHS.purchase), {
        ...this.payload(input),
        reference: input.reference,
        totalKobo: input.totalKobo,
        totalAmount: input.totalKobo / 100
      });
      return this.purchaseResult(response, input.reference);
    } catch (error) {
      this.logger.warn(`Accelerate utility purchase failed reference=${input.reference} reason=${this.safeErrorMessage(error)}`);
      return {
        status: UtilityTransactionStatus.FAILED,
        providerStatus: "ACCELERATE_SUBMISSION_FAILED",
        failureReason: "Utilities provider submission could not be completed safely.",
        customerNote: "Your utility request could not be processed. No utility fulfillment was confirmed.",
        metadata: {
          mode: "accelerate",
          error: this.safeErrorMessage(error)
        }
      };
    }
  }

  async checkStatus(reference: string): Promise<UtilityPurchaseResult> {
    try {
      this.assertConfigured();
      const response = await this.get(this.path("ACCELERATE_STATUS_PATH", DEFAULT_PATHS.status).replace("{reference}", encodeURIComponent(reference)));
      return this.purchaseResult(response, reference);
    } catch (error) {
      this.logger.warn(`Accelerate utility status check failed reference=${reference} reason=${this.safeErrorMessage(error)}`);
      return {
        status: UtilityTransactionStatus.PROCESSING,
        providerStatus: "ACCELERATE_STATUS_UNAVAILABLE",
        customerNote: "KariGO could not confirm provider status yet. Please check again later.",
        metadata: {
          mode: "accelerate",
          error: this.safeErrorMessage(error)
        }
      };
    }
  }

  private payload(input: UtilityQuoteInput): JsonRecord {
    return {
      serviceType: input.serviceType,
      providerCode: input.providerCode,
      productCode: input.productCode,
      amountKobo: input.amountKobo,
      amount: input.amountKobo / 100,
      currency: "NGN",
      recipient: input.recipient,
      recipientName: input.recipientName
    };
  }

  private purchaseResult(response: JsonRecord, fallbackReference: string): UtilityPurchaseResult {
    const data = this.dataObject(response);
    const providerReference = this.firstString(data, ["providerReference", "transactionReference", "reference", "ref", "id"]) ??
      this.firstString(response, ["providerReference", "transactionReference", "reference", "ref", "id"]) ??
      fallbackReference;
    const providerStatus = this.providerStatus(response, "ACCELERATE_PROCESSING");
    const status = this.transactionStatus(providerStatus);
    const token = this.firstString(data, ["token", "pin", "rechargePin", "meterToken"]) ??
      this.firstString(response, ["token", "pin", "rechargePin", "meterToken"]);

    return {
      status,
      providerStatus,
      providerReference,
      mockToken: token,
      failureReason: status === UtilityTransactionStatus.FAILED
        ? this.safeProviderMessage(response, "Utilities provider reported a failed transaction.")
        : undefined,
      customerNote: this.customerNote(status),
      metadata: this.safeMetadata(response, "purchase")
    };
  }

  private transactionStatus(providerStatus: string): UtilityTransactionStatus {
    const normalized = providerStatus.toLowerCase();
    if (/(success|successful|completed|delivered|fulfilled)/.test(normalized)) return UtilityTransactionStatus.SUCCESSFUL;
    if (/(fail|failed|error|declined|rejected|cancelled|canceled|reversed|refund)/.test(normalized)) return UtilityTransactionStatus.FAILED;
    if (/(pending|queued|accepted|processing|process|submitted|in_progress)/.test(normalized)) return UtilityTransactionStatus.PROCESSING;
    return UtilityTransactionStatus.PROCESSING;
  }

  private customerNote(status: UtilityTransactionStatus): string {
    if (status === UtilityTransactionStatus.SUCCESSFUL) {
      return "Your utility request has been confirmed by the provider.";
    }
    if (status === UtilityTransactionStatus.FAILED) {
      return "Your utility request was not completed. KariGO will review the transaction before any retry.";
    }
    return "Your request is being processed. KariGO will confirm once the provider completes fulfillment.";
  }

  private providerStatus(response: JsonRecord, fallback: string): string {
    const data = this.dataObject(response);
    return this.firstString(data, ["status", "transactionStatus", "providerStatus", "state"]) ??
      this.firstString(response, ["status", "transactionStatus", "providerStatus", "state", "message"]) ??
      fallback;
  }

  private safeProviderMessage(response: JsonRecord, fallback: string): string {
    const data = this.dataObject(response);
    return this.firstString(data, ["message", "description", "reason"]) ??
      this.firstString(response, ["message", "description", "reason", "error"]) ??
      fallback;
  }

  private safeMetadata(response: JsonRecord, stage: string): JsonRecord {
    const data = this.dataObject(response);
    return {
      mode: "accelerate",
      provider: "accelerate",
      stage,
      responseKeys: Object.keys(response).slice(0, 20),
      dataKeys: Object.keys(data).slice(0, 20)
    };
  }

  private async post(path: string, body: JsonRecord): Promise<JsonRecord> {
    return this.request(path, {
      method: "POST",
      body: JSON.stringify(body)
    });
  }

  private async get(path: string): Promise<JsonRecord> {
    return this.request(path, { method: "GET" });
  }

  private async request(path: string, init: RequestInit): Promise<JsonRecord> {
    const url = this.url(path);
    const response = await fetch(url, {
      ...init,
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        ...this.authHeaders()
      }
    });
    const payload = await this.safeJson(response);
    if (!response.ok) {
      throw new Error(`provider_http_${response.status}_${this.safeProviderMessage(payload, "request_failed")}`);
    }
    return payload;
  }

  private async safeJson(response: Response): Promise<JsonRecord> {
    try {
      const payload = await response.json();
      return this.isRecord(payload) ? payload : { valueType: typeof payload };
    } catch {
      return {};
    }
  }

  private authHeaders(): Record<string, string> {
    const apiKey = this.apiKey();
    const headers: Record<string, string> = apiKey ? { authorization: `Bearer ${apiKey}` } : {};
    const clientId = this.optionalValue("ACCELERATE_CLIENT_ID");
    const clientSecret = this.optionalValue("ACCELERATE_CLIENT_SECRET") ?? this.optionalValue("ACCELERATE_API_SECRET");
    if (clientId) headers["x-client-id"] = clientId;
    if (clientSecret) headers["x-client-secret"] = clientSecret;
    return headers;
  }

  private url(path: string): string {
    const baseUrl = this.baseUrl();
    if (!baseUrl) throw new Error("missing_ACCELERATE_BASE_URL");
    const cleanBase = baseUrl.replace(/\/+$/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
  }

  private path(key: string, fallback: string): string {
    return this.optionalValue(key) ?? fallback;
  }

  private baseUrl(): string | undefined {
    return this.optionalValue("ACCELERATE_BASE_URL") ??
      this.optionalValue("ACCELERATE_API_BASE_URL") ??
      this.optionalValue("UTILITIES_PROVIDER_BASE_URL");
  }

  private apiKey(): string | undefined {
    return this.optionalValue("ACCELERATE_API_KEY") ?? this.optionalValue("UTILITIES_PROVIDER_API_KEY");
  }

  private optionalValue(name: string): string | undefined {
    const value = this.config.get<unknown>(name);
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  private dataObject(response: JsonRecord): JsonRecord {
    return this.isRecord(response.data) ? response.data : {};
  }

  private firstString(source: JsonRecord, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }
    return undefined;
  }

  private booleanish(value: unknown): boolean | undefined {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "yes", "1", "valid"].includes(normalized)) return true;
      if (["false", "no", "0", "invalid"].includes(normalized)) return false;
    }
    return undefined;
  }

  private isRecord(value: unknown): value is JsonRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private localRecipientValidation(serviceType: UtilityServiceType, recipient: string): UtilityRecipientValidationResult {
    const trimmed = recipient.trim();
    if (!trimmed) return { isValid: false, message: "Recipient is required." };
    if (serviceType === UtilityServiceType.AIRTIME || serviceType === UtilityServiceType.DATA) {
      const digits = trimmed.replace(/\D/g, "");
      if (/^0[789][01]\d{8}$/.test(digits)) return { isValid: true, normalizedRecipient: `+234${digits.slice(1)}` };
      if (/^234[789][01]\d{8}$/.test(digits)) return { isValid: true, normalizedRecipient: `+${digits}` };
      return { isValid: false, message: "Enter a valid Nigerian phone number." };
    }
    const digits = trimmed.replace(/\D/g, "");
    return digits.length >= 6 && digits.length <= 20
      ? { isValid: true, normalizedRecipient: digits }
      : { isValid: false, message: serviceType === UtilityServiceType.ELECTRICITY ? "Enter a valid meter number." : "Enter a valid smartcard or IUC number." };
  }

  private assertConfigured(): void {
    if (!this.baseUrl()) throw new Error("missing_ACCELERATE_BASE_URL");
    if (!this.apiKey()) throw new Error("missing_ACCELERATE_API_KEY");
  }

  private safeErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
