import { Injectable } from "@nestjs/common";
import { UtilityServiceType, UtilityTransactionStatus } from "@prisma/client";
import {
  UtilityProviderClient,
  UtilityPurchaseInput,
  UtilityPurchaseResult,
  UtilityQuoteInput,
  UtilityQuoteResult,
  UtilityRecipientValidationResult
} from "./utility-provider.interface";

@Injectable()
export class MockUtilityProvider implements UtilityProviderClient {
  async validateRecipient(serviceType: UtilityServiceType, recipient: string): Promise<UtilityRecipientValidationResult> {
    const trimmed = recipient.trim();
    if (!trimmed) {
      return { isValid: false, message: "Recipient is required." };
    }

    if (serviceType === UtilityServiceType.AIRTIME || serviceType === UtilityServiceType.DATA) {
      const normalized = this.normalizeNigerianPhone(trimmed);
      return normalized
        ? { isValid: true, normalizedRecipient: normalized }
        : { isValid: false, message: "Enter a valid Nigerian phone number." };
    }

    const digits = trimmed.replace(/\D/g, "");
    if (digits.length < 6 || digits.length > 20) {
      return {
        isValid: false,
        message: serviceType === UtilityServiceType.ELECTRICITY
          ? "Enter a valid meter number."
          : "Enter a valid smartcard or IUC number."
      };
    }

    return {
      isValid: true,
      normalizedRecipient: digits,
      recipientName: serviceType === UtilityServiceType.ELECTRICITY ? "Demo Meter Customer" : undefined
    };
  }

  async quote(input: UtilityQuoteInput): Promise<UtilityQuoteResult> {
    return {
      providerStatus: "MOCK_QUOTED",
      customerNote: this.testModeNote(input.serviceType),
      metadata: { mode: "mock", providerCode: input.providerCode, productCode: input.productCode }
    };
  }

  async purchase(input: UtilityPurchaseInput): Promise<UtilityPurchaseResult> {
    if (input.amountKobo === 99999) {
      return {
        status: UtilityTransactionStatus.FAILED,
        providerStatus: "MOCK_FAILED",
        providerReference: `MOCK-${input.reference}`,
        failureReason: "Mock provider failure triggered by test amount.",
        customerNote: "This test transaction failed safely. No real utility was delivered.",
        metadata: { mode: "mock", simulatedFailure: true }
      };
    }

    return {
      status: UtilityTransactionStatus.SUCCESSFUL,
      providerStatus: "MOCK_SUCCESSFUL",
      providerReference: `MOCK-${input.reference}`,
      mockToken: input.serviceType === UtilityServiceType.ELECTRICITY ? this.mockElectricityToken(input.reference) : undefined,
      customerNote: this.testModeNote(input.serviceType),
      metadata: { mode: "mock", providerCode: input.providerCode, productCode: input.productCode }
    };
  }

  async checkStatus(reference: string): Promise<UtilityPurchaseResult> {
    return {
      status: UtilityTransactionStatus.SUCCESSFUL,
      providerStatus: "MOCK_STATUS_SUCCESSFUL",
      providerReference: `MOCK-${reference}`,
      customerNote: "Mock status check completed. No live provider fulfilment occurred.",
      metadata: { mode: "mock" }
    };
  }

  private normalizeNigerianPhone(value: string) {
    const digits = value.replace(/\D/g, "");
    if (/^0[789][01]\d{8}$/.test(digits)) return `+234${digits.slice(1)}`;
    if (/^234[789][01]\d{8}$/.test(digits)) return `+${digits}`;
    return null;
  }

  private mockElectricityToken(reference: string) {
    const suffix = reference.replace(/\W/g, "").slice(-8).padStart(8, "0").toUpperCase();
    return `KGO-TEST-${suffix.slice(0, 4)}-${suffix.slice(4)}`;
  }

  private testModeNote(serviceType: UtilityServiceType) {
    if (serviceType === UtilityServiceType.ELECTRICITY) {
      return "Test-mode electricity token generated. No real meter token was delivered.";
    }
    if (serviceType === UtilityServiceType.CABLE_TV) {
      return "Test-mode cable subscription completed. No real subscription was delivered.";
    }
    return "Test-mode utility transaction completed. No real airtime or data was delivered.";
  }
}
