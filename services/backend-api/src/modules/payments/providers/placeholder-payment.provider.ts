import { ServiceUnavailableException } from "@nestjs/common";
import {
  InitializePaymentInput,
  InitializePaymentResult,
  PaymentProvider,
  PaymentProviderName,
  VerifyPaymentResult,
  WebhookPaymentResult
} from "./payment-provider.interface";

export abstract class PlaceholderPaymentProvider implements PaymentProvider {
  abstract readonly name: PaymentProviderName;

  initialize(_input: InitializePaymentInput): Promise<InitializePaymentResult> {
    // TODO(provider-go-live): Require provider credentials, use bounded timeouts, and validate server-owned amount/currency.
    throw new ServiceUnavailableException(`${this.name} integration is not configured yet`);
  }

  verify(_transactionReference: string): Promise<VerifyPaymentResult> {
    throw new ServiceUnavailableException(`${this.name} integration is not configured yet`);
  }

  async parseWebhook(payload: Record<string, unknown>): Promise<WebhookPaymentResult> {
    // TODO(provider-go-live): Verify the provider signature against the raw request body before returning verified=true.
    return {
      eventType: typeof payload.eventType === "string" ? payload.eventType : "unconfigured.webhook",
      transactionReference:
        typeof payload.transactionReference === "string" ? payload.transactionReference : null,
      successful: false,
      verified: false,
      providerResponse: payload
    };
  }
}
