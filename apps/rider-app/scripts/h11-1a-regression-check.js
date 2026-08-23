const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const repoRoot = path.resolve(root, "..", "..");
const sourcePath = path.join(root, "src", "lib", "network-errors.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const earnings = fs.readFileSync(path.join(root, "app", "earnings.tsx"), "utf8");
const earningsApi = fs.readFileSync(path.join(root, "src", "api", "earnings.api.ts"), "utf8");
const backendPresentation = fs.readFileSync(path.join(repoRoot, "services", "backend-api", "src", "modules", "dispatch", "ride-earning-presentation.ts"), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

class ApiNetworkError extends Error {}
class ApiTimeoutError extends Error {}
class ApiResponseError extends Error {
  constructor(message, errorCode, status) {
    super(message);
    this.errorCode = errorCode;
    this.status = status;
  }
}
class CaptainLocationError extends Error {}

const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const loadedModule = { exports: {} };
const localRequire = (request) => {
  if (request === "@karigo/config") return { ApiNetworkError, ApiResponseError, ApiTimeoutError };
  if (request === "./errors") return { friendlyError: (error) => error instanceof Error ? error.message : "Unknown error" };
  if (request === "./location") return { CaptainLocationError };
  throw new Error(`Unexpected regression dependency: ${request}`);
};
new Function("require", "module", "exports", compiled)(localRequire, loadedModule, loadedModule.exports);
const { captainAvailabilityErrorMessage, captainKnownAvailabilityDenial } = loadedModule.exports;

const generic = "We couldn't take you online. Please try again.";
const operating = captainKnownAvailabilityDenial([
  { message: "Outstanding KariGO service fees must be settled before receiving another Ride.", errorCode: "FINANCIAL_SETTLEMENT_REQUIRED" },
  { message: "Captain is outside the controlled operating window." }
]);
assert(operating === "Go online only during your scheduled operating window.", "Operating-window denial must win deterministically over a simultaneous financial block.");
assert(!operating.includes(generic), "Known policy denials must not stack the generic online failure.");

const originalWarn = console.warn;
console.warn = () => {};
try {
  assert(captainAvailabilityErrorMessage(
    new ApiResponseError("Outstanding KariGO service fees must be settled before receiving another Ride.", "FINANCIAL_SETTLEMENT_REQUIRED", 400),
    { service: "Ride" }
  ) === "Settle your outstanding KariGO service fee to continue receiving Ride requests.", "Financial blocks must show settlement guidance.");
  assert(captainAvailabilityErrorMessage(
    new ApiResponseError("This Captain is not approved to operate in the current area.", "OPERATING_AREA_NOT_APPROVED", 400),
    { area: "Abuja", service: "Ride" }
  ) === "This Captain is not approved to operate in the current area.", "Service-area denials must retain their specific safe message.");
  assert(captainAvailabilityErrorMessage(
    new ApiResponseError("Update device GPS before going online.", "LOCATION_STALE", 400)
  ) === "Update device GPS before going online.", "Location denials must retain actionable GPS guidance.");
  assert(captainAvailabilityErrorMessage(new Error("unexpected")) === generic, "Unknown failures must retain the generic fallback.");
  assert(captainAvailabilityErrorMessage(new ApiNetworkError("offline")) === generic, "Network failures must retain the generic fallback.");
} finally {
  console.warn = originalWarn;
}

assert(earnings.includes("displayStatus: item.displayStatus"), "Ride cards must use the derived display status instead of raw settlement payoutStatus.");
assert(earnings.includes("KariGO fee due") && earnings.includes('secondaryStatus === "KARIGO_FEE_DUE"'), "Cash Ride cards must visibly distinguish KariGO fee due from payout state.");
for (const state of ["paymentCollectionState", "captainSettlementState", "captainPayoutState", "displayStatus"]) {
  assert(earningsApi.includes(state), `Captain earnings response must expose explicit ${state} semantics.`);
}
for (const state of ["CASH_COLLECTED", "KARIGO_FEE_DUE", "RECONCILED", "PAYOUT_PENDING", "PAID", "NOT_APPLICABLE"]) {
  assert(backendPresentation.includes(state), `Backend Ride presentation must define ${state}.`);
}

console.log("Captain H11.1A Cash Ride and eligibility-message regression checks passed.");
