import { BadGatewayException, HttpException } from "@nestjs/common";

export type PaymentInitializationStage =
  | "config-read"
  | "auth-token"
  | "initialize-transaction"
  | "provider-response";

export interface PaymentInitializationDiagnostic {
  provider: string;
  stage: PaymentInitializationStage;
  message: string;
  httpStatusCode?: number;
  providerMessage?: string;
}

export class PaymentProviderInitializationException extends BadGatewayException {
  constructor(readonly diagnostic: PaymentInitializationDiagnostic) {
    super(diagnostic.message);
  }
}

export function paymentInitializationDiagnostic(
  provider: string,
  error: unknown,
  fallbackStage: PaymentInitializationStage = "provider-response"
): PaymentInitializationDiagnostic {
  if (error instanceof PaymentProviderInitializationException) {
    return error.diagnostic;
  }

  const httpStatusCode = error instanceof HttpException ? error.getStatus() : undefined;
  const message = errorMessage(error);
  const stage = configErrorMessage(message) ? "config-read" : fallbackStage;

  return {
    provider,
    stage,
    message,
    httpStatusCode,
    providerMessage: message
  };
}

export function configText(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  return undefined;
}

function errorMessage(error: unknown): string {
  if (error instanceof HttpException) {
    const response = error.getResponse();
    if (typeof response === "string") return response;
    if (response && typeof response === "object" && "message" in response) {
      const message = (response as { message?: unknown }).message;
      if (Array.isArray(message)) return message.join("; ");
      if (typeof message === "string") return message;
    }
  }
  return error instanceof Error ? error.message : String(error);
}

function configErrorMessage(message: string): boolean {
  return /^missing\s+[A-Z0-9_]+/.test(message)
    || message.includes("PAYMENTS_LIVE_ENABLED")
    || message.includes("_MODE")
    || message.includes("_BASE_URL")
    || message.includes("SECRET_KEY")
    || message.includes("CONTRACT_CODE");
}
