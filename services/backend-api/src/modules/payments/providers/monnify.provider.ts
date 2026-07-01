import { Injectable } from "@nestjs/common";
import { PlaceholderPaymentProvider } from "./placeholder-payment.provider";

@Injectable()
export class MonnifyProvider extends PlaceholderPaymentProvider {
  readonly name = "monnify" as const;
}

