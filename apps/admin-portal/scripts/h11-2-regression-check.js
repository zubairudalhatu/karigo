const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const shell = read("src", "components", "portal.tsx");
const api = read("src", "api", "partner-commercial.api.ts");
const policies = read("app", "partner-commercial", "page.tsx");
const applications = read("app", "vendor-applications", "page.tsx");
const vendors = read("app", "vendors", "page.tsx");

assert(shell.includes("Partner Commercial"), "Admin navigation must expose Partner commercial policies.");
assert(api.includes("admin/partner-commercial/policies") && api.includes('method: "PUT"'), "Admin policy API must create a new policy version.");
assert(policies.includes("window.confirm") && policies.includes("Existing accepted agreements will not be changed"), "Policy changes must require confirmation and explain snapshot immutability.");
assert(policies.includes("FEE NOT CONFIGURED") && policies.includes("Leave blank: FEE NOT CONFIGURED"), "Admin must distinguish missing fee from explicit zero.");
assert(policies.includes("commissionRateBasisPoints") && policies.includes("onboardingFeeKobo") && policies.includes("policyVersion"), "Admin editor must expose all launch commercial controls.");
assert(applications.includes("Accepted commercial agreement") && applications.includes("Provider-verified onboarding fee paid"), "Application review must show agreement and payment state.");
assert(applications.includes("Activation blocked") && applications.includes("approved onboarding documents"), "Application review must expose independent activation blockers.");
assert(vendors.includes("Current accepted commercial agreement") && vendors.includes("read-only"), "Active Partner view must show immutable commercial terms.");

console.log("Admin H11.2 regression check passed.");
