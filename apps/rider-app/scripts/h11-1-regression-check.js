const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const earnings = fs.readFileSync(path.join(root, "app", "earnings.tsx"), "utf8");
const taxiApi = fs.readFileSync(path.join(root, "src", "api", "taxi.api.ts"), "utf8");
const accessApi = fs.readFileSync(path.join(root, "src", "api", "captain-access.api.ts"), "utf8");
const packageJson = fs.readFileSync(path.join(root, "package.json"), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

for (const copy of ["Ride requests paused", "settlement limit", "This is not an account suspension", "Pay KariGO fee", "Verify completed payment"]) {
  assert(earnings.includes(copy), `Captain H11.1 settlement UX must include: ${copy}`);
}
assert(earnings.includes("Linking.openURL") && earnings.includes("flutterwave.com"), "Captain payment must use the existing browser checkout path with an allowlisted Flutterwave host.");
assert(earnings.includes("Return here and verify payment") && !earnings.includes("redirect success confirms"), "Provider redirect must not be treated as payment proof.");
assert(earnings.includes("paymentBusy") && earnings.includes("disabled={paymentBusy}"), "Captain payment actions must suppress repeated submissions.");
assert(taxiApi.includes('"rider/taxi/commission-payments"') && taxiApi.includes("commissionPayments"), "Captain payment initialize, verify, and history contracts must be wired.");
assert(accessApi.includes("FINANCIAL_SETTLEMENT_REQUIRED"), "Captain work-state contract must expose the financial eligibility reason.");
for (const forbiddenDependency of ["flutterwave-react-native", "react-native-flutterwave", "@flutterwave/react-native"]) {
  assert(!packageJson.includes(forbiddenDependency), `H11.1 must not add native payment SDK ${forbiddenDependency}.`);
}

console.log("Captain H11.1 commission settlement regression checks passed.");
