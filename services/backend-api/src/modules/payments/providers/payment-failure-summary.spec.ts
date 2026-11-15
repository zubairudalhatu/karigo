import { PaymentProviderInitializationException } from "./payment-provider-diagnostics";
import { safePaymentFailure } from "./payment-failure-summary";

describe("sanitized payment failure categories", () => {
  it("retains access status and stage without leaking provider message content", () => {
    const result = safePaymentFailure(
      new PaymentProviderInitializationException({
        provider: "squad",
        stage: "initialize-transaction",
        httpStatusCode: 403,
        message: "private credential TOKEN-DO-NOT-LOG or personal data",
      }),
    );
    expect(result).toEqual({
      reason: "PROVIDER_ACCESS_REJECTED",
      stage: "initialize-transaction",
      providerHttpStatus: 403,
    });
    expect(JSON.stringify(result)).not.toContain("TOKEN-DO-NOT-LOG");
    expect(JSON.stringify(result)).not.toContain("personal data");
  });
  it("does not return unknown exception strings", () => {
    expect(safePaymentFailure(new Error("private arbitrary response"))).toEqual(
      { reason: "OPERATION_NOT_COMPLETED", stage: "provider-response" },
    );
  });
});
