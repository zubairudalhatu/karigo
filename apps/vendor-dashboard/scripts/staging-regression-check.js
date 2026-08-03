const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const authClient = read("src", "api", "client.ts");
assert(authClient.includes('baseUrl: "/api/bff"'), "Partner API client must use the same-origin BFF route.");
assert(authClient.includes("karigo_vendor_csrf"), "Partner API client must attach the CSRF cookie header.");
assert(!authClient.includes("localStorage") && !authClient.includes("sessionStorage"), "Partner API client must not store JWTs in browser storage.");
assert(!authClient.includes("karigo_vendor_access_token") && !authClient.includes("karigo_vendor_refresh_token"), "Partner API client must not reference old browser token keys.");
assert(!authClient.includes("tokenStore") && !authClient.includes("refreshTokenStore"), "Partner API client must not expose browser token stores.");
const authContext = read("src", "contexts", "auth-context.tsx");
assert(!authContext.includes("tokenStore") && !authContext.includes("refreshTokenStore"), "Partner auth context must not persist tokens in browser storage.");
assert(authContext.includes("authApi.logout()"), "Partner logout must call the BFF logout endpoint so HttpOnly cookies are cleared.");
assert(!authContext.includes("result.accessToken"), "Partner login must not require browser-readable access tokens from the sanitized BFF response.");
assert(authContext.includes("setUser(result.user)"), "Partner login must use the sanitized BFF user payload after HttpOnly session cookies are set.");
assert(authContext.includes("vendorApi.capabilities"), "Partner auth context must confirm capability-backed Workspace access after login and bootstrap.");
assert(authContext.includes("canAccessWorkspace"), "Partner auth context must require active Partner Workspace access.");
assert(!authContext.includes('result.user.role !== "VENDOR"'), "Partner auth context must not reject approved unified accounts solely by base role.");
assert(authContext.includes("This account is not active for Partner Workspace access."), "Partner login must show a safe workspace-authorisation message.");
const authApiSource = read("src", "api", "auth.api.ts");
assert(!authApiSource.includes("accessToken") && !authApiSource.includes("refreshToken"), "Partner auth API type must not model browser-readable login tokens.");
assert(authApiSource.includes("LoginVerificationRequiredResult"), "Partner auth API type must handle verification-required login responses safely.");
const activationPage = read("app", "activate", "page.tsx");
assert(!activationPage.includes("tokenStore") && !activationPage.includes("refreshTokenStore"), "Partner activation must not write tokens to browser storage.");
const bffSession = read("src", "lib", "bff-session.ts");
const bffRoute = read("app", "api", "bff", "[...path]", "route.ts");
assert(bffRoute.includes("handleBffRequest"), "Partner Workspace must expose the BFF catch-all route.");
assert(bffSession.includes("vendors/capabilities"), "Partner BFF must verify Partner Workspace capability before creating a session.");
assert(bffSession.includes("canAccessWorkspace"), "Partner BFF must require active Partner profile access rather than hardcoded account role.");
assert(bffSession.includes("PORTAL_PARTNER_PENDING") && bffSession.includes("PORTAL_PARTNER_NO_PROFILE"), "Partner BFF must return safe Partner access rejection codes.");
assert(!bffSession.includes('const REQUIRED_ROLE = "VENDOR"'), "Partner BFF must not reject unified Partner accounts solely because their base role is not VENDOR.");
assert(bffSession.includes("httpOnly: true"), "Partner BFF must store access and refresh tokens in HttpOnly cookies.");
assert(bffSession.includes("secure: cookieSecure()"), "Partner BFF cookies must be Secure outside local development.");
assert(bffSession.includes("sameSite: sameSite()"), "Partner BFF cookies must set SameSite protection.");
assert(bffSession.includes('"x-karigo-csrf"'), "Partner BFF must validate the CSRF header.");
assert(bffSession.includes("CSRF_ORIGIN_REJECTED") && bffSession.includes("CSRF_TOKEN_REJECTED"), "Partner BFF must reject unsafe origin or token checks.");
assert(bffSession.includes("/auth/refresh"), "Partner BFF must refresh sessions server-side only.");
assert(bffSession.includes("sanitizePayload"), "Partner BFF must strip JWT fields from browser responses.");
assert(bffSession.includes("isPlainRecord") && bffSession.includes("!Array.isArray"), "Partner BFF sanitizer must preserve array collection payloads.");
assert(bffSession.includes("BFF_BACKEND_UNAVAILABLE"), "Partner BFF must return a safe backend-unavailable login error.");
assert(bffSession.includes("BFF_BACKEND_NON_JSON"), "Partner BFF must safely handle non-JSON backend responses.");
assert(bffSession.includes("BFF_SESSION_USER_MISSING"), "Partner BFF must reject token payloads without a user profile.");
assert(bffSession.includes("API_BASE_URL") && bffSession.includes("NEXT_PUBLIC_API_BASE_URL"), "Partner BFF must document and use production backend URL env names.");
assert(bffSession.includes("productionPortal"), "Partner BFF must guard missing backend API URL in production deployments.");
const vendorApiSourceForSession = read("src", "api", "vendor.api.ts");
assert(vendorApiSourceForSession.includes('fetch("/api/bff/vendors/uploads"'), "Partner uploads must use the same-origin BFF route.");
assert(!vendorApiSourceForSession.includes("Authorization"), "Partner upload code must not attach browser-visible bearer tokens.");

const settlementsPage = read("app", "settlements", "page.tsx");
assert(settlementsPage.includes("settlementsApi.list"), "Settlements page must call vendor settlement API.");
assert(settlementsPage.includes("Total settlements"), "Settlements page must show total summary card.");
assert(settlementsPage.includes("Pending payout"), "Settlements page must show pending payout summary.");
assert(settlementsPage.includes("Paid out"), "Settlements page must show paid-out summary.");
assert(settlementsPage.includes("No settlements yet. Completed and eligible orders will appear here."), "Settlements page must show the approved empty state.");
assert(!settlementsPage.includes("mark paid") && !settlementsPage.includes("markVendorPaid"), "Vendor settlement page must not expose admin payout actions.");

const settlementsApi = read("src", "api", "settlements.api.ts");
assert(settlementsApi.includes("vendor/settlements"), "Vendor dashboard must use the vendor-scoped settlement endpoint.");
assert(settlementsApi.includes("VendorSettlementFilter"), "Vendor settlements API must expose safe filters.");

const payoutPage = read("app", "payout-account", "page.tsx");
assert(payoutPage.includes("Set up your payout account"), "Payout account page must include setup copy.");
assert(payoutPage.includes("Update payout account"), "Payout account page must support vendor updates.");
assert(payoutPage.includes("KariGO is reviewing your payout account details."), "Payout account page must show pending verification state.");
assert(payoutPage.includes("maskedAccountNumber"), "Payout account page must display masked account details.");
assert(!payoutPage.includes("Transfer funds") && !payoutPage.includes("Pay now"), "Vendor payout page must not expose transfer controls.");

const payoutApi = read("src", "api", "payout-account.api.ts");
assert(payoutApi.includes("vendor/payout-account"), "Vendor payout account API must use vendor-scoped endpoints.");
assert(!payoutApi.includes("admin/vendor-payout-accounts"), "Vendor dashboard must not call admin payout-account endpoints.");

const shell = read("src", "components", "dashboard.tsx");
assert(shell.includes("Payout account"), "Vendor sidebar must include the payout account page.");
assert(shell.includes("Services"), "Vendor sidebar must include the services catalogue page.");
assert(shell.includes("Ads"), "Vendor sidebar must include the ads page.");
assert(shell.includes("Partner workspace"), "Vendor shell must use Partner Workspace copy.");
assert(shell.includes("KariGO Partner Workspace"), "Vendor shell must expose KariGO Partner Workspace branding.");

const dashboardPage = read("app", "page.tsx");
assert(dashboardPage.includes("Your partner profile is not active."), "Partner dashboard must show a friendly missing-profile state.");
assert(dashboardPage.includes("Start Partner Onboarding"), "Missing-profile state must link to onboarding.");
assert(dashboardPage.includes("Contact Support"), "Missing-profile state must expose support contact action.");
assert(dashboardPage.includes("Only KariGO Admin can restore, approve or reactivate closed partner records."), "Missing-profile state must not self-restore closed partner records.");
const appErrorBoundary = read("app", "error.tsx");
assert(appErrorBoundary.includes("Your workspace could not be loaded."), "Partner Workspace must include a safe render error boundary.");
assert(appErrorBoundary.includes("Retry") && appErrorBoundary.includes("Return to login"), "Partner error boundary must expose recovery actions.");
assert(!appErrorBoundary.includes("error.stack"), "Partner error boundary must not expose stack traces to users.");

const loginPage = read("app", "login", "page.tsx");
assert(loginPage.includes("Partner Workspace login"), "Partner login page must use Partner Workspace copy.");
assert(loginPage.includes("/register"), "Partner login page must link new partners to onboarding choice.");
const registerPage = read("app", "register", "page.tsx");
["Product Seller", "Service Provider", "Both"].forEach((type) => assert(registerPage.includes(type), `Partner registration page must include ${type}.`));
assert(registerPage.includes("https://www.karigo.com.ng/vendors/apply?partnerType=product-seller"), "Partner registration must route product sellers to vendor application.");
assert(registerPage.includes("https://www.karigo.com.ng/vendors/apply?partnerType=service-provider"), "Partner registration must route service providers to vendor application.");
assert(registerPage.includes("https://www.karigo.com.ng/vendors/apply?partnerType=both"), "Partner registration must route mixed partners to vendor application.");
assert(registerPage.includes("No live dispatch, payouts, legal advice automation"), "Partner registration must state operational guardrails.");

const notificationsPage = read("app", "notifications", "page.tsx");
assert(notificationsPage.includes("notification-title"), "Notifications must render title separately.");
assert(notificationsPage.includes("notification-message"), "Notifications must render message separately.");
assert(notificationsPage.includes("notification-time"), "Notifications must render timestamp separately.");
assert(notificationsPage.includes("markRead"), "Notification read behavior must be preserved.");
assert(notificationsPage.includes("markAllRead"), "Mark-all-read behavior must be preserved.");

const css = read("app", "globals.css");
assert(css.includes(".notification-message"), "Notification message styling must exist.");
assert(css.includes("overflow-wrap: anywhere"), "Long notification references must wrap safely.");
assert(css.includes(".settlement-card"), "Settlement card styling must exist.");

const productsPage = read("app", "products", "page.tsx");
assert(productsPage.includes("productsApi.listMine"), "Products page must use vendor-scoped product listing.");
assert(productsPage.includes("productsApi.create"), "Products page must support product creation.");
assert(productsPage.includes("productsApi.update("), "Products page must support product editing.");
assert(productsPage.includes("productsApi.updateAvailability"), "Products page must support availability toggles.");
assert(productsPage.includes("productsApi.archive"), "Products page must support safe archive.");
assert(productsPage.includes("Vendor catalogue"), "Products page must show the polished vendor catalogue eyebrow.");
assert(productsPage.includes("SME Services vendors should use the Services workspace."), "Products page must route SME Services vendors to the services workspace.");
assert(productsPage.includes("Only active, approved product-selling partners can create, update, publish or archive products."), "Products page must show inactive/suspended partner restriction copy.");
assert(productsPage.includes("validateForm"), "Products page must validate product input before submitting.");
assert(productsPage.includes("Use a valid HTTPS JPG, PNG or WebP product image."), "Products page must validate image URL policy.");
assert(productsPage.includes("actioningProductId"), "Products page must disable duplicate product actions while processing.");
assert(!productsPage.includes("> Featured</label>"), "Products page must not allow vendors to self-feature products.");
assert(productsPage.includes("Options & add-ons"), "Products page must expose an options and add-ons section.");
assert(productsPage.includes("Add option group"), "Products page must let vendors add option groups.");
assert(productsPage.includes("priceAdjustmentKobo"), "Product options must use integer kobo price adjustments.");
assert(productsPage.includes("Upload product image"), "Products page must expose device image upload.");
assert(productsPage.includes("Total products"), "Products page must show total product summary.");
assert(productsPage.includes("Available products"), "Products page must show available product summary.");
assert(productsPage.includes("Unavailable products"), "Products page must show unavailable product summary.");

const productsApi = read("src", "api", "products.api.ts");
assert(productsApi.includes("vendor/products"), "Vendor dashboard product API must use vendor-owned endpoints.");
assert(productsApi.includes("VendorProductInput"), "Vendor dashboard product API must use shared product input types.");
assert(productsApi.includes("VendorProductAvailabilityInput"), "Vendor dashboard product API must use shared availability types.");
assert(productsApi.includes("query.set(\"category\""), "Vendor dashboard product filters must use the public category query alias.");

assert(css.includes(".product-layout"), "Product management layout styling must exist.");
assert(css.includes(".product-preview"), "Image preview styling must exist.");
assert(css.includes(".options-panel"), "Options and add-ons panel styling must exist.");
assert(css.includes(".option-group"), "Option group styling must exist.");
assert(css.includes(".option-grid"), "Option row grid styling must exist.");
assert(css.includes(".file-drop"), "Upload control styling must exist.");

const servicesPage = read("app", "services", "page.tsx");
assert(servicesPage.includes("vendorApi.services"), "Services page must load vendor-owned services.");
assert(servicesPage.includes("vendorApi.createService"), "Services page must support service creation.");
assert(servicesPage.includes("vendorApi.updateService"), "Services page must support service editing.");
assert(servicesPage.includes("vendorApi.archiveService"), "Services page must support safe service archiving.");
assert(servicesPage.includes("SME Services vendors"), "Services page must clearly identify SME Services workflow.");
assert(servicesPage.includes("does not activate automatic dispatch"), "Services page must preserve dispatch/payment guardrail copy.");
assert(servicesPage.includes("HEALTH_PROFESSIONAL"), "Services page must handle health professional readiness-only services.");
["Printing", "Car hire", "Laundry", "Lesson teacher", "Legal practitioner", "Rent a car"].forEach((label) => assert(servicesPage.includes(label), `Services page must label ${label}.`));

const onboardingPage = read("app", "onboarding", "page.tsx");
assert(onboardingPage.includes("Partner onboarding"), "Vendor onboarding page must use Partner onboarding copy.");
assert(onboardingPage.includes("Product sellers and SME service providers may be asked for different evidence"), "Partner onboarding must explain account-type evidence differences.");
assert(onboardingPage.includes("SERVICE_PROVIDER_EVIDENCE"), "Partner onboarding must support service-provider evidence documents.");
assert(onboardingPage.includes("PORTFOLIO_OR_WORK_SAMPLE"), "Partner onboarding must support portfolio/work sample documents.");

const vendorApi = read("src", "api", "vendor.api.ts");
assert(vendorApi.includes("vendors/uploads"), "Vendor API must include vendor-scoped upload endpoint.");
assert(vendorApi.includes("vendors/services"), "Vendor API must include vendor-scoped service catalogue endpoints.");

const adsPage = read("app", "ads", "page.tsx");
assert(adsPage.includes("Ads"), "Vendor ads page must exist.");
assert(adsPage.includes("adsApi.dashboard"), "Vendor ads page must load vendor campaigns and controlled ad credit.");
assert(adsPage.includes("adsApi.create"), "Vendor ads page must submit ad requests.");
assert(adsPage.includes("KariGO Admin approval is required"), "Vendor ads page must state admin approval is required.");
assert(adsPage.includes("does not charge your wallet or collect real money"), "Vendor ads page must state no live ad billing.");
assert(!adsPage.includes("Pay now") && !adsPage.includes("Top up wallet"), "Vendor ads page must not expose live ad payment actions.");
const adsApiSource = read("src", "api", "ads.api.ts");
assert(adsApiSource.includes("vendor/ads"), "Vendor ads API must call vendor-scoped ad endpoints.");

const profilePage = read("app", "profile", "page.tsx");
assert(profilePage.includes("profileUpdatePayload"), "Profile page must sanitize profile update payloads before saving.");
assert(profilePage.includes("vendorApi.update(profileUpdatePayload(profile))"), "Profile save must not send hydrated vendor profile objects.");
assert(profilePage.includes("friendlyError(err, \"form\")"), "Profile save errors must show form-level API messages.");
assert(profilePage.includes("disabled={saving || Boolean(uploading)}"), "Profile save must be disabled while uploads or saves are in progress.");

console.log("Vendor dashboard staging regression checks passed.");
