import { Injectable } from "@nestjs/common";
import { PlaceholderPaymentProvider } from "./placeholder-payment.provider";

@Injectable()
export class SquadProvider extends PlaceholderPaymentProvider {
  readonly name = "squad" as const;
}

