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
const appJson = readJson("app.json");
const easJson = readJson("eas.json");
const appConfig = read("app.config.ts");
const rootLayout = read("app/_layout.tsx");
const apiClient = read("src/api/client.ts");
const authContext = read("src/contexts/auth-context.tsx");
const loginScreen = read("app/auth/login.tsx");
const applicationScreen = read("app/auth/apply.tsx");
const forgotPasswordScreen = read("app/auth/forgot-password.tsx");
const resetPasswordScreen = read("app/auth/reset-password.tsx");
const dashboard = read("app/tabs/dashboard.tsx");
const notifications = read("app/notifications.tsx");
const jobsIndex = read("app/jobs/index.tsx");
const jobDetail = read("app/jobs/[id].tsx");
const earnings = read("app/earnings.tsx");
const profile = read("app/profile.tsx");
const taxiReadiness = read("app/taxi-readiness.tsx");
const riderNav = read("src/components/rider-navigation.tsx");
const ui = read("src/components/ui.tsx");
const captainModes = read("src/lib/captain-modes.ts");
const operationalState = read("src/lib/captain-operational-state.ts");
const captainAccessApi = read("src/api/captain-access.api.ts");
const notificationsApi = read("src/api/notifications.api.ts");
const taxiApi = read("src/api/taxi.api.ts");
const applicantOnboardingApi = read("src/api/applicant-onboarding.api.ts");
const deliveryCaptainApplicationsApi = read("src/api/delivery-captain-applications.api.ts");
const captainCatalogApi = read("src/api/captain-catalog.api.ts");
const locationHelper = read("src/lib/location.ts");

const stagingProfile = easJson.build?.["rider-staging"];
const productionProfile = easJson.build?.["captain-production"];

expect(!JSON.stringify(packageJson).includes("eas-cli"), "Captain app must not depend on eas-cli.");
expect(packageJson.dependencies?.["expo-updates"] === "~0.28.18", "Captain app must use Expo SDK 53-compatible expo-updates.");
expect(packageJson.dependencies?.["expo-location"] === "~18.1.6", "Captain app must use Expo SDK 53-compatible location support.");
expect(packageJson.dependencies?.["expo-local-authentication"] === "~16.0.5", "Captain app must use Expo SDK 53-compatible local authentication.");
expect(packageJson.dependencies?.["expo-build-properties"] === "~0.14.8", "Captain app must use Expo build-properties for API 36 readiness.");
expect(packageJson.scripts?.["audit:production-copy"] === "node scripts/production-copy-audit.js", "Captain app must expose the production copy audit.");

expect(stagingProfile?.distribution === "internal", "rider-staging must use internal distribution.");
expect(stagingProfile?.android?.buildType === "apk", "rider-staging must produce an Android APK.");
expect(stagingProfile?.env?.EXPO_PUBLIC_API_BASE_URL === "https://karigo-8htn.onrender.com/api/v1", "rider-staging must point at the Render API.");
expect(stagingProfile?.env?.APP_VARIANT === "staging", "rider-staging must set APP_VARIANT=staging.");
expect(productionProfile?.channel === "captain-production", "captain-production must publish to the captain-production channel.");

expect(appConfig.includes("com.karigo.rider.staging"), "Staging Android package/iOS bundle ID must be configured.");
expect(appConfig.includes("KariGO Captain Staging"), "Staging app name must be configured.");
expect(appConfig.includes("https://u.expo.dev/${riderEasProjectId}"), "Captain EAS Update URL must be configured.");
expect(appConfig.includes('policy: "appVersion"'), "Captain runtimeVersion must use appVersion policy.");
expect(appConfig.includes("compileSdkVersion: 36"), "Captain app must compile against Android API 36.");
expect(appConfig.includes("targetSdkVersion: 36"), "Captain app must target Android API 36.");
expect(appConfig.includes('version: "0.1.1"'), "Captain app version must remain 0.1.1 for this release line.");
expect(appConfig.includes("versionCode: isStaging ? 1 : 10"), "Captain production versionCode must remain 10 until the next AAB bump.");
expect(JSON.stringify(appJson.expo.plugins).includes("expo-build-properties"), "Captain app base config must include build-properties.");
expect(JSON.stringify(appJson.expo.plugins).includes('"targetSdkVersion":36'), "Captain app base config must target Android API 36.");

expect(apiClient.includes("karigo_rider_access_token"), "Captain token storage key must be app-specific.");
expect(apiClient.includes("refreshAuth"), "Captain app must refresh sessions when access tokens expire.");
expect(authContext.includes("canUseCaptainApp"), "Captain app must use explicit account eligibility.");
expect(authContext.includes('user.role === "RIDER" || user.role === "CUSTOMER"'), "Captain app must allow Customer accounts for application/status and Rider accounts for approved operations.");
expect(authContext.includes("refreshWithBiometrics") && authContext.includes("authApi.refresh"), "Captain biometric sign-in must refresh a saved backend session.");
expect(ui.includes("PasswordField") && ui.includes("visible ? \"Hide\" : \"Show\""), "Shared UI must include password visibility controls.");
expect(loginScreen.includes("Sign in with biometrics"), "Captain login must offer biometric sign-in when enabled.");
expect(loginScreen.includes("Forgot password?") && loginScreen.includes("/auth/forgot-password"), "Captain login must link to password reset.");
expect(forgotPasswordScreen.includes("continue using KariGO Captain"), "Forgot password copy must avoid application-stage wording on account recovery.");
expect(resetPasswordScreen.includes("authApi.confirmPasswordReset"), "Captain app must support password reset confirmation.");

expect(applicationScreen.includes("Captain application"), "Captain application intro must use production application copy.");
expect(applicationScreen.includes("KariGO Operations activates each mode separately after review."), "Captain application must explain separate mode activation.");
expect(applicationScreen.includes("Delivery work starts after KariGO Operations activates this mode."), "Delivery application helper must use activation copy.");
expect(applicationScreen.includes("Ride work starts after KariGO Operations activates this mode."), "Ride application helper must use activation copy.");
expect(applicationScreen.includes("Create account and send OTP"), "Captain application must start with account creation and OTP.");
expect(applicationScreen.includes("captainCatalogApi.vehicleCatalog") && captainCatalogApi.includes("platform/vehicle-catalog"), "Captain application must load the guided vehicle catalog.");
expect(applicationScreen.includes("captainCatalogApi.serviceAreas") && captainCatalogApi.includes("platform/captain-service-areas"), "Captain application must load service areas.");
expect(applicationScreen.includes("captainDocumentsApi.upload"), "Captain application must use secure document upload IDs.");
expect(applicantOnboardingApi.includes("auth/captain-onboarding"), "Captain application must call account-first onboarding endpoints.");
expect(deliveryCaptainApplicationsApi.includes("delivery-captain-applications"), "Captain application must call Delivery Captain endpoints.");

expect(rootLayout.includes("notifications"), "Notifications route must be registered.");
expect(rootLayout.includes("taxi-readiness"), "Ride operations route must be configured.");
expect(rootLayout.includes("CaptainBottomNav"), "Root layout must mount the Captain bottom navigation.");
expect(riderNav.includes("Home") && riderNav.includes("Deliveries") && riderNav.includes("Earnings") && riderNav.includes("Profile"), "Captain bottom nav must expose Home, Deliveries, Earnings and Profile.");
expect(riderNav.includes("@expo/vector-icons") && riderNav.includes("Feather"), "Captain bottom nav must use proper icons.");
expect(riderNav.includes("pathname.startsWith(\"/auth\")"), "Captain bottom nav must hide on auth screens.");

expect(captainModes.includes("Ride Captain"), "Captain mode helper must use Ride Captain copy.");
expect(captainModes.includes("Operations active") && captainModes.includes("Activation pending"), "Captain mode helper must use production activation labels.");
expect(operationalState.includes("hasAnyActiveMode = delivery.active || ride.active"), "Operational state must unlock the app when any Captain mode is active.");
expect(operationalState.includes("Activation pending"), "Operational state must expose activation-pending labels.");
expect(captainAccessApi.includes("captain/access") && captainAccessApi.includes("operationalModes"), "Captain app must use backend access resolver.");
expect(locationHelper.includes("requestForegroundPermissionsAsync") && locationHelper.includes("getCurrentPositionAsync"), "Captain location helper must capture current device position.");

expect(dashboard.includes("projectCaptainOperationalState"), "Home must use state-aware Captain projection.");
expect(dashboard.includes("karigo-logo.png"), "Home must use compact KariGO branding.");
expect(dashboard.includes('accessibilityLabel="Notifications"'), "Home header must include an accessible notification bell.");
expect(dashboard.includes("unread > 99 ? \"99+\" : unread"), "Home unread badge must cap at 99+.");
expect(dashboard.includes("AppState.addEventListener"), "Home must refresh unread count on foreground.");
expect(dashboard.includes("Captain map"), "Home must show the map card.");
expect(dashboard.includes("Availability"), "Home must show mode availability controls.");
expect(dashboard.includes("Current work"), "Home must show current assignment state.");
expect(dashboard.includes("No active assignment") && dashboard.includes("Waiting for assignment"), "Home must show clean assignment empty states.");
expect(dashboard.includes("captainAccessApi.updateAvailability"), "Home must update dual-mode availability through backend work-state.");
expect(dashboard.includes("Delivery") && dashboard.includes("Ride"), "Home must show independent Delivery and Ride controls.");
expect(!dashboard.includes("<Text style={ui.title}>Notifications"), "Home must not contain a large Notifications card.");
expect(!dashboard.includes("Assigned deliveries"), "Home must not contain the delivery queue.");
expect(!dashboard.includes("Today's assigned") && !dashboard.includes("assigned deliveries"), "Home must not contain Delivery-only Today stats.");
expect(!dashboard.includes("Completed deliveries"), "Home must not contain Delivery-only Completed stats.");
expect(!dashboard.includes("Ride Operations promotional"), "Home must not contain promotional Ride cards.");

expect(notifications.includes("Mark all read"), "Notifications screen must support mark-all-read.");
expect(notifications.includes("notificationsApi.markRead"), "Notifications screen must mark individual notifications read.");
expect(notifications.includes("notificationsApi.markAllRead"), "Notifications screen must persist mark-all-read.");
expect(notifications.includes("No notifications yet. Updates about assignments, applications and your Captain account will appear here."), "Notifications screen must include the approved empty state.");
expect(notifications.includes("targetFor") && notifications.includes("/taxi-readiness") && notifications.includes("/application-status") && notifications.includes("/earnings"), "Notifications must validate safe deep-link targets.");
expect(notifications.includes("categoryIcon"), "Notifications must show category icons.");
expect(notificationsApi.includes("notifications/unread-count"), "Notifications API must expose unread count.");
expect(notificationsApi.includes("read-all") && notificationsApi.includes("/read"), "Notifications API must support read persistence.");

expect(jobsIndex.includes("Delivery activation pending"), "Deliveries tab must show compact pending state for inactive Delivery mode.");
expect(jobsIndex.includes("Today assigned") && jobsIndex.includes("Completed") && jobsIndex.includes("Cancelled"), "Deliveries tab must own Delivery summary stats.");
expect(jobsIndex.includes("Active delivery"), "Deliveries tab must own active Delivery workflow.");
expect(jobsIndex.includes("Assigned deliveries"), "Deliveries tab must own Delivery queue.");
expect(jobsIndex.includes("Delivery history"), "Deliveries tab must own Delivery history.");
expect(jobDetail.includes("Accept job") && jobDetail.includes("Reject job"), "Delivery detail must support accept/reject actions.");
expect(jobDetail.includes("Complete delivery") && jobDetail.includes("Delivery completed successfully."), "Delivery detail must support OTP completion.");

expect(earnings.includes("projectCaptainOperationalState"), "Earnings must use state-aware Captain projection.");
expect(earnings.includes("Completed Rides") && earnings.includes("Completed Deliveries"), "Earnings must show combined Ride and Delivery records.");
expect(earnings.includes("Your earnings will appear here after you complete a Ride or Delivery."), "Earnings must have a clean zero state.");
expect(!earnings.includes("Earnings locked"), "Earnings must not be locked when any Captain mode is active.");

expect(profile.includes("Captain access"), "Profile must show independent mode summary.");
expect(profile.includes("Notifications") && profile.includes("unread"), "Profile must include compact Notifications entry.");
expect(profile.includes("setBiometricSignIn") && profile.includes("Privacy Policy") && profile.includes("Terms"), "Profile must include biometric controls and legal links.");
expect(profile.includes("/notifications"), "Profile notifications row must link to Notifications.");

expect(taxiReadiness.includes("Ride workspace"), "Ride screen must use Ride workspace copy.");
expect(taxiReadiness.includes("Ride Captain activation is pending."), "Ride screen must show compact activation pending copy.");
expect(taxiReadiness.includes("No active Ride"), "Ride screen must show clean empty state.");
expect(taxiReadiness.includes("Go online to become available for Ride assignments."), "Ride screen must show online/offline guidance.");
expect(taxiReadiness.includes("taxiApi.updateAvailability"), "Ride screen must support availability updates.");
expect(taxiReadiness.includes("taxiApi.availableTrips"), "Ride screen must fetch assigned trips.");
expect(taxiReadiness.includes("Accept assigned ride") && taxiReadiness.includes("Start trip with PIN") && taxiReadiness.includes("Complete trip"), "Ride screen must support controlled lifecycle actions.");
expect(taxiApi.includes("rider/taxi/profile") && taxiApi.includes("rider/taxi/trips/available"), "Ride API client must expose profile and assigned trips.");
expect(!taxiReadiness.includes("Pay Now") && !taxiReadiness.includes("cashout"), "Ride screen must not expose payment or cashout actions.");

if (failures.length) {
  console.error("Captain regression check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Captain regression check passed.");
