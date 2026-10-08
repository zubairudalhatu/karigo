const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const home = fs.readFileSync(path.join(root, "app", "tabs", "home.tsx"), "utf8");

assert(!home.includes('statusLabel: "Available"'), "Customer Home must not hard-code utility availability.");
assert(home.includes("utilitiesApi.readiness()"), "Customer Home must load backend utility readiness.");
assert(home.includes('utilityReadiness[category.utilityService] !== "AVAILABLE"'), "Unavailable utility tiles must remain blocked.");
assert(home.includes('availability === "AVAILABLE" ? "Available" : "Temporarily unavailable"'), "Only backend AVAILABLE may render as Available.");
assert(home.includes('.catch(() => setUtilityReadiness(unavailableUtilities))'), "Readiness failures must fail closed.");

console.log("Customer Home utility readiness regression checks passed.");
