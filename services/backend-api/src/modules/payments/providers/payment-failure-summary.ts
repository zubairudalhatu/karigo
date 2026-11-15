import { paymentInitializationDiagnostic } from "./payment-provider-diagnostics";

/** Categorical evidence only: never return the provider's raw message/payload. */
export function safePaymentFailure(error: unknown) {
  const diagnostic = paymentInitializationDiagnostic("squad", error);
  const status = diagnostic.httpStatusCode;
  const message = diagnostic.message.toLowerCase();
  let reason = "OPERATION_NOT_COMPLETED";
  if (status === 401 || status === 403) reason = "PROVIDER_ACCESS_REJECTED";
  else if (message.includes("checkout url"))
    reason = "CHECKOUT_URL_UNAVAILABLE";
  else if (message.includes("checkout") && message.includes("allowed"))
    reason = "CHECKOUT_HOST_REJECTED";
  else if (message.includes("reference mismatch"))
    reason = "REFERENCE_MISMATCH";
  else if (message.includes("reference")) reason = "REFERENCE_REJECTED";
  else if (message.includes("amount")) reason = "AMOUNT_REJECTED";
  else if (message.includes("email")) reason = "EMAIL_REJECTED";
  else if (message.includes("callback") || message.includes("redirect"))
    reason = "CALLBACK_REJECTED";
  else if (message.includes("merchant"))
    reason = "MERCHANT_CONFIGURATION_REJECTED";
  else if (status === 400 || status === 422) reason = "PROVIDER_INPUT_REJECTED";
  else if (message.includes("unavailable"))
    reason = "PROVIDER_NETWORK_OR_RESPONSE_UNAVAILABLE";
  return {
    reason,
    stage: diagnostic.stage,
    ...(Number.isInteger(status) && status! >= 100 && status! <= 599
      ? { providerHttpStatus: status }
      : {}),
  };
}
