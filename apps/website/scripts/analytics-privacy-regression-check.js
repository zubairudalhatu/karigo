const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const websiteRoot = path.resolve(__dirname, "..");
const analyticsPath = path.join(websiteRoot, "src/lib/analytics.ts");
const source = fs.readFileSync(analyticsPath, "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const compiled = new Module(analyticsPath, module);
compiled.filename = analyticsPath;
compiled.paths = module.paths;
compiled._compile(output, analyticsPath);
const analytics = compiled.exports;

function read(relativePath) {
  return fs.readFileSync(path.join(websiteRoot, relativePath), "utf8");
}

assert.equal(analytics.parseAnalyticsConsent(null), null);
assert.equal(analytics.parseAnalyticsConsent('{"version":1,"analytics":"accepted"}').analytics, "accepted");
assert.equal(analytics.parseAnalyticsConsent('{"version":2,"analytics":"accepted"}'), null);
assert.equal(analytics.parseAnalyticsConsent('{"version":1,"analytics":"marketing"}'), null);
assert.equal(analytics.serializeAnalyticsConsent("rejected"), '{"version":1,"analytics":"rejected"}');

assert.equal(analytics.normalizeAnalyticsPath("/contact?email=private@example.com#message"), "/contact");
assert.equal(analytics.sanitizePageLocation("https://karigo.com.ng/vendors?token=secret#apply"), "https://karigo.com.ng/vendors");
assert.equal(analytics.sanitizeInternalReferrer("https://external.example/path?secret=1"), undefined);
assert.equal(analytics.sanitizeInternalReferrer("https://karigo.com.ng/services?private=1#x"), "https://karigo.com.ng/services");

for (const route of ["/app", "/app/private", "/payment/flutterwave/return?tx=secret", "/careers/driver/apply", "/auth/login", "/oauth/callback", "/reset-password/token"]) {
  assert.equal(analytics.isAnalyticsRouteAllowed(route), false, `${route} must remain excluded`);
}
assert.equal(analytics.isAnalyticsRouteAllowed("/privacy"), true);

const eligible = { environment: "production", isAutomatedTest: false, measurementId: ["G", "ABCDEF12"].join("-"), consent: "accepted", pathname: "/services" };
assert.equal(analytics.isAnalyticsRuntimeEligible(eligible), true);
assert.equal(analytics.isAnalyticsRuntimeEligible({ ...eligible, consent: null }), false);
assert.equal(analytics.isAnalyticsRuntimeEligible({ ...eligible, consent: "rejected" }), false);
assert.equal(analytics.isAnalyticsRuntimeEligible({ ...eligible, measurementId: "" }), false);
assert.equal(analytics.isAnalyticsRuntimeEligible({ ...eligible, environment: "development" }), false);
assert.equal(analytics.isAnalyticsRuntimeEligible({ ...eligible, isAutomatedTest: true }), false);
assert.equal(analytics.isAnalyticsRuntimeEligible({ ...eligible, pathname: "/app" }), false);

assert.equal(analytics.nextCanonicalPageView(null, "/services?source=a"), "/services");
assert.equal(analytics.nextCanonicalPageView("/services", "/services?source=b#x"), null);
assert.equal(analytics.nextCanonicalPageView("/services", "/privacy"), "/privacy");

assert.deepEqual(
  analytics.prepareAnalyticsEvent("google_play_click", { source_path: "/?email=private", placement: "hero", app_target: "customer_android" }),
  { name: "google_play_click", parameters: { source_path: "/", placement: "hero", app_target: "customer_android" } }
);
for (const [name, parameters] of [
  ["invented_event", { source_path: "/" }],
  ["google_play_click", { source_path: "/", placement: "hero", app_target: "customer_android", email: "private@example.com" }],
  ["google_play_click", { source_path: "/", placement: "hero", app_target: "customer_android", mystery: "value" }],
  ["google_play_click", { source_path: "/", placement: { nested: true }, app_target: "customer_android" }],
  ["google_play_click", { source_path: "/", placement: "x".repeat(97), app_target: "customer_android" }]
]) {
  assert.throws(() => analytics.prepareAnalyticsEvent(name, parameters), analytics.AnalyticsValidationError);
}
for (const sensitiveKey of ["name", "email_address", "phone_number", "address", "message_text", "payment_data", "transaction_reference", "account_id", "record_id", "token", "otp", "document_filename", "document_content"]) {
  assert.throws(
    () => analytics.prepareAnalyticsEvent("customer_app_entry", { source_path: "/", placement: "header", [sensitiveKey]: "blocked" }),
    analytics.AnalyticsValidationError,
    `${sensitiveKey} must be blocked`
  );
}

const loader = read("src/components/google-analytics.tsx");
assert.match(loader, /if \(!eligible\) return null/);
assert.match(loader, /send_page_view:\s*false/);
assert.match(loader, /allow_google_signals:\s*false/);
for (const consentType of ["ad_storage", "ad_user_data", "ad_personalization"]) {
  assert.match(loader, new RegExp(`${consentType}:\\s*"denied"`));
}
assert.doesNotMatch(loader, /window\.location\.(?:href|search|hash)/);

const consent = read("src/components/analytics-consent.tsx");
assert.equal((consent.match(/className="analytics-consent-action"/g) ?? []).length, 2);
assert.match(consent, /Reject analytics/);
assert.match(consent, /Accept analytics/);
assert.match(consent, /Cookie settings/);
assert.match(consent, /ref=\{firstActionRef\}[\s\S]*Reject analytics/);
assert.match(consent, /setChoice\(nextChoice\)/);

const layout = read("app/layout.tsx");
const styles = read("app/globals.css");
assert.match(layout, /<AnalyticsConsentProvider>/);
assert.match(layout, /<GoogleAnalytics \/>/);
assert.match(styles, /@media \(max-width: 700px\)/);
assert.match(styles, /\.analytics-consent-action:focus-visible/);

const envExample = read(".env.example");
assert.match(envExample, /^NEXT_PUBLIC_GA_MEASUREMENT_ID=$/m);
assert.doesNotMatch(envExample, /NEXT_PUBLIC_GA_MEASUREMENT_ID=G-/);

const privacy = read("app/privacy/page.tsx");
for (const required of ["Website analytics and cookies", "sanitized page path", "coarse geographic information", "withdraw consent", "transaction references", "uploaded documents"]) {
  assert.ok(privacy.includes(required), `privacy notice must include: ${required}`);
}

const changedSources = [
  "app/layout.tsx",
  "src/components/google-analytics.tsx",
  "src/components/analytics-consent.tsx",
  "src/lib/analytics.ts"
].map(read).join("\n");
assert.doesNotMatch(changedSources, /G-[A-Z0-9]{6,20}/, "no real GA measurement ID may be committed");

console.log("Analytics privacy regression checks passed.");
