import { Injectable } from "@nestjs/common";
import {
  InitializePaymentInput,
  InitializePaymentResult,
  PaymentProvider,
  VerifyPaymentResult,
  WebhookPaymentResult
} from "./payment-provider.interface";

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock" as const;

  async initialize(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    return {
      transactionReference: input.transactionReference,
      authorizationUrl: `mock://payment/${input.transactionReference}`,
      accessCode: `mock_${input.transactionReference}`,
      providerResponse: {
        status: "pending",
        amount: input.amount,
        currency: input.currency,
        metadata: input.metadata
      }
    };
  }

  async verify(transactionReference: string): Promise<VerifyPaymentResult> {
    return {
      transactionReference,
      successful: true,
      providerResponse: { status: "successful", source: "mock-verification" }
    };
  }

  async parseWebhook(payload: Record<string, unknown>): Promise<WebhookPaymentResult> {
    const transactionReference =
      typeof payload.transactionReference === "string" ? payload.transactionReference : null;
    const status = typeof payload.status === "string" ? payload.status.toLowerCase() : "";

    return {
      eventType: typeof payload.eventType === "string" ? payload.eventType : "payment.success",
      transactionReference,
      successful: status === "successful" || status === "success",
      verified: true,
      providerResponse: payload
    };
  }
}

