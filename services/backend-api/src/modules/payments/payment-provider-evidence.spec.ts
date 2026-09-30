import { paymentProviderEvidence } from "./payment-provider-evidence";

describe("paymentProviderEvidence", () => {
  it("retains reconciliation fields and drops raw payment credentials and customer profiles", () => {
    const evidence = paymentProviderEvidence("flutterwave", {
      transactionReference: "KGO-ORDER-1",
      successful: true,
      verified: true,
      amountMinor: 125000,
      currency: "NGN",
      providerResponse: {
        data: {
          id: 12345,
          flw_ref: "FLW-REF-1",
          payment_type: "card",
          card: { first_6digits: "123456", last_4digits: "7890", token: "secret-token" },
          account_number: "0000000000",
          authorization: { authorization_code: "do-not-store" },
          customer: { email: "person@example.test", phone_number: "+2348000000000" }
        }
      }
    });

    expect(evidence).toEqual(expect.objectContaining({
      provider: "flutterwave",
      transactionReference: "KGO-ORDER-1",
      providerTransactionReference: "FLW-REF-1",
      paymentMethodCategory: "card",
      amountMinor: 125000,
      currency: "NGN"
    }));
    const serialized = JSON.stringify(evidence);
    expect(serialized).not.toContain("123456");
    expect(serialized).not.toContain("0000000000");
    expect(serialized).not.toContain("secret-token");
    expect(serialized).not.toContain("person@example.test");
    expect(serialized).not.toContain("authorization_code");
  });
});
