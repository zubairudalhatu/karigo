const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const payoutPage = read("app", "payout-accounts", "page.tsx");
assert(payoutPage.includes("Payout Accounts"), "Admin portal must expose payout accounts page.");
assert(payoutPage.includes("Pending review"), "Admin payout page must show pending review summary.");
assert(payoutPage.includes("Verified accounts"), "Admin payout page must show verified summary.");
assert(payoutPage.includes("Needs update"), "Admin payout page must show needs-update summary.");
assert(payoutPage.includes("Rejected accounts"), "Admin payout page must show rejected summary.");
assert(payoutPage.includes("Full account number"), "Full account number must only appear in the review detail panel.");
assert(payoutPage.includes("window.confirm"), "Admin payout status changes must require confirmation.");
assert(!payoutPage.includes("Transfer funds") && !payoutPage.includes("Pay now"), "Admin payout page must not expose transfer controls.");

const payoutApi = read("src", "api", "vendor-payout-accounts.api.ts");
assert(payoutApi.includes("admin/vendor-payout-accounts"), "Admin portal must call admin payout account endpoints.");
assert(payoutApi.includes("maskedAccountNumber"), "Admin list data must use masked account number.");
assert(payoutApi.includes("accountNumber: string"), "Admin detail type must explicitly model full account number.");

const shell = read("src", "components", "portal.tsx");
assert(shell.includes("Payout Accounts"), "Admin sidebar must include payout accounts.");
assert(shell.includes("Utilities"), "Admin sidebar must include Utilities.");
assert(shell.includes("Taxi"), "Admin sidebar must include Taxi readiness.");
assert(shell.includes("SME Services"), "Admin sidebar must include SME Services.");
assert(shell.includes("SME Providers"), "Admin sidebar must include SME provider directory.");

const smeServicesPage = read("app", "sme-services", "page.tsx");
assert(smeServicesPage.includes("SME Services"), "Admin SME Services list page must exist.");
assert(smeServicesPage.includes("does not dispatch providers"), "Admin SME Services list must state safe review-only limits.");
assert(smeServicesPage.includes("smeServicesApi.list"), "Admin SME Services page must call the list endpoint.");
assert(smeServicesPage.includes("Total requests"), "Admin SME Services page must show summary cards.");
assert(smeServicesPage.includes("All service types"), "Admin SME Services page must support service-type filtering.");
assert(smeServicesPage.includes("Provider directory"), "Admin SME Services page must link to provider directory.");
const smeServicesDetail = read("app", "sme-services", "[id]", "page.tsx");
assert(smeServicesDetail.includes("Update review status"), "Admin SME Services detail must support status updates.");
assert(smeServicesDetail.includes("does not dispatch a provider, collect payment or activate medical booking"), "Admin SME Services status update must confirm safe limits.");
assert(smeServicesDetail.includes("Record manual assignment"), "Admin SME Services detail must support manual provider assignment.");
assert(smeServicesDetail.includes("does not notify or dispatch the provider automatically"), "Manual assignment must state it is not live dispatch.");
assert(!smeServicesDetail.includes("Pay Now") && !smeServicesDetail.includes("Transfer funds"), "Admin SME Services must not expose payment actions.");
const smeProvidersPage = read("app", "sme-services", "providers", "page.tsx");
assert(smeProvidersPage.includes("SME Services provider directory"), "Admin provider directory page must exist.");
assert(smeProvidersPage.includes("Create provider record"), "Admin provider directory must support provider record creation.");
assert(smeProvidersPage.includes("Provider could not be created. Please check the required fields and try again."), "Admin provider creation must show a form-specific validation error.");
assert(smeProvidersPage.includes("Service provider record has been created."), "Admin provider creation must show the approved success message.");
assert(smeProvidersPage.includes("friendlyError(e, \"form\")"), "Admin provider creation must surface safe API form errors.");
assert(smeProvidersPage.includes("does not create provider login, live dispatch, payment collection, payout automation or medical booking"), "Admin provider directory must state safety limits.");
const smeProviderDetail = read("app", "sme-services", "providers", "[id]", "page.tsx");
assert(smeProviderDetail.includes("Edit provider"), "Admin provider detail must support provider record editing.");
assert(smeProviderDetail.includes("Customers do not receive provider phone numbers"), "Provider detail must document customer contact privacy.");
assert(!smeProviderDetail.includes("Pay Now") && !smeProviderDetail.includes("Transfer funds"), "Provider directory must not expose payment actions.");
const smeServicesApiSource = read("src", "api", "sme-services.api.ts");
assert(smeServicesApiSource.includes("admin/service-provider-requests"), "Admin portal must call admin SME Services endpoints.");
assert(smeServicesApiSource.includes("admin/service-provider-requests/${id}/status"), "Admin portal must call the SME Services status endpoint.");
assert(smeServicesApiSource.includes("admin/service-provider-requests/${id}/provider-assignment"), "Admin portal must call the SME Services assignment endpoint.");
assert(smeServicesApiSource.includes("admin/service-providers"), "Admin portal must call admin SME Services provider endpoints.");

const taxiPage = read("app", "taxi", "page.tsx");
assert(taxiPage.includes("Driver Applications"), "Admin taxi page must show driver applications.");
assert(taxiPage.includes("Customer Waitlist"), "Admin taxi page must show customer waitlist.");
assert(taxiPage.includes("Driver Profiles"), "Admin taxi page must show driver profiles.");
assert(taxiPage.includes("Test Taxi Trips"), "Admin taxi page must show staging test trips.");
assert(taxiPage.includes("Taxi Summary"), "Admin taxi page must show Taxi summary.");
assert(taxiPage.includes("does not perform live dispatch, maps billing or payment capture"), "Admin taxi page must state staging-only limits.");
assert(taxiPage.includes("Taxi driver readiness review saved"), "Admin taxi page must support driver readiness review.");
assert(taxiPage.includes("Create Test Driver Profile"), "Admin taxi page must create staging driver profiles from applications.");
assert(taxiPage.includes("Assign Driver"), "Admin taxi page must support manual staging driver assignment.");
assert(taxiPage.includes("Cancel Test Trip"), "Admin taxi page must support staging trip cancellation.");
assert(!taxiPage.includes("Assign ride") && !taxiPage.includes("Dispatch taxi") && !taxiPage.includes("Pay Now"), "Admin taxi page must not expose live taxi dispatch or payment actions.");
const taxiApi = read("src", "api", "taxi.api.ts");
assert(taxiApi.includes("admin/taxi/driver-applications"), "Admin taxi API must call driver application endpoints.");
assert(taxiApi.includes("admin/taxi/waitlist"), "Admin taxi API must call waitlist endpoints.");
assert(taxiApi.includes("admin/taxi/driver-profiles"), "Admin taxi API must call staging driver profile endpoints.");
assert(taxiApi.includes("admin/taxi/trips"), "Admin taxi API must call staging trip endpoints.");
assert(taxiApi.includes("admin/taxi/summary"), "Admin taxi API must call staging summary endpoint.");

const utilitiesPage = read("app", "utilities", "page.tsx");
assert(utilitiesPage.includes("Test-mode utility transaction monitoring"), "Admin utilities page must clearly state test mode.");
assert(utilitiesPage.includes("Total transactions"), "Admin utilities page must show summary cards.");
assert(utilitiesPage.includes("Reference") && utilitiesPage.includes("Provider") && utilitiesPage.includes("Status"), "Admin utilities table must show core columns.");
assert(utilitiesPage.includes("Update this mock utility transaction status?"), "Admin utility status override must require confirmation.");
assert(!utilitiesPage.includes("Fulfil") && !utilitiesPage.includes("Send token"), "Admin utilities page must not expose live fulfilment actions.");
const utilitiesApi = read("src", "api", "utilities.api.ts");
assert(utilitiesApi.includes("admin/utilities/summary"), "Admin utilities API must load summary.");
assert(utilitiesApi.includes("admin/utilities/transactions"), "Admin utilities API must load transactions.");

console.log("Admin portal staging regression checks passed.");
