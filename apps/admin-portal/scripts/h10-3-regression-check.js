const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const page = fs.readFileSync(path.join(root, "app", "taxi", "page.tsx"), "utf8");
const api = fs.readFileSync(path.join(root, "src", "api", "taxi.api.ts"), "utf8");
const controller = fs.readFileSync(path.resolve(root, "..", "..", "services", "backend-api", "src", "modules", "taxi", "admin-taxi.controller.ts"), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(page.includes("Receipt email:") && page.includes("maskedRecipientEmail") && page.includes("attemptCount"), "Admin must show safe receipt-email state.");
assert(page.includes("window.confirm") && page.includes("Retry receipt email"), "Admin retry must require confirmation.");
assert(api.includes("receipt-email/retry"), "Admin client must use the protected retry endpoint.");
assert(controller.includes("@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.SUPPORT_AGENT)"), "Retry endpoint must exclude unauthorized Admin roles.");

console.log("Admin H10.3 regression checks passed.");
