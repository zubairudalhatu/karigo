import { Injectable } from "@nestjs/common";
import { PlaceholderPaymentProvider } from "./placeholder-payment.provider";

@Injectable()
export class FlutterwaveProvider extends PlaceholderPaymentProvider {
  readonly name = "flutterwave" as const;
}

