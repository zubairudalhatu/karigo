const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const business = read("app", "register", "business.tsx");
const review = read("app", "register", "review.tsx");
const dashboard = read("app", "index.tsx");
const earnings = read("app", "earnings", "index.tsx");
const registrationApi = read("src", "api", "registration.api.ts");
const partnerApi = read("src", "api", "partner.api.ts");
const context = read("src", "contexts", "partner-registration-context.tsx");

assert(business.includes('value: "PHARMACY"'), "Public category selection must include Pharmacy.");
assert(!business.includes('value: "PARCEL_LOGISTICS_PARTNER"'), "Public category selection must not offer a third-party Parcel Partner.");
assert(business.includes("visibleInPublicCategorySelection") && business.includes("categoryPublicOnboardingEnabled"), "Category selection must use safe policy visibility and readiness.");
assert(review.includes("I understand and accept the KariGO Partner commercial terms for this business category."), "Commercial terms acceptance must be explicit.");
assert(review.includes("KariGO does not calculate this commission on the KariGO delivery fee."), "Restaurant terms must exclude delivery fee from commission.");
assert(review.includes("KariGO sales/service commission: 0%."), "Onboarding-fee categories must show zero commission.");
assert(review.includes("KariGO is finalising the onboarding fee for this Partner category"), "Missing fee must show the approved blocking copy.");
assert(review.includes("commercialPolicyId") && review.includes("acceptedTermsVersion") && review.includes('acceptedFromAppSurface: "partner-mobile-app"'), "Submission must carry accepted server policy identity and terms version.");
assert(context.includes("commercialTermsAccepted") && context.includes("commercialPolicyId"), "Draft state must preserve commercial acceptance inputs.");
assert(registrationApi.includes("partner-commercial/policies") && registrationApi.includes("onboardingFeeConfigured"), "Partner app must load safe commercial policies.");
assert(partnerApi.includes("partner-commercial/me/onboarding-payments") && partnerApi.includes("verifyOnboardingPayment"), "Partner app must support recoverable backend-owned fee payments.");
assert(dashboard.includes("Existing onboarding payment recovered") && dashboard.includes("Verify completed payment"), "Payment state must recover after app restart.");
assert(dashboard.includes("Commercial plan") && dashboard.includes("0% KariGO sales/service commission"), "Approved Partner must see the accepted commercial plan.");
assert(earnings.includes("Gross merchandise sales") && earnings.includes("Delivery fee excluded from commission"), "Earnings must present the applicable settlement basis.");
assert(!review.includes("15%") && !earnings.includes("15% commission"), "New Partner terms must not display the generic 15% default.");

console.log("Partner H11.2 regression check passed.");
