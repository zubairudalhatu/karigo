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
const dashboard = read("app/tabs/dashboard.tsx");
const jobsIndex = read("app/jobs/index.tsx");
const jobDetail = read("app/jobs/[id].tsx");
const taxiReadiness = read("app/taxi-readiness.tsx");
const taxiApi = read("src/api/taxi.api.ts");
const ui = read("src/components/ui.tsx");

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
expect(appConfig.includes("KariGO Rider Staging"), "Staging app name must be configured.");
expect(appConfig.includes("EXPO_PUBLIC_API_BASE_URL"), "App config must read the public staging API URL.");
expect(appConfig.includes("344a78dc-69d9-4daa-9616-f100b67f0910"), "Rider EAS project ID must be linked in app config.");
expect(!appConfig.includes("344a78dc-69d3-4aa-9616-fb1b067f0910"), "Rider app config must not contain the old invalid EAS project ID.");
expect(appConfig.includes("https://u.expo.dev/${riderEasProjectId}"), "Rider EAS Update URL must be configured.");
expect(appConfig.includes('policy: "appVersion"'), "Rider runtimeVersion must use the appVersion policy.");
expect(packageJson.dependencies?.["expo-updates"] === "~0.28.18", "Rider app must use the Expo SDK 53-compatible expo-updates package.");

expect(apiClient.includes("karigo_rider_access_token"), "Rider token storage key must be rider-specific.");
expect(apiClient.includes("createApiClient"), "Rider app must use the shared API client.");
expect(authContext.includes('role !== "RIDER"'), "Rider app must reject non-rider accounts.");
expect(ui.includes("PasswordField"), "Rider shared UI must include a password visibility field.");
expect(ui.includes("visible ? \"Hide\" : \"Show\""), "Rider password field must expose show/hide toggle copy.");
expect(loginScreen.includes("PasswordField") && loginScreen.includes("passwordVisible"), "Rider login password field must support visibility toggling.");

expect(rootLayout.includes("headerTitle: \"\""), "Native route titles must be hidden.");
expect(rootLayout.includes("headerTintColor: brand.colors.charcoal"), "Back arrow should use KariGO charcoal styling.");
expect(rootLayout.includes("jobs/[id]"), "Job detail route must keep a configured header/back area.");
expect(rootLayout.includes("taxi-readiness"), "Taxi readiness route must be configured with back-only navigation.");
expect(!rootLayout.includes("headerTintColor: brand.colors.primary"), "Rider headers should not use the older red default title styling.");

expect(ui.includes("paddingTop: 48"), "Shared Rider screen spacing should preserve Android status-bar space.");
expect(ui.includes("RefreshControl"), "Rider screens must support pull-to-refresh where used.");
expect(dashboard.includes("Rider availability"), "Dashboard must show a clear availability section.");
expect(dashboard.includes("Available") && dashboard.includes("Unavailable") && dashboard.includes("On delivery") && dashboard.includes("Offline"), "Dashboard must expose rider-friendly availability states.");
expect(dashboard.includes("Go online") && dashboard.includes("Go offline"), "Dashboard must expose online/offline availability.");
expect(dashboard.includes("Today's assigned deliveries"), "Dashboard must show today's assigned deliveries.");
expect(dashboard.includes("Completed deliveries"), "Dashboard must show completed delivery summary.");
expect(dashboard.includes("Active delivery"), "Dashboard must show active delivery, if any.");
expect(dashboard.includes("Assigned jobs"), "Dashboard must show assigned jobs.");
expect(dashboard.includes("Support and help"), "Dashboard must include support/help access copy.");
expect(dashboard.includes("Staging safety note"), "Dashboard must include a staging safety note.");
expect(dashboard.includes("Live payouts, withdrawals, live taxi booking and live payment collection are disabled."), "Dashboard must state inactive live operations.");
expect(dashboard.includes("Taxi Driver Readiness"), "Dashboard must include taxi readiness card.");
expect(dashboard.includes("Apply for Taxi Readiness"), "Dashboard must link to taxi readiness application.");
expect(jobsIndex.includes("No delivery jobs assigned yet. Stay online to receive jobs."), "Jobs list must have a rider-friendly empty state.");
expect(jobDetail.includes("Accept job") && jobDetail.includes("Reject job"), "Job detail must support accept/reject actions.");
expect(jobDetail.includes("RIDER_ARRIVING_PICKUP") && jobDetail.includes("PICKED_UP"), "Job detail must support pickup status progression.");
expect(jobDetail.includes("ON_THE_WAY") && jobDetail.includes("ARRIVED_DESTINATION"), "Job detail must support delivery status progression.");
expect(jobDetail.includes("Customer handoff"), "Job detail must guide rider before delivery handoff.");
expect(jobDetail.includes("job.orderStatus === \"DELIVERED\""), "OTP completion must only appear after delivery is marked delivered.");
expect(!jobDetail.includes('job.orderStatus === "DELIVERED" || job.orderStatus === "ARRIVED_DESTINATION"'), "OTP completion must not appear at arrived-destination status.");
expect(jobDetail.includes("value.replace(/\\D/g, \"\").slice(0, 6)"), "Delivery OTP entry must accept only six digits.");
expect(jobDetail.includes("Complete delivery") && jobDetail.includes("Delivery completed successfully."), "Job detail must support OTP completion.");
expect(!jobsIndex.includes("deliveryOtp") && !jobDetail.includes("ordersApi.deliveryOtp"), "Rider app must not retrieve or display the customer delivery OTP.");
expect(taxiReadiness.includes("Taxi is not live yet"), "Taxi readiness screen must not present taxi as live.");
expect(taxiReadiness.includes("Apply for Taxi Readiness"), "Taxi readiness screen must include the driver application CTA.");
expect(taxiReadiness.includes("taxiApi.submitDriverApplication"), "Taxi readiness screen must submit applications through the API client.");
expect(taxiReadiness.includes("taxiApi.applicationStatus"), "Taxi readiness screen must check application status where available.");
expect(taxiReadiness.includes("EXPO_PUBLIC_TAXI_SERVICE_ENABLED") && taxiReadiness.includes("EXPO_PUBLIC_TAXI_STAGING_DISPATCH_ENABLED"), "Taxi Test Mode must be gated by both public staging flags.");
expect(taxiReadiness.includes("Taxi Test Mode"), "Rider app must include staging-only Taxi Test Mode copy.");
expect(taxiReadiness.includes("No real taxi ride, fare billing or payment is active."), "Rider Taxi Test Mode must show safety copy.");
expect(taxiReadiness.includes("taxiApi.updateAvailability"), "Rider Taxi Test Mode must support staging availability updates.");
expect(taxiReadiness.includes("taxiApi.availableTrips"), "Rider Taxi Test Mode must fetch staging available trips.");
expect(taxiReadiness.includes("Start trip with PIN"), "Rider Taxi Test Mode must require customer PIN before trip start.");
expect(taxiReadiness.includes("Complete trip"), "Rider Taxi Test Mode must support completion after destination arrival.");
expect(taxiApi.includes("taxi/driver-applications"), "Rider taxi API must use public taxi driver application endpoint.");
expect(taxiApi.includes("rider/taxi/profile"), "Rider taxi API must expose staging profile endpoint.");
expect(taxiApi.includes("rider/taxi/trips/available"), "Rider taxi API must expose staging available-trip endpoint.");
expect(taxiApi.includes("rider/taxi/trips/${tripId}/start"), "Rider taxi API must submit the staging customer PIN to start a trip.");
expect(!taxiReadiness.includes("Pay Now") && !taxiReadiness.includes("cashout"), "Rider Taxi Test Mode must not expose payment or cashout actions.");

if (failures.length) {
  console.error("Rider staging regression check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Rider staging regression check passed.");
