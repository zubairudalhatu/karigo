import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminPaymentsController } from "./admin-payments.controller";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { FlutterwaveProvider } from "./providers/flutterwave.provider";
import { MockPaymentProvider } from "./providers/mock-payment.provider";
import { MonnifyProvider } from "./providers/monnify.provider";
import { PaymentProviderRegistry } from "./providers/payment-provider.registry";
import { PaystackProvider } from "./providers/paystack.provider";
import { SquadProvider } from "./providers/squad.provider";

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
    SquadProvider
  ]
})
export class PaymentsModule {}
