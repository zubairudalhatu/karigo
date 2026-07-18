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
expect(packageJson.dependencies?.["expo-location"] === "~18.1.6", "Captain app must use the Expo SDK 53-compatible expo-location package.");
expect(appConfig.includes("expo-location") && appConfig.includes("locationWhenInUsePermission"), "Captain app config must include safe foreground location permission copy.");

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
expect(applicationScreen.includes("City (Kano or Abuja)") && applicationScreen.includes("State (Kano or FCT)"), "Captain application must guide applicants to Kano/Abuja launch locations.");
expect(applicationScreen.includes("Ride Captain review interest"), "Captain application must keep Ride Captain review gated.");
expect(applicationScreen.includes("does not activate dispatch, payouts, live rides or a Captain login account"), "Captain application must state safe review-only limits.");
expect(applicationScreen.includes("Delivery assignments are the approved active mode."), "Captain application must use live-ready Delivery Captain copy.");
expect(applicationScreen.includes("Driver licence image HTTPS link optional"), "Captain application must support licence document evidence.");
expect(applicationScreen.includes("Vehicle particulars HTTPS link optional"), "Captain application must support vehicle particulars evidence.");
expect(applicationScreen.includes("Insurance document HTTPS link optional"), "Captain application must support insurance evidence.");
expect(deliveryCaptainApplicationsApi.includes("delivery-captain-applications"), "Captain application must call the existing public Delivery Captain endpoint.");
expect(deliveryCaptainApplicationsApi.includes("documents?"), "Captain application API type must include safe document metadata.");

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
expect(captainModes.includes("Operations review") && captainModes.includes("Review only"), "Ride Captain mode helper must use review-oriented public copy.");
expect(appConfig.includes("karigo-icon.png") && appConfig.includes("karigo-adaptive-icon.png"), "Captain App config must use square icon and adaptive icon assets.");
expect(dashboard.includes("karigo-logo.png"), "Dashboard must use compact KariGO branding.");
expect(dashboard.includes("Delivery Captain availability"), "Dashboard must show a clear Delivery Captain availability section.");
expect(dashboard.includes("Loading Captain status"), "Dashboard fallback copy must use Captain branding.");
expect(dashboard.includes("Only active approved Delivery Captains"), "Dashboard approval copy must use Captain branding.");
expect(dashboard.includes("Manage your delivery assignments and availability."), "Dashboard must include polished Captain-facing intro copy.");
expect(dashboard.includes("Captain modes"), "Dashboard must show role-based Captain modes.");
expect(dashboard.includes("Ride review"), "Dashboard must expose Ride Captain review without live ride dispatch.");
expect(dashboard.includes("Online") && dashboard.includes("Unavailable") && dashboard.includes("On delivery") && dashboard.includes("Offline"), "Dashboard must expose captain-friendly online/offline states.");
expect(dashboard.includes("Go online") && dashboard.includes("Go offline"), "Dashboard must expose online/offline availability.");
expect(dashboard.includes("requestCaptainForegroundLocation"), "Dashboard must request device GPS before going online.");
expect(dashboard.includes("riderApi.updateLocation"), "Dashboard must send live location after online availability succeeds.");
expect(dashboard.includes("KariGO will not update your live location"), "Dashboard must state location tracking stops when offline.");
expect(dashboard.includes("Today's assigned deliveries"), "Dashboard must show today's assigned deliveries.");
expect(dashboard.includes("Completed deliveries"), "Dashboard must show completed delivery summary.");
expect(dashboard.includes("Active delivery"), "Dashboard must show active delivery, if any.");
expect(dashboard.includes("Assigned jobs"), "Dashboard must show assigned jobs.");
expect(dashboard.includes("Support and help"), "Dashboard must include support/help access copy.");
expect(dashboard.includes("Operational guardrails"), "Dashboard must include launch guardrails.");
expect(dashboard.includes("Payout automation, withdrawals and ride dispatch stay disabled"), "Dashboard must state inactive live operations.");
expect(dashboard.includes("Apply for Ride review"), "Dashboard must link to ride review application.");
expect(dashboard.includes("Captain tools"), "Dashboard must include an improved Captain tools section.");
expect(riderNav.includes("Deliveries"), "Captain bottom nav must use delivery-focused copy.");
expect(jobsIndex.includes("Assigned Jobs"), "Jobs screen title must stay clear for dispatch assignments.");
expect(jobsIndex.includes("No delivery jobs assigned yet. Stay online to receive jobs."), "Jobs list must have a captain-friendly empty state.");
expect(earnings.includes("Wallet withdrawals and payout requests require KariGO operations approval before activation."), "Earnings screen must state withdrawal guardrails.");
expect(profile.includes("Captain Profile"), "Profile screen must use polished Captain Profile title.");
expect(profile.includes("Captain tools"), "Profile must use Captain tool branding.");
expect(profile.includes("photoUrl") && profile.includes("Profile photo URL optional"), "Profile must support a safe profile photo URL update.");
expect(profile.includes("Completed deliveries") && profile.includes("Ride Captain review"), "Profile must show delivery stats and Ride Captain review status.");
expect(profile.includes("Use device GPS now"), "Profile must expose a GPS location update action.");
expect(profile.includes("disabled={profile.availabilityStatus === \"OFFLINE\"}"), "Profile must block live location updates while offline.");
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
expect(taxiReadiness.includes("KariGO Rides requires operations approval"), "Ride review screen must not present rides as live.");
expect(taxiReadiness.includes("City required (Kano or Abuja)") && taxiReadiness.includes("State required (Kano or FCT)"), "Ride readiness must guide applicants to Kano/Abuja launch locations.");
expect(taxiReadiness.includes("Apply for Ride review"), "Ride review screen must include the application CTA.");
expect(taxiReadiness.includes("Ride operations review"), "Ride operations review copy must be used.");
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
expect(taxiReadiness.includes("EXPO_PUBLIC_TAXI_SERVICE_ENABLED") && taxiReadiness.includes("EXPO_PUBLIC_TAXI_STAGING_DISPATCH_ENABLED"), "Ride review mode must be gated by both public ride flags.");
expect(taxiReadiness.includes("No ride fare billing, payout or public ride dispatch is active."), "Ride review mode must show safety copy.");
expect(taxiReadiness.includes("taxiApi.updateAvailability"), "Ride review mode must support controlled availability updates.");
expect(taxiReadiness.includes("taxiApi.availableTrips"), "Ride review mode must fetch controlled available trips.");
expect(taxiReadiness.includes("Start trip with PIN"), "Ride review mode must require customer PIN before trip start.");
expect(taxiReadiness.includes("Complete trip"), "Ride review mode must support completion after destination arrival.");
expect(taxiApi.includes("taxi/driver-applications"), "Ride API client must use the existing public application endpoint.");
expect(taxiApi.includes("rider/taxi/profile"), "Ride API client must expose the existing staging profile endpoint.");
expect(taxiApi.includes("rider/taxi/trips/available"), "Ride API client must expose the existing staging available-trip endpoint.");
expect(taxiApi.includes("rider/taxi/trips/${tripId}/start"), "Ride API client must submit the staging customer PIN to start a trip.");
expect(!taxiReadiness.includes("Pay Now") && !taxiReadiness.includes("cashout"), "Ride review mode must not expose payment or cashout actions.");

const locationHelper = read("src/lib/location.ts");
expect(locationHelper.includes("requestForegroundPermissionsAsync"), "Captain location helper must request foreground permission.");
expect(locationHelper.includes("getCurrentPositionAsync"), "Captain location helper must capture current device position.");

if (failures.length) {
  console.error("Rider staging regression check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Rider staging regression check passed.");
