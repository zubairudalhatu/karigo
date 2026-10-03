const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const schema = read("services", "backend-api", "prisma", "schema.prisma");
for (const model of ["AdCampaignRevision", "AdCreativeAsset", "AdCampaignEvent", "AdCampaignAuditEvent", "PhoneChangeRequest", "AccountSecurityEvent"]) {
  assert(schema.includes(`model ${model}`), `${model} must remain in the Prisma schema`);
}
for (const status of ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED", "APPROVED", "SCHEDULED", "ACTIVE", "PAUSED", "COMPLETED", "EXPIRED", "REJECTED", "CANCELLED"]) {
  assert(schema.includes(status), `Ads lifecycle must retain ${status}`);
}

const policy = read("services", "backend-api", "src", "modules", "ads", "ad-policy.ts");
assert(policy.includes("AD_STATUS_TRANSITIONS"), "Ads must use explicit state transitions");
assert(policy.includes('url.protocol !== "https:"'), "Ad destinations must require HTTPS");
assert(!policy.includes("javascript:") && !policy.includes("data:"), "Ads policy must not allow scripted destination schemes");

const creative = read("services", "backend-api", "src", "modules", "ads", "ad-creative.service.ts");
assert(creative.includes("AD_CREATIVE_MAX_BYTES"), "Creative uploads must have a server-side size cap");
assert(creative.includes("stripJpegMetadata"), "Creative uploads must strip supported metadata");
assert(creative.includes("Production ad-creative storage has not been provisioned"), "Production must fail closed before dedicated storage exists");

const ads = read("services", "backend-api", "src", "modules", "ads", "ads.service.ts");
assert(ads.includes("approvedRevisionId"), "Delivery must resolve an approved revision");
assert(ads.includes("dedupeKeyHash"), "Ad event recording must deduplicate without customer identifiers");
assert(ads.includes("campaign.spentKobo >= campaign.requestedBudgetKobo"), "Budget-exhausted campaigns must be suppressed");
assert(ads.includes("vendorId: vendor.id"), "Vendor reads and edits must remain tenant scoped");

const phone = read("services", "backend-api", "src", "modules", "auth", "phone-change.service.ts");
for (const marker of ["currentPassword", "otp.verify", "$transaction", "refreshToken.updateMany", "phone_change.completed", "sensitiveActionsHoldUntil"]) {
  assert(phone.includes(marker), `Phone-change security control missing: ${marker}`);
}

const vendorAds = read("apps", "vendor-dashboard", "app", "ads", "page.tsx");
for (const marker of ["Ads Manager", "Upload creative image", "Impressions", "Clicks", "CTR", "Edit / new revision", "KariGO Admin approval is required"]) {
  assert(vendorAds.includes(marker), `Vendor Ads Manager marker missing: ${marker}`);
}

const adminAds = read("apps", "admin-portal", "app", "ads", "page.tsx");
assert(adminAds.includes("adsApi.action"), "Admin must use governed actions");
assert(adminAds.includes("adsApi.update"), "Admin must retain audited content editing");
assert(!adminAds.includes("set status directly"), "Admin UI must not offer arbitrary direct status mutation");

for (const file of [
  ["apps", "website", "src", "components", "customer-web-portal.tsx"],
  ["apps", "customer-app", "app", "profile", "change-phone.tsx"],
  ["apps", "rider-app", "app", "phone-change.tsx"],
  ["apps", "partner-app", "app", "profile", "change-phone.tsx"],
  ["apps", "vendor-dashboard", "app", "profile", "page.tsx"]
]) {
  const source = read(...file);
  assert(source.toLowerCase().includes("change phone") || source.toLowerCase().includes("change verified account phone"), `${file.join("/")} must expose a guided phone-change flow`);
}

const css = read("apps", "website", "app", "globals.css");
const customerTypography = css.slice(css.indexOf("/* Customer Web uses"), css.indexOf("@media", css.indexOf("/* Customer Web uses")));
assert(customerTypography.includes("font-weight: 400") && customerTypography.includes("font-weight: 600") && customerTypography.includes("font-weight: 700"), "Customer Web must preserve the normalized typography hierarchy");
assert(!customerTypography.includes("font-weight: 900"), "Customer Web overrides must not retain 900-weight typography");
assert(css.includes("@media (max-width: 980px)") && css.includes("@media (max-width: 620px)"), "Customer Web must retain tablet and mobile responsive breakpoints covering the requested viewports");

console.log("Ads Manager, phone identity and Customer Web typography regression checks passed.");
