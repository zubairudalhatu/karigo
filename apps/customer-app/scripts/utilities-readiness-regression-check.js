const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const home = fs.readFileSync(path.join(root, "app", "tabs", "home.tsx"), "utf8");
const serviceFlow = fs.readFileSync(path.join(root, "app", "utilities", "[service].tsx"), "utf8");

assert(!home.includes('statusLabel: "Available"'), "Customer Home must not hard-code utility availability.");
assert(home.includes("utilitiesApi.readiness()"), "Customer Home must load backend utility readiness.");
assert(home.includes('utilityReadiness[category.utilityService] !== "AVAILABLE"'), "Unavailable utility tiles must remain blocked.");
assert(home.includes('availability === "AVAILABLE" ? "Available" : "Temporarily unavailable"'), "Only backend AVAILABLE may render as Available.");
assert(home.includes('.catch(() => setUtilityReadiness(unavailableUtilities))'), "Readiness failures must fail closed.");
assert(serviceFlow.includes('quote.recipientVerified ? <Text style={styles.verifiedTitle}>Meter verified</Text>'), "Electricity confirmation must show verified state only after provider validation.");
assert(serviceFlow.includes('<Text style={ui.priceLabel}>Customer:</Text>'), "Provider-returned customer name must appear before purchase confirmation.");
assert(serviceFlow.includes('quote.recipientName'), "Customer identity must come from the provider quote.");
assert(!serviceFlow.includes('Customer name (optional)'), "Customer must not supply or fabricate an electricity account name.");
assert(!serviceFlow.includes('recipientName: recipientName'), "Purchase and quote requests must not send a user-entered account name.");

console.log("Customer Home utility readiness regression checks passed.");
