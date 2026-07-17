import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FlutterwaveProvider } from "./flutterwave.provider";
import { MockPaymentProvider } from "./mock-payment.provider";
import { MonnifyProvider } from "./monnify.provider";
import { configText } from "./payment-provider-diagnostics";
import { PaymentProvider, PaymentProviderName, PAYMENT_PROVIDERS } from "./payment-provider.interface";
import { PaystackProvider } from "./paystack.provider";
import { SquadProvider } from "./squad.provider";

export const CUSTOMER_TEST_PAYMENT_PROVIDERS = ["mock", "paystack", "monnify", "squad"] as const;
export type CustomerTestPaymentProviderName = (typeof CUSTOMER_TEST_PAYMENT_PROVIDERS)[number];
export const DEFAULT_CUSTOMER_CHECKOUT_PAYMENT_PROVIDERS = ["mock", "monnify", "paystack"] as const satisfies readonly CustomerTestPaymentProviderName[];
const SQUAD_LIVE_REQUIRED_KEYS = [
  "SQUAD_SECRET_KEY",
  "SQUAD_BASE_URL",
  "SQUAD_CALLBACK_URL",
  "SQUAD_WEBHOOK_SECRET",
  "SQUAD_LIVE_ACTIVATION_APPROVED"
] as const;

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
      this.assertSquadLiveCheckoutReady(selectedProvider);
    }
    return this.get(selectedProvider);
  }

  customerTestProvider(name: CustomerTestPaymentProviderName): PaymentProvider {
    if (!CUSTOMER_TEST_PAYMENT_PROVIDERS.includes(name)) {
      throw new BadRequestException("Unsupported customer test payment provider");
    }
    if (this.livePaymentsEnabled()) {
      if (name !== "squad") {
        throw new BadRequestException("Only Squad by GTBank is allowed for live customer checkout");
      }
      this.assertSquadLiveCheckoutReady(name);
      return this.get(name);
    }
    if (!this.customerCheckoutProviders().includes(name)) {
      throw new BadRequestException(`${this.providerLabel(name)} is deferred for customer checkout`);
    }
    return this.get(name);
  }

  customerCheckoutProviders(): CustomerTestPaymentProviderName[] {
    if (this.livePaymentsEnabled()) {
      return this.squadLiveCheckoutReady() ? ["squad"] : [];
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

  private squadLiveCheckoutReady(): boolean {
    if (!this.livePaymentsEnabled()) return false;
    try {
      this.assertSquadLiveCheckoutReady("squad");
      return true;
    } catch {
      return false;
    }
  }

  private assertSquadLiveCheckoutReady(selectedProvider: string): void {
    if (selectedProvider !== "squad" || this.configuredProvider() !== "squad") {
      throw new BadRequestException("PAYMENTS_PROVIDER must be squad before live payment checkout is enabled");
    }
    if (configText(this.config.get<unknown>("SQUAD_MODE"))?.toLowerCase() !== "live") {
      throw new BadRequestException("SQUAD_MODE must be live before live payment checkout is enabled");
    }
    for (const key of SQUAD_LIVE_REQUIRED_KEYS) {
      const value = configText(this.config.get<unknown>(key));
      if (!value) {
        throw new BadRequestException(`missing ${key}`);
      }
    }
    if (configText(this.config.get<unknown>("SQUAD_LIVE_ACTIVATION_APPROVED"))?.toLowerCase() !== "true") {
      throw new BadRequestException("SQUAD_LIVE_ACTIVATION_APPROVED must be true before live payment checkout is enabled");
    }
    const baseUrl = configText(this.config.get<unknown>("SQUAD_BASE_URL"));
    if (!baseUrl?.startsWith("https://") || baseUrl.toLowerCase().includes("sandbox")) {
      throw new BadRequestException("SQUAD_BASE_URL must be a live HTTPS Squad API base URL before live payment checkout is enabled");
    }
    const callbackUrl = configText(this.config.get<unknown>("SQUAD_CALLBACK_URL"));
    if (!callbackUrl?.startsWith("https://")) {
      throw new BadRequestException("SQUAD_CALLBACK_URL must use HTTPS before live payment checkout is enabled");
    }
  }

  private squadCustomerCheckoutEnabled(): boolean {
    return configText(this.config.get<unknown>("SQUAD_CUSTOMER_CHECKOUT_ENABLED", "false"))?.toLowerCase() === "true";
  }

  private providerLabel(name: CustomerTestPaymentProviderName): string {
    switch (name) {
      case "paystack": return "Paystack Test Mode";
      case "monnify": return "Monnify Sandbox";
      case "squad": return this.livePaymentsEnabled() ? "Squad by GTBank" : "Squad Sandbox";
      case "mock": return "Mock payment";
      default: return "Selected provider";
    }
  }
}
