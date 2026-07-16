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
    return this.get(
      this.config.get<string>("PAYMENTS_PROVIDER")
        ?? this.config.get<string>("PAYMENT_PROVIDER", "mock")
    );
  }

  customerTestProvider(name: CustomerTestPaymentProviderName): PaymentProvider {
    if (!CUSTOMER_TEST_PAYMENT_PROVIDERS.includes(name)) {
      throw new BadRequestException("Unsupported customer test payment provider");
    }
    if (name !== "mock" && this.livePaymentsEnabled()) {
      throw new BadRequestException("Live payment providers are disabled for customer checkout");
    }
    return this.get(name);
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
}
