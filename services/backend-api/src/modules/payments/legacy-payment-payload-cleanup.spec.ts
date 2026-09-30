const { classify, isCompliant, minimize, planRows } = require("../../../scripts/minimize-legacy-payment-payloads.cjs");

describe("legacy payment payload cleanup", () => {
  const legacy = { data: { tx_ref: "tx-1", flw_ref: "flw-1", currency: "NGN", card: { card_number: "do-not-keep" }, customer: { email: "do-not-keep" }, authorization: { mode: "pin" } }, metadata: { source: "legacy" } };

  it("detects structural risk without returning values", () => {
    const result = classify(legacy);
    expect(result.state).toBe("needsMinimization");
    expect(result.categories).toEqual(expect.arrayContaining(["cardOrAccountNumber", "authorization", "customerOrProviderProfile", "nestedMetadata"]));
    expect(JSON.stringify(result)).not.toContain("do-not-keep");
  });

  it("preserves reconciliation references and drops non-allowlisted provider data", () => {
    const result = minimize("flutterwave", legacy, "fallback");
    expect(result.transactionReference).toBe("tx-1");
    expect(result.providerTransactionReference).toBe("flw-1");
    expect(JSON.stringify(result)).not.toContain("card_number");
    expect(isCompliant(result)).toBe(true);
    expect(classify(result).state).toBe("compliant");
  });

  it("plans only legacy rows, leaves compliant rows unchanged, and fails malformed rows safely", () => {
    const compliant = minimize("flutterwave", legacy, "fallback");
    const groups = [{ model: "payment", field: "gatewayResponse", rows: [
      { id: "1", transactionReference: "tx-1", gatewayResponse: legacy },
      { id: "2", transactionReference: "tx-2", gatewayResponse: compliant },
      { id: "3", transactionReference: "tx-3", gatewayResponse: "malformed" }
    ] }];
    const plan = planRows(groups);
    expect(plan.summary).toMatchObject({ inspected: 3, compliant: 1, needsMinimization: 1, unableToClassify: 1, failures: 0 });
    expect(plan.updates).toHaveLength(1);
    expect(plan.updates[0].row.id).toBe("1");
  });
});
