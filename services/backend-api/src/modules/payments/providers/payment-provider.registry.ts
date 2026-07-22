import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FlutterwaveProvider } from "./flutterwave.provider";
import { MockPaymentProvider } from "./mock-payment.provider";
import { MonnifyProvider } from "./monnify.provider";
import { configText } from "./payment-provider-diagnostics";
import { PaymentProvider, PaymentProviderName, PAYMENT_PROVIDERS } from "./payment-provider.interface";
import { PaystackProvider } from "./paystack.provider";
import { SquadProvider } from "./squad.provider";

export const CUSTOMER_TEST_PAYMENT_PROVIDERS = ["mock", "paystack", "monnify", "squad", "flutterwave"] as const;
export type CustomerTestPaymentProviderName = (typeof CUSTOMER_TEST_PAYMENT_PROVIDERS)[number];
export const DEFAULT_CUSTOMER_CHECKOUT_PAYMENT_PROVIDERS = ["mock", "monnify", "paystack"] as const satisfies readonly CustomerTestPaymentProviderName[];
type FlutterwaveApiMode = "v3" | "v4";

@Injectable()
export class PaymentProviderRegistry {
  private readonly providers: Map<PaymentProviderName, PaymentProvider>;

  constructor(
    private readonly config: ConfigService,
    mock: MockPaymentProvider,
    paystack: PaystackProvider,
    flutterwave: FlutterwaveProvider,
    monnify: MonnifyProvider,
    squad: SquadProvider
  ) {
    this.providers = new Map(
      [mock, paystack, flutterwave, monnify, squad].map((provider) => [provider.name, provider])
    );
  }

  active(): PaymentProvider {
    const selectedProvider = (
      this.config.get<string>("PAYMENTS_PROVIDER")
        ?? this.config.get<string>("PAYMENT_PROVIDER", "mock")
    );
    if (this.livePaymentsEnabled()) {
      this.assertFlutterwaveLiveCheckoutReady(selectedProvider);
    }
    return this.get(selectedProvider);
  }

  customerTestProvider(name: CustomerTestPaymentProviderName): PaymentProvider {
    if (!CUSTOMER_TEST_PAYMENT_PROVIDERS.includes(name)) {
      throw new BadRequestException("Unsupported customer test payment provider");
    }
    if (this.livePaymentsEnabled()) {
      if (name !== "flutterwave") {
        throw new BadRequestException("Only Flutterwave is allowed for live customer checkout");
      }
      if (!this.flutterwaveCustomerCheckoutEnabled()) {
        throw new BadRequestException("Flutterwave customer checkout is temporarily disabled");
      }
      this.assertFlutterwaveLiveCheckoutReady(name);
      return this.get(name);
    }
    if (!this.customerCheckoutProviders().includes(name)) {
      throw new BadRequestException(`${this.providerLabel(name)} is deferred for customer checkout`);
    }
    return this.get(name);
  }

  customerCheckoutProviders(): CustomerTestPaymentProviderName[] {
    if (this.livePaymentsEnabled()) {
      return this.flutterwaveCustomerCheckoutEnabled() && this.flutterwaveLiveCheckoutReady() ? ["flutterwave"] : [];
    }
    const providers: CustomerTestPaymentProviderName[] = [...DEFAULT_CUSTOMER_CHECKOUT_PAYMENT_PROVIDERS];
    if (this.squadCustomerCheckoutEnabled()) {
      providers.push("squad");
    }
    return providers;
  }

  get(name: string): PaymentProvider {
    if (!PAYMENT_PROVIDERS.includes(name as PaymentProviderName)) {
      throw new BadRequestException("Unsupported payment gateway");
    }
    return this.providers.get(name as PaymentProviderName)!;
  }

  private livePaymentsEnabled(): boolean {
    return configText(this.config.get<unknown>("PAYMENTS_LIVE_ENABLED", "false"))?.toLowerCase() === "true";
  }

  private configuredProvider(): string {
    return this.config.get<string>("PAYMENTS_PROVIDER")
      ?? this.config.get<string>("PAYMENT_PROVIDER", "mock");
  }

  private flutterwaveLiveCheckoutReady(): boolean {
    if (!this.livePaymentsEnabled()) return false;
    try {
      this.assertFlutterwaveLiveCheckoutReady("flutterwave");
      return true;
    } catch {
      return false;
    }
  }

  private assertFlutterwaveLiveCheckoutReady(selectedProvider: string): void {
    if (selectedProvider !== "flutterwave" || this.configuredProvider() !== "flutterwave") {
      throw new BadRequestException("PAYMENTS_PROVIDER must be flutterwave before live payment checkout is enabled");
    }
    if (configText(this.config.get<unknown>("FLUTTERWAVE_ENVIRONMENT"))?.toLowerCase() !== "live") {
      throw new BadRequestException("FLUTTERWAVE_ENVIRONMENT must be live before live payment checkout is enabled");
    }
    const apiMode = this.flutterwaveApiMode();
    this.assertFlutterwaveBaseUrl(apiMode);
    if (apiMode === "v3") {
      if (!configText(this.config.get<unknown>("FLUTTERWAVE_SECRET_KEY"))) {
        throw new BadRequestException("missing FLUTTERWAVE_SECRET_KEY");
      }
    } else {
      if (!configText(this.config.get<unknown>("FLUTTERWAVE_CLIENT_ID"))) {
        throw new BadRequestException("missing FLUTTERWAVE_CLIENT_ID");
      }
      if (!configText(this.config.get<unknown>("FLUTTERWAVE_CLIENT_SECRET"))) {
        throw new BadRequestException("missing FLUTTERWAVE_CLIENT_SECRET");
      }
      const tokenUrl = configText(this.config.get<unknown>("FLUTTERWAVE_TOKEN_URL"));
      if (tokenUrl && !tokenUrl.startsWith("https://")) {
        throw new BadRequestException("FLUTTERWAVE_TOKEN_URL must use HTTPS before live payment checkout is enabled");
      }
      const v4Path = this.normalizedPath(configText(this.config.get<unknown>("FLUTTERWAVE_V4_CHECKOUT_PATH", "/orders")) ?? "/orders");
      if (v4Path.toLowerCase() === "/payments") {
        throw new BadRequestException("FLUTTERWAVE_V4_CHECKOUT_PATH cannot be /payments before live payment checkout is enabled");
      }
    }
    const webhookSecret = configText(this.config.get<unknown>("FLUTTERWAVE_SECRET_HASH"))
      ?? configText(this.config.get<unknown>("FLUTTERWAVE_WEBHOOK_SECRET"));
    if (!webhookSecret) {
      throw new BadRequestException("missing FLUTTERWAVE_SECRET_HASH or FLUTTERWAVE_WEBHOOK_SECRET");
    }
    const redirectUrl = configText(this.config.get<unknown>("FLUTTERWAVE_REDIRECT_URL"))
      ?? configText(this.config.get<unknown>("FLUTTERWAVE_CALLBACK_URL"));
    if (!redirectUrl?.startsWith("https://")) {
      throw new BadRequestException("FLUTTERWAVE_REDIRECT_URL or FLUTTERWAVE_CALLBACK_URL must use HTTPS before live payment checkout is enabled");
    }
  }

  private flutterwaveApiMode(): FlutterwaveApiMode {
    const configured = configText(this.config.get<unknown>("FLUTTERWAVE_API_MODE"));
    if (!configured) {
      throw new BadRequestException("missing FLUTTERWAVE_API_MODE");
    }
    const value = configured.toLowerCase();
    if (value === "v3" || value === "v4") return value;
    throw new BadRequestException("FLUTTERWAVE_API_MODE must be v3 or v4 before live payment checkout is enabled");
  }

  private assertFlutterwaveBaseUrl(apiMode: FlutterwaveApiMode): void {
    const defaultBaseUrl = apiMode === "v3"
      ? "https://api.flutterwave.com/v3"
      : "https://f4bexperience.flutterwave.com";
    const baseUrl = configText(this.config.get<unknown>("FLUTTERWAVE_BASE_URL", defaultBaseUrl)) ?? defaultBaseUrl;
    const normalized = baseUrl.toLowerCase();
    if (!baseUrl.startsWith("https://") || normalized.includes("sandbox")) {
      throw new BadRequestException("FLUTTERWAVE_BASE_URL must be a live HTTPS Flutterwave API base URL before live payment checkout is enabled");
    }
    if (apiMode === "v3" && normalized.includes("f4bexperience.flutterwave.com")) {
      throw new BadRequestException("FLUTTERWAVE_BASE_URL must use the v3 Standard checkout API host before live payment checkout is enabled");
    }
    if (apiMode === "v4" && normalized.includes("api.flutterwave.com/v3")) {
      throw new BadRequestException("FLUTTERWAVE_BASE_URL must use a v4 Flutterwave API host before live payment checkout is enabled");
    }
  }

  private normalizedPath(path: string): string {
    const value = path.trim() || "/orders";
    return value.startsWith("/") ? value : `/${value}`;
  }

  private squadCustomerCheckoutEnabled(): boolean {
    return configText(this.config.get<unknown>("SQUAD_CUSTOMER_CHECKOUT_ENABLED", "false"))?.toLowerCase() === "true";
  }

  private flutterwaveCustomerCheckoutEnabled(): boolean {
    return configText(this.config.get<unknown>("FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED", "false"))?.toLowerCase() === "true";
  }

  private providerLabel(name: CustomerTestPaymentProviderName): string {
    switch (name) {
      case "paystack": return "Paystack Test Mode";
      case "monnify": return "Monnify Sandbox";
      case "squad": return this.livePaymentsEnabled() ? "Squad by GTBank" : "Squad Sandbox";
      case "flutterwave": return "Flutterwave";
      case "mock": return "Mock payment";
      default: return "Selected provider";
    }
  }
}
