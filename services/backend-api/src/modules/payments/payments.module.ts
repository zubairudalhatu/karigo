import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminPaymentsController } from "./admin-payments.controller";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { FlutterwaveProvider } from "./providers/flutterwave.provider";
import { MockPaymentProvider } from "./providers/mock-payment.provider";
import { MonnifyProvider } from "./providers/monnify.provider";
import { PaymentProviderRegistry } from "./providers/payment-provider.registry";
import { RideCommissionPaymentService } from "./ride-commission-payment.service";
import { PaystackProvider } from "./providers/paystack.provider";
import { SquadProvider } from "./providers/squad.provider";

import { PartnerOnboardingPaymentService } from "./partner-onboarding-payment.service";
@Module({
  imports: [AuthModule],
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [
    PaymentsService,
    PaymentProviderRegistry,
    MockPaymentProvider,
    PaystackProvider,
    FlutterwaveProvider,
    MonnifyProvider,
    SquadProvider,
    RideCommissionPaymentService,
    PartnerOnboardingPaymentService
  ],
  exports: [RideCommissionPaymentService, PartnerOnboardingPaymentService, PaymentProviderRegistry]
})
export class PaymentsModule {}
