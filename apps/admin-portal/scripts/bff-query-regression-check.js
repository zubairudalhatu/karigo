const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const helperPath = path.join(root, "src", "lib", "bff-url.ts");
const source = fs.readFileSync(helperPath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const helperModule = { exports: {} };
new Function("exports", "module", compiled)(helperModule.exports, helperModule);
const { buildBffUpstreamUrl } = helperModule.exports;

const baseUrl = "https://backend.example/api/v1";
const cases = [
  {
    path: "admin/production-launch/quick-launch/customers",
    search: "?city=ABUJA&query=&readiness=ALL&page=1",
    expected: { city: "ABUJA", query: "", readiness: "ALL", page: "1" }
  },
  {
    path: "admin/production-launch/quick-launch/captains",
    search: "?city=ABUJA&serviceType=RIDES&query=&readiness=ALL&capability=ALL&page=1",
    expected: { city: "ABUJA", serviceType: "RIDES", query: "", readiness: "ALL", capability: "ALL", page: "1" }
  },
  {
    path: "admin/production-launch/quick-launch/partners",
    search: "?city=KANO&serviceType=MARKETPLACE&query=08033686696&readiness=ALL&capability=ALL&page=2&pageSize=25",
    expected: { city: "KANO", serviceType: "MARKETPLACE", query: "08033686696", readiness: "ALL", capability: "ALL", page: "2", pageSize: "25" }
  }
];

for (const testCase of cases) {
  const upstream = buildBffUpstreamUrl(baseUrl, testCase.path, testCase.search);
  assert.equal(upstream.origin, "https://backend.example");
  assert.equal(upstream.pathname, `/api/v1/${testCase.path}`);
  for (const [key, value] of Object.entries(testCase.expected)) {
    assert.equal(upstream.searchParams.get(key), value, `${key} must be forwarded exactly`);
    assert.equal(upstream.searchParams.getAll(key).length, 1, `${key} must not be duplicated`);
  }
}

const customerBrowse = buildBffUpstreamUrl(
  baseUrl,
  "admin/production-launch/quick-launch/customers",
  "?city=ABUJA&query=&readiness=ALL&page=1"
);
assert.equal(customerBrowse.searchParams.has("query"), true, "Browse must forward an explicit empty query.");
assert.equal(customerBrowse.searchParams.has("pageSize"), false, "An omitted pageSize must remain omitted.");
assert.equal(customerBrowse.searchParams.get("city"), "ABUJA", "City must not become a URL, object, array or full query string.");

const bffSession = fs.readFileSync(path.join(root, "src", "lib", "bff-session.ts"), "utf8");
assert(bffSession.includes("request.nextUrl.search"), "Admin BFF must pass the browser query string to the backend URL builder.");
assert(bffSession.includes("buildBffUpstreamUrl"), "Admin BFF must use the regression-tested URL builder.");

const productionLaunchApi = fs.readFileSync(path.join(root, "src", "api", "production-launch.api.ts"), "utf8");
assert(productionLaunchApi.includes("api.get<QuickLaunchDiscoveryPage>"), "Candidate APIs must use the shared data-envelope unwrapping convention.");
assert(!productionLaunchApi.includes("data.data.items"), "Candidate APIs must not double-unwrap successful response data.");

const quickLaunchPage = fs.readFileSync(path.join(root, "app", "production-launch", "page.tsx"), "utf8");
assert(quickLaunchPage.includes("Unable to load {accountLabel} accounts."), "Each selector must display its own safe API error.");
assert(quickLaunchPage.includes("onRetry"), "Each failed selector must provide Retry.");
assert(quickLaunchPage.includes("candidateRequests.customer.error") && quickLaunchPage.includes("candidateRequests.captain.error") && quickLaunchPage.includes("candidateRequests.partner.error"), "Customer, Captain and Partner errors must remain isolated.");
assert(quickLaunchPage.includes("Authoritative {accountLabel} source returned {sourceCount} account(s), but Browse returned none."), "Nonzero authoritative sources must not fail browse silently.");
assert(!quickLaunchPage.includes("loading={loadingCandidates}"), "Selectors must not share an all-or-nothing loading/error state.");

console.log("Admin BFF Quick Launch query regression checks passed.");
