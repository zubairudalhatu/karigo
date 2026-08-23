const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const page = fs.readFileSync(path.join(root, "app", "taxi", "page.tsx"), "utf8");
const api = fs.readFileSync(path.join(root, "src", "api", "taxi.api.ts"), "utf8");
const controller = fs.readFileSync(path.resolve(root, "..", "..", "services", "backend-api", "src", "modules", "taxi", "admin-taxi.controller.ts"), "utf8");
const dto = fs.readFileSync(path.resolve(root, "..", "..", "services", "backend-api", "src", "modules", "taxi", "dto", "ride-finance.dto.ts"), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

for (const copy of ["Manual finance override", "Provider commission payments", "Redirect success is not proof of payment", "Platform-funded refunds", "Captain-funded refunds", "Unresolved responsibility"]) {
  assert(page.includes(copy), `Admin H11.1 Finance must include: ${copy}`);
}
assert(page.includes("window.prompt") && page.includes("window.confirm") && page.includes("external evidence"), "Manual override must require reason/evidence and explicit confirmation.");
assert(dto.includes("reason!: string") && dto.includes("@Length(5, 500)"), "Manual override reason must be backend validated.");
assert(api.includes("commissionPaymentHistory") && api.includes("providerReference"), "Safe provider payment history must be wired to Admin.");
assert(controller.includes("finance/commission-payments"), "Admin provider payment history route must exist.");
assert(controller.includes("@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.FINANCE_OFFICER)"), "Manual override must remain restricted to Finance Officer and Super Admin.");
assert(page.includes("canManualFinanceOverride") && page.includes('user?.adminRole === "SUPER_ADMIN"') && page.includes('user?.adminRole === "FINANCE_OFFICER"'), "Manual override must be hidden from non-Finance Admin users.");
assert(!page.includes("KariGO commission due: NGN -"), "Admin Finance must not hard-code a negative commission-due presentation.");

console.log("Admin H11.1 financial hardening regression checks passed.");
