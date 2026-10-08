import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UtilityServiceType, UtilityTransactionStatus } from "@prisma/client";
import { randomBytes } from "crypto";
import {
  UtilityProviderClient,
  UtilityPurchaseInput,
  UtilityPurchaseResult,
  UtilityQuoteInput,
  UtilityQuoteResult,
  UtilityRecipientValidationResult
} from "./utility-provider.interface";

type JsonRecord = Record<string, unknown>;

export interface PaybetaCatalogueProvider {
  name: string;
  code: string;
  active: boolean;
}

export interface PaybetaCatalogueProduct {
  code: string;
  name: string;
  amountKobo: number;
}

export interface PaybetaBalanceSnapshot {
  availableBalanceKobo: number;
  lienAmountKobo: number;
}

interface PaybetaRequestOptions {
  method?: "GET" | "POST";
  body?: JsonRecord;
  retrySafe?: boolean;
  acceptedStatuses?: number[];
}

const SANDBOX_ORIGIN = "https://api.sandbox.paybeta.ng";
const PRODUCTION_ORIGIN = "https://api.paybeta.ng";
const PROVIDER_PATHS: Record<UtilityServiceType, string> = {
  AIRTIME: "/v2/airtime/providers",
  DATA: "/v2/data-bundle/providers",
  ELECTRICITY: "/v2/electricity/providers",
  CABLE_TV: "/v2/cable/providers"
};

@Injectable()
export class PaybetaUtilityProvider implements UtilityProviderClient {
  private readonly logger = new Logger(PaybetaUtilityProvider.name);
  private readonly submittedReferences = new Set<string>();

  constructor(private readonly config: ConfigService) {}

  isConfigured(expectedEnvironment?: "sandbox" | "production"): boolean {
    const environment = this.environment();
    return Boolean(this.apiKey()) && Boolean(environment) && (!expectedEnvironment || environment === expectedEnvironment);
  }

  createReference(): string {
    return `KGO-PAYBETA-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;
  }

  async listProviders(serviceType: UtilityServiceType): Promise<PaybetaCatalogueProvider[]> {
    const response = await this.request(PROVIDER_PATHS[serviceType], { retrySafe: true });
    return this.recordArray(response.data).map((value) => ({
      name: this.string(value.name) || "Paybeta provider",
      code: this.providerCode(serviceType, value),
      active: value.status !== false
    })).filter((provider) => Boolean(provider.code));
  }

  async listProducts(serviceType: UtilityServiceType, providerCode: string): Promise<PaybetaCatalogueProduct[]> {
    if (serviceType !== UtilityServiceType.DATA && serviceType !== UtilityServiceType.CABLE_TV) return [];
    const service = this.normalizeService(providerCode, serviceType);
    const response = serviceType === UtilityServiceType.DATA
      ? this.environment() === "production"
        ? await this.request("/v2/data-bundle/list", { method: "POST", body: { service }, retrySafe: true })
        : await this.request(`/v2/data-bundle/list?service=${encodeURIComponent(service)}`, { retrySafe: true })
      : await this.request("/v2/cable/bouquet", { method: "POST", body: { service }, retrySafe: true });
    const data = this.record(response.data);
    return this.recordArray(data.packages).map((value) => {
      const amount = Number(value.price);
      return {
        code: this.string(value.code),
        name: this.string(value.description) || this.string(value.code),
        amountKobo: Number.isFinite(amount) ? Math.round(amount * 100) : 0
      };
    }).filter((product) => Boolean(product.code) && product.amountKobo > 0);
  }

  async getBalance(): Promise<PaybetaBalanceSnapshot> {
    const response = await this.request("/v2/wallet/balance", { retrySafe: true });
    const data = this.record(response.data);
    return {
      availableBalanceKobo: this.nairaToKobo(data.availableBalance),
      lienAmountKobo: this.nairaToKobo(data.lienAmount)
    };
  }

  async validateRecipient(serviceType: UtilityServiceType, recipient: string): Promise<UtilityRecipientValidationResult> {
    const normalized = recipient.trim();
    if (serviceType === UtilityServiceType.AIRTIME || serviceType === UtilityServiceType.DATA) {
      const digits = normalized.replace(/\D/g, "");
      const local = digits.startsWith("234") ? `0${digits.slice(3)}` : digits;
      if (!/^0[789][01]\d{8}$/.test(local)) {
        return { isValid: false, message: "Enter a valid Nigerian mobile number." };
      }
      return { isValid: true, normalizedRecipient: local };
    }
    if (!/^[A-Za-z0-9-]{6,32}$/.test(normalized)) {
      return { isValid: false, message: serviceType === UtilityServiceType.ELECTRICITY ? "Enter a valid meter number." : "Enter a valid smartcard number." };
    }
    return { isValid: true, normalizedRecipient: normalized };
  }

  async validateCustomer(input: UtilityQuoteInput): Promise<UtilityRecipientValidationResult> {
    const local = await this.validateRecipient(input.serviceType, input.recipient);
    if (!local.isValid || !local.normalizedRecipient) return local;
    if (input.serviceType !== UtilityServiceType.ELECTRICITY && input.serviceType !== UtilityServiceType.CABLE_TV) return local;

    const electricity = input.serviceType === UtilityServiceType.ELECTRICITY;
    const response = await this.request(electricity ? "/v2/electricity/validate" : "/v2/cable/validate", {
      method: "POST",
      retrySafe: true,
      acceptedStatuses: [200, 400, 404, 422],
      body: electricity ? {
        service: this.normalizeService(input.providerCode, input.serviceType),
        meterNumber: local.normalizedRecipient,
        meterType: (input.meterType ?? "PREPAID").toLowerCase()
      } : {
        service: this.normalizeService(input.providerCode, input.serviceType),
        smartCardNumber: local.normalizedRecipient
      }
    });
    if (this.normalizedStatus(response) === UtilityTransactionStatus.FAILED) {
      return { isValid: false, message: electricity ? "Paybeta could not validate this meter." : "Paybeta could not validate this smartcard." };
    }
    const data = this.record(response.data);
    return {
      isValid: true,
      normalizedRecipient: local.normalizedRecipient,
      recipientName: this.string(data.customerName) || undefined,
      recipientAddress: this.string(data.customerAddress) || undefined
    };
  }

  async quote(input: UtilityQuoteInput): Promise<UtilityQuoteResult> {
    this.assertConfigured();
    const validation = await this.validateCustomer(input);
    if (!validation.isValid) {
      return {
        providerStatus: "PAYBETA_VALIDATION_FAILED",
        customerNote: validation.message ?? "Paybeta validation failed.",
        metadata: this.safeMetadata("quote", input.serviceType)
      };
    }
    return {
      providerStatus: "PAYBETA_READY",
      customerNote: "Your utility request passed Paybeta validation.",
      metadata: this.safeMetadata("quote", input.serviceType)
    };
  }

  async purchase(input: UtilityPurchaseInput): Promise<UtilityPurchaseResult> {
    if (this.submittedReferences.has(input.reference)) {
      return {
        status: UtilityTransactionStatus.PROCESSING,
        providerStatus: "PAYBETA_DUPLICATE_REFERENCE_BLOCKED",
        providerReference: input.reference,
        customerNote: "This utility reference was already submitted. KariGO will reconcile its status instead of purchasing again.",
        metadata: this.safeMetadata("duplicate-blocked", input.serviceType)
      };
    }
    this.submittedReferences.add(input.reference);
    try {
      this.assertConfigured();
      const validation = await this.validateCustomer(input);
      if (!validation.isValid) {
        return {
          status: UtilityTransactionStatus.FAILED,
          providerStatus: "PAYBETA_VALIDATION_FAILED",
          providerReference: input.reference,
          failureReason: "Paybeta recipient validation failed.",
          customerNote: validation.message ?? "Paybeta recipient validation failed.",
          metadata: this.safeMetadata("purchase-validation", input.serviceType)
        };
      }
      const validatedInput = {
        ...input,
        recipient: validation.normalizedRecipient ?? input.recipient,
        recipientName: validation.recipientName ?? input.recipientName,
        recipientAddress: validation.recipientAddress ?? input.recipientAddress
      };
      const response = await this.request(this.purchasePath(input.serviceType), {
        method: "POST",
        body: this.purchasePayload(validatedInput),
        retrySafe: false,
        acceptedStatuses: [200, 201, 202, 400, 404, 422]
      });
      return this.purchaseResult(response, input.reference, input.serviceType, "purchase");
    } catch (error) {
      this.logger.warn(`Paybeta purchase failed reference=${input.reference} category=${this.safeErrorCategory(error)}`);
      return {
        status: UtilityTransactionStatus.PROCESSING,
        providerStatus: "PAYBETA_SUBMISSION_UNCONFIRMED",
        providerReference: input.reference,
        customerNote: "Paybeta did not confirm this request. KariGO will query its status and will not repurchase it automatically.",
        metadata: { ...this.safeMetadata("purchase", input.serviceType), errorCategory: this.safeErrorCategory(error) }
      };
    }
  }

  async checkStatus(reference: string, serviceType: UtilityServiceType = UtilityServiceType.AIRTIME): Promise<UtilityPurchaseResult> {
    try {
      this.assertConfigured();
      const response = await this.request("/v2/transaction/query", {
        method: "POST",
        body: { reference },
        retrySafe: true,
        acceptedStatuses: [200, 404, 422]
      });
      return this.purchaseResult(response, reference, serviceType, "query");
    } catch (error) {
      this.logger.warn(`Paybeta status query failed reference=${reference} category=${this.safeErrorCategory(error)}`);
      return {
        status: UtilityTransactionStatus.PROCESSING,
        providerStatus: "PAYBETA_STATUS_UNAVAILABLE",
        providerReference: reference,
        customerNote: "KariGO could not confirm Paybeta status yet. The purchase will not be repeated.",
        metadata: { ...this.safeMetadata("query", serviceType), errorCategory: this.safeErrorCategory(error) }
      };
    }
  }

  async reconcileStatus(
    reference: string,
    serviceType: UtilityServiceType,
    options: { maxAttempts?: number; initialDelayMs?: number; intervalMs?: number } = {}
  ): Promise<UtilityPurchaseResult> {
    const maxAttempts = Math.max(1, Math.min(options.maxAttempts ?? 3, 3));
    const initialDelayMs = Math.max(0, options.initialDelayMs ?? 180_000);
    const intervalMs = Math.max(0, options.intervalMs ?? 300_000);
    if (initialDelayMs) await this.delay(initialDelayMs);
    let result: UtilityPurchaseResult | undefined;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      result = await this.checkStatus(reference, serviceType);
      if (result.status !== UtilityTransactionStatus.PROCESSING) return result;
      if (attempt + 1 < maxAttempts && intervalMs) await this.delay(intervalMs);
    }
    return result!;
  }

  webhookAuthenticationStatus() {
    return {
      documented: false,
      enabled: false,
      safeNote: "Paybeta callback signature verification is not documented; the webhook endpoint remains disabled."
    } as const;
  }

  private purchasePath(serviceType: UtilityServiceType): string {
    if (serviceType === UtilityServiceType.AIRTIME) return "/v2/airtime/purchase";
    if (serviceType === UtilityServiceType.DATA) return "/v2/data-bundle/purchase";
    if (serviceType === UtilityServiceType.ELECTRICITY) return "/v2/electricity/purchase";
    return "/v2/cable/purchase";
  }

  private purchasePayload(input: UtilityPurchaseInput): JsonRecord {
    const service = this.normalizeService(input.providerCode, input.serviceType);
    const amount = this.koboToNaira(input.amountKobo);
    if (input.serviceType === UtilityServiceType.AIRTIME) {
      return { service, phoneNumber: input.recipient, amount, reference: input.reference };
    }
    if (input.serviceType === UtilityServiceType.DATA) {
      return { service, phoneNumber: input.recipient, amount, code: this.requiredProductCode(input), reference: input.reference };
    }
    if (input.serviceType === UtilityServiceType.ELECTRICITY) {
      return {
        service,
        meterNumber: input.recipient,
        meterType: (input.meterType ?? "PREPAID").toLowerCase(),
        amount,
        customerName: input.recipientName ?? "KariGO Customer",
        customerAddress: input.recipientAddress ?? "KariGO",
        reference: input.reference
      };
    }
    return {
      service,
      smartCardNumber: input.recipient,
      amount,
      packageCode: this.requiredProductCode(input),
      customerName: input.recipientName ?? "KariGO Customer",
      reference: input.reference
    };
  }

  private purchaseResult(response: JsonRecord, reference: string, serviceType: UtilityServiceType, stage: string): UtilityPurchaseResult {
    const status = this.normalizedStatus(response);
    const data = this.record(response.data);
    const token = this.string(data.token);
    return {
      status,
      providerStatus: `PAYBETA_${this.providerStatus(response)}`,
      providerReference: this.string(data.reference) || reference,
      mockToken: token && token !== "0" ? token : undefined,
      failureReason: status === UtilityTransactionStatus.FAILED ? "Paybeta could not process this utility request." : undefined,
      customerNote: status === UtilityTransactionStatus.SUCCESSFUL
        ? "Paybeta completed the utility request."
        : status === UtilityTransactionStatus.FAILED
          ? "Paybeta could not complete the request."
          : "Paybeta is still processing the request. KariGO will reconcile it without repurchasing.",
      metadata: {
        ...this.safeMetadata(stage, serviceType),
        transactionId: this.string(data.transactionId) || undefined,
        units: this.string(data.unit) || undefined
      }
    };
  }

  private normalizedStatus(response: JsonRecord): UtilityTransactionStatus {
    const code = this.string(response.code);
    const rootStatus = this.string(response.status).toLowerCase();
    const paymentStatus = this.string(this.record(response.data).paymentStatus).toLowerCase();
    const statusValues = [rootStatus, paymentStatus];
    if (code === "00" || statusValues.some((value) => ["successful", "success", "completed", "delivered"].includes(value))) {
      return UtilityTransactionStatus.SUCCESSFUL;
    }
    if (["02", "99"].includes(code) || statusValues.some((value) => [
      "failed", "failure", "error", "invalid", "rejected", "reversed", "refunded", "unsuccessful"
    ].includes(value))) {
      return UtilityTransactionStatus.FAILED;
    }
    return UtilityTransactionStatus.PROCESSING;
  }

  private providerStatus(response: JsonRecord): string {
    const code = this.string(response.code);
    if (code === "00") return "SUCCESSFUL";
    if (code === "01") return "PENDING";
    if (code === "02") return "FAILED";
    if (code === "99") return "ERROR";
    return (this.string(response.status) || "PENDING").replace(/[^A-Za-z0-9]+/g, "_").toUpperCase();
  }

  private async request(path: string, options: PaybetaRequestOptions = {}): Promise<JsonRecord> {
    this.assertConfigured();
    const attempts = options.retrySafe ? this.retryAttempts() : 1;
    const acceptedStatuses = options.acceptedStatuses ?? [200, 201, 202];
    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs());
      try {
        const response = await fetch(new URL(path, this.baseUrl()), {
          method: options.method ?? "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "P-API-KEY": this.apiKey()
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal
        });
        const payload = await response.json().catch(() => ({}));
        if (!acceptedStatuses.includes(response.status)) throw new Error(`PAYBETA_HTTP_${response.status}`);
        return this.record(payload);
      } catch (error) {
        lastError = error;
        if (attempt + 1 >= attempts) throw error;
        await this.delay(this.retryDelayMs());
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError;
  }

  private assertConfigured() {
    if (!this.apiKey()) throw new Error("PAYBETA_API_KEY is required for Paybeta requests");
    if (!this.environment()) throw new Error("Paybeta provider must use api.sandbox.paybeta.ng or api.paybeta.ng");
  }

  private baseUrl(): URL {
    const configured = this.config.get<string>("PAYBETA_BASE_URL", SANDBOX_ORIGIN).trim();
    const url = new URL(configured.endsWith("/") ? configured : `${configured}/`);
    if (url.protocol !== "https:" || url.username || url.password) throw new Error("PAYBETA_BASE_URL must be a credential-free HTTPS URL");
    return url;
  }

  private apiKey(): string {
    return this.config.get<string>("PAYBETA_API_KEY", "").trim();
  }

  private timeoutMs(): number {
    return Math.max(1_000, Math.min(Number(this.config.get("PAYBETA_TIMEOUT_MS", 10_000)) || 10_000, 30_000));
  }

  private retryAttempts(): number {
    return Math.max(1, Math.min(Number(this.config.get("PAYBETA_RETRY_ATTEMPTS", 2)) || 2, 3));
  }

  private retryDelayMs(): number {
    return Math.max(0, Math.min(Number(this.config.get("PAYBETA_RETRY_DELAY_MS", 250)) || 250, 2_000));
  }

  private safeMetadata(stage: string, serviceType: UtilityServiceType): JsonRecord {
    return { provider: "paybeta", environment: this.environment(), stage, serviceType };
  }

  private safeErrorCategory(error: unknown): string {
    if (error instanceof Error && error.name === "AbortError") return "timeout";
    if (error instanceof Error && /^PAYBETA_HTTP_\d{3}$/.test(error.message)) return error.message.toLowerCase();
    return "provider_unavailable";
  }

  private providerCode(serviceType: UtilityServiceType, value: JsonRecord): string {
    const slug = this.string(value.slug);
    if (slug) return this.normalizeService(slug, serviceType);
    const name = this.string(value.name).toLowerCase();
    if (serviceType === UtilityServiceType.AIRTIME) {
      if (name.includes("mtn")) return "mtn_vtu";
      if (name.includes("airtel")) return "airtel_vtu";
      if (name.includes("glo")) return "glo_vtu";
      if (name.includes("9mobile")) return "9mobile_vtu";
    }
    if (serviceType === UtilityServiceType.ELECTRICITY) {
      return this.normalizeService(name, serviceType);
    }
    return name.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  }

  private normalizeService(value: string, serviceType: UtilityServiceType): string {
    const raw = value.trim().replace(/^DEMO_/i, "").replace(/_PROVIDER$/i, "");
    const lower = raw.toLowerCase();
    if (serviceType === UtilityServiceType.AIRTIME) {
      if (lower.includes("mtn")) return "mtn_vtu";
      if (lower.includes("airtel")) return "airtel_vtu";
      if (lower.includes("glo")) return "glo_vtu";
      if (lower.includes("9mobile")) return "9mobile_vtu";
    }
    if (serviceType === UtilityServiceType.DATA) {
      if (lower.includes("mtn")) return "mtn_data";
      if (lower.includes("airtel")) return "airtel_data";
      if (lower.includes("glo")) return "glo_data";
      if (lower.includes("9mobile")) return "9mobile_data";
    }
    if (serviceType === UtilityServiceType.ELECTRICITY) {
      const aliases: Array<[string[], string]> = [
        [["abuja", "aedc"], "abuja-electric"],
        [["benin", "bedc"], "benin-electric"],
        [["eko", "ekedc"], "eko-electric"],
        [["enugu", "eedc"], "enugu-electric"],
        [["ibadan", "ibedc"], "ibadan-electric"],
        [["ikeja", "ikedc"], "ikeja-electric"],
        [["jos", "jed"], "jos-electric"],
        [["kaduna", "kaedco"], "kaduna-electric"],
        [["kano", "kedco"], "kano-electric"],
        [["port harcourt", "phed"], "port-harcourt-electric"],
        [["yola", "yedc"], "yola-electric"]
      ];
      const match = aliases.find(([terms]) => terms.some((term) => lower.includes(term)));
      if (match) return match[1];
    }
    if (serviceType === UtilityServiceType.CABLE_TV) {
      if (lower.includes("dstv")) return "dstv";
      if (lower.includes("gotv")) return "gotv";
      if (lower.includes("startimes")) return "startimes";
    }
    return lower.replace(/_/g, "-");
  }

  private requiredProductCode(input: UtilityQuoteInput): string {
    const value = input.productCode?.trim();
    if (!value) throw new Error("Paybeta product code is required for Data and Cable TV purchases");
    return value;
  }

  private record(value: unknown): JsonRecord {
    return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
  }

  private recordArray(value: unknown): JsonRecord[] {
    return Array.isArray(value) ? value.map((item) => this.record(item)) : [];
  }

  private string(value: unknown): string {
    return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
  }

  private koboToNaira(value: number): number {
    return Number((value / 100).toFixed(2));
  }

  private nairaToKobo(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
  }

  private delay(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  private environment(): "sandbox" | "production" | undefined {
    const origin = this.baseUrl().origin;
    if (origin === SANDBOX_ORIGIN) return "sandbox";
    if (origin === PRODUCTION_ORIGIN) return "production";
    return undefined;
  }
}
