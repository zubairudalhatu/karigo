const fs = require("node:fs");
const path = require("node:path");

const appRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(appRoot, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(read(relativePath));

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const packageJson = readJson("package.json");
const easJson = readJson("eas.json");
const appConfig = read("app.config.ts");
const rootLayout = read("app/_layout.tsx");
const apiClient = read("src/api/client.ts");
const authContext = read("src/contexts/auth-context.tsx");
const loginScreen = read("app/auth/login.tsx");
const applicationScreen = read("app/auth/apply.tsx");
const dashboard = read("app/tabs/dashboard.tsx");
const jobsIndex = read("app/jobs/index.tsx");
const jobDetail = read("app/jobs/[id].tsx");
const earnings = read("app/earnings.tsx");
const profile = read("app/profile.tsx");
const riderNav = read("src/components/rider-navigation.tsx");
const taxiReadiness = read("app/taxi-readiness.tsx");
const taxiApi = read("src/api/taxi.api.ts");
const deliveryCaptainApplicationsApi = read("src/api/delivery-captain-applications.api.ts");
const ui = read("src/components/ui.tsx");
const captainModes = read("src/lib/captain-modes.ts");

const stagingProfile = easJson.build?.["rider-staging"];

expect(!JSON.stringify(packageJson).includes("eas-cli"), "Rider app must not depend on eas-cli.");
expect(stagingProfile?.distribution === "internal", "rider-staging must use internal distribution.");
expect(stagingProfile?.android?.buildType === "apk", "rider-staging must produce an Android APK.");
expect(
  stagingProfile?.env?.EXPO_PUBLIC_API_BASE_URL === "https://karigo-8htn.onrender.com/api/v1",
  "rider-staging must point at the Render staging API."
);
expect(stagingProfile?.env?.APP_VARIANT === "staging", "rider-staging must set APP_VARIANT=staging.");

expect(appConfig.includes("com.karigo.rider.staging"), "Staging Android package/iOS bundle ID must be configured.");
expect(appConfig.includes("KariGO Captain Staging"), "Staging app name must be configured.");
expect(appConfig.includes("EXPO_PUBLIC_API_BASE_URL"), "App config must read the public staging API URL.");
expect(appConfig.includes("344a78dc-69d9-4daa-9616-f100b67f0910"), "Rider EAS project ID must be linked in app config.");
expect(!appConfig.includes("344a78dc-69d3-4aa-9616-fb1b067f0910"), "Rider app config must not contain the old invalid EAS project ID.");
expect(appConfig.includes("https://u.expo.dev/${riderEasProjectId}"), "Rider EAS Update URL must be configured.");
expect(appConfig.includes('policy: "appVersion"'), "Rider runtimeVersion must use the appVersion policy.");
expect(packageJson.dependencies?.["expo-updates"] === "~0.28.18", "Rider app must use the Expo SDK 53-compatible expo-updates package.");

expect(apiClient.includes("karigo_rider_access_token"), "Rider token storage key must be rider-specific.");
expect(apiClient.includes("karigo_rider_refresh_token"), "Rider refresh token storage key must be rider-specific.");
expect(apiClient.includes("refreshAuth"), "Captain app must refresh sessions when access tokens expire.");
expect(apiClient.includes("createApiClient"), "Rider app must use the shared API client.");
expect(authContext.includes('role !== "RIDER"'), "Captain app must reject non-rider accounts until a backend Captain role exists.");
expect(authContext.includes("cannot use the Captain app"), "Role rejection copy must use Captain branding.");
expect(authContext.includes("authApi.logout") && authContext.includes("refreshTokenStore"), "Captain logout must clear persisted refresh sessions safely.");
expect(ui.includes("PasswordField"), "Rider shared UI must include a password visibility field.");
expect(ui.includes("visible ? \"Hide\" : \"Show\""), "Rider password field must expose show/hide toggle copy.");
expect(loginScreen.includes("PasswordField") && loginScreen.includes("passwordVisible"), "Rider login password field must support visibility toggling.");
expect(loginScreen.includes("Apply to become a Captain"), "Captain login must link to in-app applicant signup.");
expect(applicationScreen.includes("Submit Captain application"), "Captain app must include an in-app application submission flow.");
expect(applicationScreen.includes("Ride Captain readiness interest"), "Captain application must keep Ride Captain readiness gated.");
expect(applicationScreen.includes("does not activate dispatch, payouts, live rides or a Captain login account"), "Captain application must state safe review-only limits.");
expect(deliveryCaptainApplicationsApi.includes("delivery-captain-applications"), "Captain application must call the existing public Delivery Captain endpoint.");

expect(rootLayout.includes("headerTitle: \"\""), "Native route titles must be hidden.");
expect(rootLayout.includes("headerTintColor: brand.colors.charcoal"), "Back arrow should use KariGO charcoal styling.");
expect(rootLayout.includes("jobs/[id]"), "Job detail route must keep a configured header/back area.");
expect(rootLayout.includes("taxi-readiness"), "Ride readiness route must be configured with back-only navigation.");
expect(rootLayout.includes("auth/apply"), "Captain application route must be registered.");
expect(rootLayout.includes("CaptainBottomNav"), "Root layout must mount the Captain bottom navigation.");
expect(!rootLayout.includes("headerTintColor: brand.colors.primary"), "Rider headers should not use the older red default title styling.");

expect(ui.includes("paddingTop: 28"), "Shared Rider screen spacing should use compact top padding.");
expect(ui.includes("paddingBottom: 112"), "Shared Rider screens must leave room for bottom navigation.");
expect(ui.includes("RefreshControl"), "Rider screens must support pull-to-refresh where used.");
expect(ui.includes("heroTitle"), "Shared Rider UI must include stronger hero titles.");
expect(riderNav.includes("Home") && riderNav.includes("Deliveries") && riderNav.includes("Earnings") && riderNav.includes("Profile"), "Captain bottom nav must expose Home, Deliveries, Earnings and Profile tabs.");
expect(riderNav.includes("@expo/vector-icons") && riderNav.includes("Feather"), "Captain bottom nav must use proper icons.");
expect(riderNav.includes("pathname.startsWith(\"/auth\")"), "Rider bottom nav must hide on auth screens.");
expect(riderNav.includes("pathname.startsWith(\"/taxi-readiness\")"), "Captain bottom nav must hide on Ride readiness flow.");
expect(captainModes.includes("DELIVERY_CAPTAIN") && captainModes.includes("DRIVER_CAPTAIN"), "Captain mode helper must define delivery and ride modes.");
expect(captainModes.includes("Ride Captain"), "Captain mode helper must use Ride Captain display copy.");
expect(captainModes.includes("READINESS_ONLY"), "Ride Captain mode must support readiness-only state.");
expect(captainModes.includes("isTaxiStagingEnabled"), "Ride Captain mode must stay gated by ride staging flags.");
expect(appConfig.includes("karigo-icon.png") && appConfig.includes("karigo-adaptive-icon.png"), "Captain App config must use square icon and adaptive icon assets.");
expect(dashboard.includes("karigo-logo.png"), "Dashboard must use compact KariGO branding.");
expect(dashboard.includes("Delivery Captain availability"), "Dashboard must show a clear Delivery Captain availability section.");
expect(dashboard.includes("Loading Captain status"), "Dashboard fallback copy must use Captain branding.");
expect(dashboard.includes("Only active approved Delivery Captains"), "Dashboard approval copy must use Captain branding.");
expect(dashboard.includes("Manage your delivery assignments and availability."), "Dashboard must include polished Captain-facing intro copy.");
expect(dashboard.includes("Captain modes"), "Dashboard must show role-based Captain modes.");
expect(dashboard.includes("Ride readiness"), "Dashboard must expose Ride Captain readiness without live ride dispatch.");
expect(dashboard.includes("Online") && dashboard.includes("Unavailable") && dashboard.includes("On delivery") && dashboard.includes("Offline"), "Dashboard must expose captain-friendly online/offline states.");
expect(dashboard.includes("Go online") && dashboard.includes("Go offline"), "Dashboard must expose online/offline availability.");
expect(dashboard.includes("Today's assigned deliveries"), "Dashboard must show today's assigned deliveries.");
expect(dashboard.includes("Completed deliveries"), "Dashboard must show completed delivery summary.");
expect(dashboard.includes("Active delivery"), "Dashboard must show active delivery, if any.");
expect(dashboard.includes("Assigned jobs"), "Dashboard must show assigned jobs.");
expect(dashboard.includes("Support and help"), "Dashboard must include support/help access copy.");
expect(dashboard.includes("Staging safety note"), "Dashboard must include a staging safety note.");
expect(dashboard.includes("Live payouts, withdrawals, live ride booking and live payment collection are disabled."), "Dashboard must state inactive live operations.");
expect(dashboard.includes("Apply for Ride readiness"), "Dashboard must link to ride readiness application.");
expect(dashboard.includes("Captain tools"), "Dashboard must include an improved Captain tools section.");
expect(riderNav.includes("Deliveries"), "Captain bottom nav must use delivery-focused copy.");
expect(jobsIndex.includes("Assigned Jobs"), "Jobs screen title must stay clear for dispatch assignments.");
expect(jobsIndex.includes("No delivery jobs assigned yet. Stay online to receive jobs."), "Jobs list must have a captain-friendly empty state.");
expect(earnings.includes("Live wallet withdrawals and payout requests are not enabled in staging."), "Earnings screen must state withdrawal guardrails.");
expect(profile.includes("Captain Profile"), "Profile screen must use polished Captain Profile title.");
expect(profile.includes("Captain tools"), "Profile must use Captain tool branding.");
expect(profile.includes("photoUrl") && profile.includes("Profile photo URL optional"), "Profile must support a safe profile photo URL update.");
expect(profile.includes("Completed deliveries") && profile.includes("Ride Captain readiness"), "Profile must show delivery stats and Ride Captain readiness status.");
expect(profile.includes("Activity feed and notifications"), "Profile must link to notifications.");
expect(jobDetail.includes("Accept job") && jobDetail.includes("Reject job"), "Job detail must support accept/reject actions.");
expect(jobDetail.includes("RIDER_ARRIVING_PICKUP") && jobDetail.includes("PICKED_UP"), "Job detail must support pickup status progression.");
expect(jobDetail.includes("ON_THE_WAY") && jobDetail.includes("ARRIVED_DESTINATION"), "Job detail must support delivery status progression.");
expect(jobDetail.includes("Customer handoff"), "Job detail must guide the captain before delivery handoff.");
expect(jobDetail.includes("job.orderStatus === \"DELIVERED\""), "OTP completion must only appear after delivery is marked delivered.");
expect(!jobDetail.includes('job.orderStatus === "DELIVERED" || job.orderStatus === "ARRIVED_DESTINATION"'), "OTP completion must not appear at arrived-destination status.");
expect(jobDetail.includes("value.replace(/\\D/g, \"\").slice(0, 6)"), "Delivery OTP entry must accept only six digits.");
expect(jobDetail.includes("Complete delivery") && jobDetail.includes("Delivery completed successfully."), "Job detail must support OTP completion.");
expect(!jobsIndex.includes("deliveryOtp") && !jobDetail.includes("ordersApi.deliveryOtp"), "Rider app must not retrieve or display the customer delivery OTP.");
expect(taxiReadiness.includes("KariGO Rides is not live yet"), "Ride readiness screen must not present rides as live.");
expect(taxiReadiness.includes("Apply for Ride readiness"), "Ride readiness screen must include the application CTA.");
expect(taxiReadiness.includes("Ride Captain Test Mode"), "Ride Captain test mode copy must be used.");
expect(taxiReadiness.includes("Full name required"), "Ride readiness must require full name.");
expect(taxiReadiness.includes("Residential address required"), "Ride readiness must require captain address.");
expect(taxiReadiness.includes("Driving licence number required"), "Ride readiness must require licence number.");
expect(taxiReadiness.includes("Licence expiry YYYY-MM-DD required"), "Ride readiness must require licence expiry.");
expect(taxiReadiness.includes("Vehicle make required"), "Ride readiness must require vehicle make.");
expect(taxiReadiness.includes("Vehicle model required"), "Ride readiness must require vehicle model.");
expect(taxiReadiness.includes("Vehicle year required"), "Ride readiness must require vehicle year.");
expect(taxiReadiness.includes("Vehicle colour required"), "Ride readiness must require vehicle colour.");
expect(taxiReadiness.includes("Plate number required"), "Ride readiness must require plate number.");
expect(taxiReadiness.includes("Complete all required verification and vehicle fields before submitting."), "Ride readiness must block incomplete submissions.");
expect(taxiReadiness.includes("taxiApi.submitDriverApplication"), "Ride readiness screen must submit applications through the existing API client.");
expect(taxiReadiness.includes("taxiApi.applicationStatus"), "Ride readiness screen must check application status where available.");
expect(taxiReadiness.includes("EXPO_PUBLIC_TAXI_SERVICE_ENABLED") && taxiReadiness.includes("EXPO_PUBLIC_TAXI_STAGING_DISPATCH_ENABLED"), "Ride Captain Test Mode must be gated by both public staging flags.");
expect(taxiReadiness.includes("Ride Captain Test Mode"), "Captain app must include staging-only ride test-mode copy.");
expect(taxiReadiness.includes("No real ride, fare billing or payment is active."), "Ride Captain Test Mode must show safety copy.");
expect(taxiReadiness.includes("taxiApi.updateAvailability"), "Ride Captain Test Mode must support staging availability updates.");
expect(taxiReadiness.includes("taxiApi.availableTrips"), "Ride Captain Test Mode must fetch staging available trips.");
expect(taxiReadiness.includes("Start trip with PIN"), "Ride Captain Test Mode must require customer PIN before trip start.");
expect(taxiReadiness.includes("Complete trip"), "Ride Captain Test Mode must support completion after destination arrival.");
expect(taxiApi.includes("taxi/driver-applications"), "Ride API client must use the existing public application endpoint.");
expect(taxiApi.includes("rider/taxi/profile"), "Ride API client must expose the existing staging profile endpoint.");
expect(taxiApi.includes("rider/taxi/trips/available"), "Ride API client must expose the existing staging available-trip endpoint.");
expect(taxiApi.includes("rider/taxi/trips/${tripId}/start"), "Ride API client must submit the staging customer PIN to start a trip.");
expect(!taxiReadiness.includes("Pay Now") && !taxiReadiness.includes("cashout"), "Ride Captain Test Mode must not expose payment or cashout actions.");

if (failures.length) {
  console.error("Rider staging regression check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Rider staging regression check passed.");
