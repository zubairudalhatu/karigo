import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UtilityServiceType, UtilityTransactionStatus } from "@prisma/client";
import {
  UtilityMeterType,
  UtilityProviderClient,
  UtilityPurchaseInput,
  UtilityPurchaseResult,
  UtilityQuoteInput,
  UtilityQuoteResult,
  UtilityRecipientValidationResult
} from "./utility-provider.interface";

type JsonRecord = Record<string, unknown>;
type AccelerateBase = "airtimeData" | "power";
type AccelerateMode = "sandbox" | "live";

const DEFAULT_ACCELERATE_URLS: Record<AccelerateMode, { auth: string; airtimeData: string; power: string }> = {
  sandbox: {
    auth: "https://test.user-mgt.irechargetech.com/api/v1/auth/api-client/token",
    airtimeData: "https://test.airtime-data.irechargetech.com/api/v2",
    power: "https://test.power.irechargetech.com/api/v2"
  },
  live: {
    auth: "https://prod.user-mgt.irechargetech.com/api/v1/auth/api-client/token",
    airtimeData: "https://prod.airtime-data.irechargetech.com/api/v2",
    power: "https://prod.power.irechargetech.com/api/v2"
  }
};

const SERVICE_ENDPOINTS: Record<UtilityServiceType, {
  base: AccelerateBase;
  validate: string;
  vend: string;
  requery: string;
}> = {
  AIRTIME: {
    base: "airtimeData",
    validate: "/merchant/airtime/validate",
    vend: "/merchant/airtime/vend",
    requery: "/merchants/requery?t_ref={reference}"
  },
  DATA: {
    base: "airtimeData",
    validate: "/merchant/data/validate",
    vend: "/merchant/data/vend",
    requery: "/merchants/requery?t_ref={reference}"
  },
  CABLE_TV: {
    base: "airtimeData",
    validate: "/merchant/tv/validate",
    vend: "/merchant/tv/vend",
    requery: "/merchants/requery?t_ref={reference}"
  },
  ELECTRICITY: {
    base: "power",
    validate: "/merchant/power/validate",
    vend: "/merchant/power/vend",
    requery: "/merchant/power/requery?t_ref={reference}"
  }
};

@Injectable()
export class AccelerateUtilityProvider implements UtilityProviderClient {
  private readonly logger = new Logger(AccelerateUtilityProvider.name);
  private tokenCache?: { token: string; expiresAt: number };

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.publicKey() && this.privateKey());
  }

  async validateRecipient(serviceType: UtilityServiceType, recipient: string): Promise<UtilityRecipientValidationResult> {
    return this.localRecipientValidation(serviceType, recipient);
  }

  async quote(input: UtilityQuoteInput): Promise<UtilityQuoteResult> {
    this.assertConfigured();
    return {
      providerStatus: "ACCELERATE_READY",
      customerNote: "Your utility request is ready for provider validation and wallet-backed processing.",
      metadata: {
        mode: "accelerate",
        provider: "accelerate",
        stage: "quote",
        serviceType: input.serviceType,
        providerCode: this.providerCode(input.providerCode)
      }
    };
  }

  async purchase(input: UtilityPurchaseInput): Promise<UtilityPurchaseResult> {
    try {
      this.assertConfigured();
      const validation = await this.validateWithProvider(input);
      if (!validation.ok) return validation.result;

      const response = await this.post(input.serviceType, SERVICE_ENDPOINTS[input.serviceType].vend, this.vendPayload(input, validation.validationReference), {
        acceptedStatuses: [200, 201, 202, 400, 422]
      });
      return this.purchaseResult(response, input.reference, "vend", validation.validationReference);
    } catch (error) {
      this.logger.warn(`Accelerate utility purchase failed reference=${input.reference} reason=${this.safeErrorMessage(error)}`);
      return {
        status: UtilityTransactionStatus.FAILED,
        providerStatus: "ACCELERATE_SUBMISSION_FAILED",
        failureReason: this.safeFailureReason(error),
        customerNote: "Utility payment could not be processed safely. Your wallet has been reversed if a debit was posted.",
        metadata: {
          mode: "accelerate",
          provider: "accelerate",
          stage: "purchase",
          error: this.safeErrorMessage(error)
        }
      };
    }
  }

  async checkStatus(reference: string, serviceType: UtilityServiceType = UtilityServiceType.AIRTIME): Promise<UtilityPurchaseResult> {
    try {
      this.assertConfigured();
      const path = SERVICE_ENDPOINTS[serviceType].requery.replace("{reference}", encodeURIComponent(reference));
      const response = await this.get(serviceType, path, { acceptedStatuses: [200, 201, 202, 400, 404, 422] });
      return this.purchaseResult(response, reference, "requery");
    } catch (error) {
      this.logger.warn(`Accelerate utility status check failed reference=${reference} reason=${this.safeErrorMessage(error)}`);
      return {
        status: UtilityTransactionStatus.PROCESSING,
        providerStatus: "ACCELERATE_STATUS_UNAVAILABLE",
        customerNote: "KariGO could not confirm provider status yet. Please check again later.",
        metadata: {
          mode: "accelerate",
          provider: "accelerate",
          stage: "requery",
          error: this.safeErrorMessage(error)
        }
      };
    }
  }

  private async validateWithProvider(input: UtilityPurchaseInput): Promise<
    { ok: true; validationReference: string } | { ok: false; result: UtilityPurchaseResult }
  > {
    const response = await this.post(input.serviceType, SERVICE_ENDPOINTS[input.serviceType].validate, this.validationPayload(input), {
      acceptedStatuses: [200, 201, 202, 400, 422]
    });
    const providerStatus = this.providerStatus(response, "ACCELERATE_VALIDATED");
    const status = this.transactionStatus(providerStatus, response);
    if (status === UtilityTransactionStatus.FAILED) {
      return {
        ok: false,
        result: {
          status: UtilityTransactionStatus.FAILED,
          providerStatus,
          providerReference: this.providerReference(response, input.reference),
          failureReason: this.validationFailureMessage(input.serviceType, response),
          customerNote: "Utility provider validation failed. Your wallet has been reversed if a debit was posted.",
          metadata: this.safeMetadata(response, "validate")
        }
      };
    }

    const validationReference = this.validationReference(response);
    if (!validationReference) {
      return {
        ok: false,
        result: {
          status: UtilityTransactionStatus.FAILED,
          providerStatus: "ACCELERATE_VALIDATION_REFERENCE_MISSING",
          providerReference: this.providerReference(response, input.reference),
          failureReason: "Provider validation reference was not returned.",
          customerNote: "Utility provider validation could not be completed. Your wallet has been reversed if a debit was posted.",
          metadata: this.safeMetadata(response, "validate")
        }
      };
    }

    return { ok: true, validationReference };
  }

  private validationPayload(input: UtilityQuoteInput): JsonRecord {
    const provider = this.providerCode(input.providerCode);
    const amount = this.nairaAmount(input.amountKobo);
    if (input.serviceType === UtilityServiceType.AIRTIME) {
      return { provider, amount, receiver: this.receiver(input) };
    }
    if (input.serviceType === UtilityServiceType.DATA) {
      return { provider, code: this.requiredProductCode(input), receiver: this.receiver(input) };
    }
    if (input.serviceType === UtilityServiceType.CABLE_TV) {
      return {
        provider,
        package: this.requiredProductCode(input),
        receiver: this.receiver(input),
        phone_number: this.requiredPhoneNumber(input),
        ...(input.customerEmail ? { email: input.customerEmail } : {})
      };
    }
    return {
      meter_type: this.meterType(input.meterType),
      provider,
      receiver: this.receiver(input),
      amount,
      ...(input.customerPhoneNumber ? { phone_number: input.customerPhoneNumber } : {}),
      ...(input.customerEmail ? { email: input.customerEmail } : {}),
      create_beneficiary: false
    };
  }

  private vendPayload(input: UtilityPurchaseInput, validationReference: string): JsonRecord {
    if (input.serviceType === UtilityServiceType.ELECTRICITY) {
      return {
        validation_reference: validationReference,
        transaction_reference: input.reference,
        phone_number: this.requiredPhoneNumber(input)
      };
    }
    return {
      validation_reference: validationReference,
      transaction_reference: input.reference
    };
  }

  private purchaseResult(
    response: JsonRecord,
    fallbackReference: string,
    stage: "vend" | "requery",
    validationReference?: string
  ): UtilityPurchaseResult {
    const providerStatus = this.providerStatus(response, "ACCELERATE_PROCESSING");
    const status = this.transactionStatus(providerStatus, response);
    return {
      status,
      providerStatus,
      providerReference: this.providerReference(response, fallbackReference),
      mockToken: this.tokenFromResponse(response),
      failureReason: status === UtilityTransactionStatus.FAILED
        ? this.safeProviderMessage(response, "Provider could not process this request.")
        : undefined,
      customerNote: this.customerNote(status),
      metadata: this.safeMetadata(response, stage, validationReference ? { validationReference } : undefined)
    };
  }

  private transactionStatus(providerStatus: string, response: JsonRecord): UtilityTransactionStatus {
    const code = this.firstStringFrom(response, ["code", "responseCode", "response_code", "statusCode", "status_code"]);
    const normalized = `${providerStatus} ${code ?? ""}`.toLowerCase();
    if (["00", "0", "200", "201"].includes(code ?? "")) return UtilityTransactionStatus.SUCCESSFUL;
    if (["01", "202"].includes(code ?? "")) return UtilityTransactionStatus.PROCESSING;
    if (["02", "400", "404", "422"].includes(code ?? "")) return UtilityTransactionStatus.FAILED;
    if (/(success|successful|completed|delivered|fulfilled)/.test(normalized)) return UtilityTransactionStatus.SUCCESSFUL;
    if (/(fail|failed|error|declined|rejected|cancelled|canceled|reversed|refund|invalid)/.test(normalized)) return UtilityTransactionStatus.FAILED;
    if (/(pending|queued|accepted|processing|process|submitted|in_progress|initiated)/.test(normalized)) return UtilityTransactionStatus.PROCESSING;
    return UtilityTransactionStatus.PROCESSING;
  }

  private customerNote(status: UtilityTransactionStatus): string {
    if (status === UtilityTransactionStatus.SUCCESSFUL) {
      return "Your utility payment has been confirmed by the provider.";
    }
    if (status === UtilityTransactionStatus.FAILED) {
      return "Provider could not process this request. Your wallet has been reversed if a debit was posted.";
    }
    return "Provider response is pending. Please check status shortly.";
  }

  private validationFailureMessage(serviceType: UtilityServiceType, response: JsonRecord): string {
    const fallback = serviceType === UtilityServiceType.ELECTRICITY || serviceType === UtilityServiceType.CABLE_TV
      ? "Meter/customer validation failed. Please check the number and try again."
      : "Provider could not validate this utility request.";
    return this.safeProviderMessage(response, fallback);
  }

  private safeFailureReason(error: unknown): string {
    const message = this.safeErrorMessage(error);
    if (/missing_accelerate/i.test(message)) return "Utilities provider is not configured correctly.";
    if (/missing_product|demo_product/i.test(message)) return "This utility product is currently unavailable.";
    if (/missing_customer_phone/i.test(message)) return "Customer phone number is required for this utility provider request.";
    return "Utilities provider submission could not be completed safely.";
  }

  private async post(serviceType: UtilityServiceType, path: string, body: JsonRecord, options?: { acceptedStatuses?: number[] }) {
    return this.request(SERVICE_ENDPOINTS[serviceType].base, path, {
      method: "POST",
      body: JSON.stringify(body)
    }, options?.acceptedStatuses);
  }

  private async get(serviceType: UtilityServiceType, path: string, options?: { acceptedStatuses?: number[] }) {
    return this.request(SERVICE_ENDPOINTS[serviceType].base, path, { method: "GET" }, options?.acceptedStatuses);
  }

  private async request(base: AccelerateBase, path: string, init: RequestInit, acceptedStatuses = [200, 201, 202]): Promise<JsonRecord> {
    const token = await this.accessToken();
    const response = await fetch(this.url(base, path), {
      ...init,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${token}`
      }
    });
    const payload = await this.safeJson(response);
    if (!acceptedStatuses.includes(response.status)) {
      throw new Error(`provider_http_${response.status}_${this.safeProviderMessage(payload, "request_failed")}`);
    }
    return { ...payload, httpStatus: response.status };
  }

  private async accessToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 30_000) {
      return this.tokenCache.token;
    }
    const publicKey = this.publicKey();
    const privateKey = this.privateKey();
    if (!publicKey) throw new Error("missing_ACCELERATE_API_PUBLIC_KEY");
    if (!privateKey) throw new Error("missing_ACCELERATE_API_PRIVATE_KEY");

    const response = await fetch(this.authUrl(), {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Basic ${Buffer.from(`${publicKey}:${privateKey}`).toString("base64")}`
      }
    });
    const payload = await this.safeJson(response);
    if (!response.ok) {
      throw new Error(`provider_auth_${response.status}_${this.safeProviderMessage(payload, "auth_failed")}`);
    }
    const token = this.tokenCandidate(payload);
    if (!token) throw new Error("missing_ACCELERATE_AUTH_TOKEN");
    const expiresIn = this.numberCandidate(payload, ["expires_in", "expiresIn", "ttl"]);
    this.tokenCache = {
      token,
      expiresAt: Date.now() + Math.max(60, expiresIn ?? 300) * 1000
    };
    return token;
  }

  private async safeJson(response: Response): Promise<JsonRecord> {
    try {
      const payload = await response.json();
      return this.isRecord(payload) ? payload : { valueType: typeof payload };
    } catch {
      return {};
    }
  }

  private url(base: AccelerateBase, path: string): string {
    const cleanBase = this.baseUrl(base).replace(/\/+$/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
  }

  private baseUrl(base: AccelerateBase): string {
    const specific = base === "power"
      ? this.optionalValue("ACCELERATE_POWER_BASE_URL")
      : this.optionalValue("ACCELERATE_AIRTIME_DATA_BASE_URL") ??
        this.optionalValue("ACCELERATE_AIRTIME_BASE_URL") ??
        this.optionalValue("ACCELERATE_DATA_BASE_URL") ??
        this.optionalValue("ACCELERATE_TV_BASE_URL");
    if (specific) return specific;

    const generic = this.optionalValue("ACCELERATE_BASE_URL") ??
      this.optionalValue("ACCELERATE_API_BASE_URL") ??
      this.optionalValue("UTILITIES_PROVIDER_BASE_URL");
    if (generic && this.isOfficialAccelerateBase(generic, base)) return generic;

    return DEFAULT_ACCELERATE_URLS[this.mode()][base];
  }

  private authUrl(): string {
    return this.optionalValue("ACCELERATE_AUTH_URL") ??
      this.optionalValue("ACCELERATE_TOKEN_URL") ??
      DEFAULT_ACCELERATE_URLS[this.mode()].auth;
  }

  private mode(): AccelerateMode {
    const configured = this.optionalValue("ACCELERATE_ENV") ?? this.optionalValue("UTILITIES_PROVIDER_ENV");
    return configured?.toLowerCase() === "live" ? "live" : "sandbox";
  }

  private isOfficialAccelerateBase(value: string, base: AccelerateBase): boolean {
    try {
      const host = new URL(value).hostname.toLowerCase();
      if (!host.endsWith("irechargetech.com")) return false;
      if (base === "power") return host.includes("power");
      return host.includes("airtime-data");
    } catch {
      return false;
    }
  }

  private publicKey(): string | undefined {
    return this.optionalValue("ACCELERATE_API_PUBLIC_KEY") ??
      this.optionalValue("ACCELERATE_PUBLIC_KEY") ??
      this.optionalValue("ACCELERATE_API_KEY") ??
      this.optionalValue("UTILITIES_PROVIDER_API_KEY");
  }

  private privateKey(): string | undefined {
    return this.optionalValue("ACCELERATE_API_PRIVATE_KEY") ??
      this.optionalValue("ACCELERATE_PRIVATE_KEY") ??
      this.optionalValue("ACCELERATE_API_SECRET") ??
      this.optionalValue("UTILITIES_PROVIDER_SECRET");
  }

  private assertConfigured(): void {
    if (!this.publicKey()) throw new Error("missing_ACCELERATE_API_PUBLIC_KEY");
    if (!this.privateKey()) throw new Error("missing_ACCELERATE_API_PRIVATE_KEY");
  }

  private providerCode(rawCode: string): string {
    return rawCode.trim().toUpperCase()
      .replace(/^DEMO_/, "")
      .replace(/_(AIRTIME|DATA|ELECTRICITY|CABLE_TV|TV)?_?PROVIDER$/, "")
      .replace(/_(AIRTIME|DATA|PREPAID|POSTPAID)$/, "");
  }

  private requiredProductCode(input: UtilityQuoteInput): string {
    const code = input.productCode?.trim();
    if (!code || code.startsWith("DEMO_")) throw new Error("missing_product_code");
    return code;
  }

  private receiver(input: UtilityQuoteInput): string {
    return input.recipient.trim();
  }

  private requiredPhoneNumber(input: UtilityQuoteInput): string {
    const value = input.customerPhoneNumber?.trim();
    if (!value) throw new Error("missing_customer_phone_number");
    return value;
  }

  private meterType(value?: UtilityMeterType): UtilityMeterType {
    return value === "POSTPAID" ? "POSTPAID" : "PREPAID";
  }

  private nairaAmount(amountKobo: number): number {
    return Number((amountKobo / 100).toFixed(2));
  }

  private providerStatus(response: JsonRecord, fallback: string): string {
    return this.firstStringFrom(response, [
      "transaction_status",
      "transactionStatus",
      "providerStatus",
      "payment_status",
      "status",
      "state",
      "code",
      "responseCode"
    ]) ?? fallback;
  }

  private providerReference(response: JsonRecord, fallback: string): string {
    return this.firstStringFrom(response, [
      "transaction_reference",
      "transactionReference",
      "transaction_ref",
      "payment_reference",
      "paymentReference",
      "providerReference",
      "reference",
      "ref",
      "id",
      "transaction_id"
    ]) ?? fallback;
  }

  private validationReference(response: JsonRecord): string | undefined {
    return this.firstStringFrom(response, ["validation_reference", "validationReference", "validation_ref", "reference", "ref"]);
  }

  private tokenFromResponse(response: JsonRecord): string | undefined {
    return this.firstStringFrom(response, ["token", "pin", "rechargePin", "meterToken", "util_receipt", "receipt"]);
  }

  private tokenCandidate(response: JsonRecord): string | undefined {
    return this.firstStringFrom(response, ["access_token", "accessToken", "token", "jwt"]);
  }

  private safeProviderMessage(response: JsonRecord, fallback: string): string {
    return this.firstStringFrom(response, ["message", "description", "reason", "error"]) ?? fallback;
  }

  private safeMetadata(response: JsonRecord, stage: string, extra?: JsonRecord): JsonRecord {
    const data = this.dataObject(response);
    return {
      mode: "accelerate",
      provider: "accelerate",
      stage,
      responseKeys: Object.keys(response).filter((key) => key !== "data").slice(0, 20),
      dataKeys: Object.keys(data).slice(0, 20),
      providerReference: this.providerReference(response, ""),
      validationReference: this.validationReference(response),
      tokenReturned: Boolean(this.tokenFromResponse(response)),
      ...(extra ?? {})
    };
  }

  private firstStringFrom(source: JsonRecord, keys: string[]): string | undefined {
    for (const object of this.candidateObjects(source)) {
      const value = this.firstString(object, keys);
      if (value) return value;
    }
    return undefined;
  }

  private numberCandidate(source: JsonRecord, keys: string[]): number | undefined {
    for (const object of this.candidateObjects(source)) {
      for (const key of keys) {
        const value = object[key];
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
      }
    }
    return undefined;
  }

  private candidateObjects(source: JsonRecord): JsonRecord[] {
    const data = this.dataObject(source);
    const tokenInfo = this.isRecord(data.token_info) ? data.token_info : this.isRecord(data.tokenInfo) ? data.tokenInfo : undefined;
    return [data, tokenInfo, source].filter((value): value is JsonRecord => Boolean(value));
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

  private optionalValue(name: string): string | undefined {
    const value = this.config.get<unknown>(name);
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
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
      if (/^\+234[789][01]\d{8}$/.test(trimmed)) return { isValid: true, normalizedRecipient: trimmed };
      return { isValid: false, message: "Enter a valid Nigerian phone number." };
    }
    const digits = trimmed.replace(/\D/g, "");
    return digits.length >= 6 && digits.length <= 20
      ? { isValid: true, normalizedRecipient: digits }
      : { isValid: false, message: serviceType === UtilityServiceType.ELECTRICITY ? "Enter a valid meter number." : "Enter a valid smartcard or IUC number." };
  }

  private safeErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
