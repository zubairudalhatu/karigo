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
const dashboard = read("app/tabs/dashboard.tsx");
const jobsIndex = read("app/jobs/index.tsx");
const jobDetail = read("app/jobs/[id].tsx");
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
expect(appConfig.includes("EXPO_PUBLIC_EAS_PROJECT_ID"), "App config must safely preserve a Rider EAS project ID when provided.");

expect(apiClient.includes("karigo_rider_access_token"), "Rider token storage key must be rider-specific.");
expect(apiClient.includes("createApiClient"), "Rider app must use the shared API client.");
expect(authContext.includes('role !== "RIDER"'), "Rider app must reject non-rider accounts.");

expect(rootLayout.includes("headerTitle: \"\""), "Native route titles must be hidden.");
expect(rootLayout.includes("headerTintColor: brand.colors.charcoal"), "Back arrow should use KariGO charcoal styling.");
expect(rootLayout.includes("jobs/[id]"), "Job detail route must keep a configured header/back area.");
expect(!rootLayout.includes("headerTintColor: brand.colors.primary"), "Rider headers should not use the older red default title styling.");

expect(ui.includes("paddingTop: 48"), "Shared Rider screen spacing should preserve Android status-bar space.");
expect(dashboard.includes("Go online") && dashboard.includes("Go offline"), "Dashboard must expose online/offline availability.");
expect(dashboard.includes("Assigned jobs"), "Dashboard must show assigned jobs.");
expect(jobsIndex.includes("No delivery jobs assigned yet. Stay online to receive jobs."), "Jobs list must have a rider-friendly empty state.");
expect(jobDetail.includes("Accept job") && jobDetail.includes("Reject job"), "Job detail must support accept/reject actions.");
expect(jobDetail.includes("RIDER_ARRIVING_PICKUP") && jobDetail.includes("PICKED_UP"), "Job detail must support pickup status progression.");
expect(jobDetail.includes("ON_THE_WAY") && jobDetail.includes("ARRIVED_DESTINATION"), "Job detail must support delivery status progression.");
expect(jobDetail.includes("Complete delivery") && jobDetail.includes("Delivery completed successfully."), "Job detail must support OTP completion.");

if (failures.length) {
  console.error("Rider staging regression check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Rider staging regression check passed.");
