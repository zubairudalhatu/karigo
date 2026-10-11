const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const Module = require("node:module");
const file = path.resolve(__dirname, "../src/lib/utility-receipt.ts");
const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loaded = new Module(file, module);
loaded._compile(compiled, file);
const { electricityReceiptToken, copyElectricityToken, utilityReceiptMessage } = loaded.exports;
const receipt = { serviceType: "ELECTRICITY", status: "SUCCESSFUL", token: "synthetic-token", walletDebitStatus: "POSTED" };
assert.equal(electricityReceiptToken(receipt), "synthetic-token");
let copied;
assert.equal(copyElectricityToken(receipt, (value) => copied = value), true);
assert.equal(copied, "synthetic-token");
for (const unsafe of [
  { ...receipt, status: "PROCESSING" }, { ...receipt, status: "FAILED" },
  { ...receipt, walletDebitStatus: "REVERSED" }, { ...receipt, serviceType: "AIRTIME" },
  { ...receipt, token: null }
]) {
  assert.equal(electricityReceiptToken(unsafe), null);
  assert.equal(copyElectricityToken(unsafe, () => assert.fail("Unsafe/missing token must not be copied")), false);
}
assert.match(utilityReceiptMessage({ ...receipt, status: "PROCESSING" }), /Do not pay again.*token will appear/);
assert.match(utilityReceiptMessage(receipt), /successful/);
assert.doesNotMatch(utilityReceiptMessage({ ...receipt, status: "FAILED" }), /was successful/);
console.log("Utility receipt behavior tests passed (token copy, missing/unsafe token, processing and failure).");
