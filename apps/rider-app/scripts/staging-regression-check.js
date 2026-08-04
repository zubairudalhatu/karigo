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
const captainAccessBootstrap = read("app/captain-access.tsx");
const apiClient = read("src/api/client.ts");
const authContext = read("src/contexts/auth-context.tsx");
const loginScreen = read("app/auth/login.tsx");
const applicationScreen = read("app/auth/apply.tsx");
const forgotPasswordScreen = read("app/auth/forgot-password.tsx");
const resetPasswordScreen = read("app/auth/reset-password.tsx");
const dashboard = read("app/tabs/dashboard.tsx");
const applicationStatus = read("app/application-status.tsx");
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
expect(packageJson.dependencies?.["react-native-maps"] === "1.20.1", "Captain app must include the native map dependency for the operational Home map.");
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
expect(appConfig.includes("GOOGLE_MAPS_ANDROID_API_KEY") && appConfig.includes("googleMaps"), "Captain app must pass the Android Google Maps API key through Expo config when available.");
expect(appConfig.includes('version: "1.0.0"'), "Captain app version must be 1.0.0 for the Play release line.");
expect(appConfig.includes("versionCode: isStaging ? 1 : 14"), "Captain production versionCode must be 14 for the approved-icon Play 1.0.0 AAB.");
expect(appConfig.includes('"android.permission.SYSTEM_ALERT_WINDOW"') && appConfig.includes("allowBackup: false"), "Captain production must block overlay access and Android backup.");
expect(appConfig.includes('icon: "./assets/icon.png"'), "Captain config must use the approved fallback launcher icon.");
expect(appConfig.includes('foregroundImage: "./assets/adaptive-icon-foreground.png"'), "Captain config must use the approved adaptive K foreground.");
expect(appConfig.includes('monochromeImage: "./assets/adaptive-icon-monochrome.png"'), "Captain config must use the approved themed K silhouette.");
expect(appConfig.includes('backgroundColor: "#111111"'), "Captain adaptive icon must use the approved black background.");
expect(easJson.build?.["captain-play-internal"]?.channel === "captain-production", "Captain Play Internal profile must use the production channel.");
expect(easJson.submit?.["captain-play-internal"]?.android?.track === "internal", "Captain Play submit profile must target Internal testing.");
expect(productionProfile?.env?.EXPO_PUBLIC_RIDES_CONTROLLED_PILOT_ENABLED === "false", "Captain production must disable the controlled-pilot flag.");
expect(productionProfile?.env?.EXPO_PUBLIC_TAXI_STAGING_DISPATCH_ENABLED === "false", "Captain production must disable staging dispatch.");
expect(JSON.stringify(appJson.expo.plugins).includes("expo-build-properties"), "Captain app base config must include build-properties.");
expect(JSON.stringify(appJson.expo.plugins).includes('"targetSdkVersion":36'), "Captain app base config must target Android API 36.");

expect(apiClient.includes("karigo_captain_session_v2"), "Captain app must persist access/refresh tokens in the v2 session envelope.");
expect(apiClient.includes("LEGACY_TOKEN_KEY"), "Captain app must keep legacy rider token migration support.");
expect(apiClient.includes("refreshAuth"), "Captain app must refresh sessions when access tokens expire.");
expect(apiClient.includes("refresh_joined_existing"), "Captain API client must use a single-flight refresh guard.");
expect(apiClient.includes("validateMobileApiBaseUrl"), "Captain API client must validate production API base URL safety.");
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
expect(rootLayout.includes('Stack.Screen name="tabs/dashboard"'), "Root layout must register the operational Home route.");
expect(captainAccessBootstrap.includes("router.replace(access.nextStep === \"APPLICATION_STATUS\" ? \"/application-status\" : access.nextRoute)"), "Captain access bootstrap must route operational Captains through backend nextRoute.");
expect(riderNav.includes("Home") && riderNav.includes("Deliveries") && riderNav.includes("Earnings") && riderNav.includes("Profile"), "Captain bottom nav must expose Home, Deliveries, Earnings and Profile.");
expect(riderNav.includes("@expo/vector-icons") && riderNav.includes("Feather"), "Captain bottom nav must use proper icons.");
expect(riderNav.includes("pathname.startsWith(\"/auth\")"), "Captain bottom nav must hide on auth screens.");

expect(captainModes.includes("Ride Captain"), "Captain mode helper must use Ride Captain copy.");
expect(captainModes.includes("Operations active") && captainModes.includes("Activation pending"), "Captain mode helper must use production activation labels.");
expect(operationalState.includes("hasAnyActiveMode = delivery.active || ride.active"), "Operational state must unlock the app when any Captain mode is active.");
expect(operationalState.includes("Activation pending"), "Operational state must expose activation-pending labels.");
expect(captainAccessApi.includes("captain/access") && captainAccessApi.includes("operationalModes"), "Captain app must use backend access resolver.");
expect(captainAccessApi.includes("captain/work-state") && captainAccessApi.includes("CaptainAvailabilityReasonCode"), "Captain app must consume the authoritative Captain work-state contract.");
expect(!captainAccessApi.includes("AsyncStorage") && !operationalState.includes("AsyncStorage"), "Captain access/work-state must not use a stale persisted projection cache.");
expect(locationHelper.includes("requestForegroundPermissionsAsync") && locationHelper.includes("getCurrentPositionAsync"), "Captain location helper must capture current device position.");
expect(locationHelper.includes("hasServicesEnabledAsync"), "Captain location helper must verify device location services are enabled.");
expect(locationHelper.includes("watchCaptainForegroundLocation"), "Captain location helper must expose a foreground GPS watcher.");
expect(locationHelper.includes("distanceMeters"), "Captain location helper must expose distance filtering for GPS uploads.");
expect(locationHelper.includes("We could not confirm your current location."), "Captain location helper must use safe customer-facing GPS unavailable copy.");
expect(locationHelper.includes("timeInterval: 30_000") && locationHelper.includes("distanceInterval: strongAccuracy ? 15 : 20"), "Captain GPS watcher must use the launch throttle floor.");

expect(dashboard.includes("projectCaptainOperationalState"), "Home must use state-aware Captain projection.");
expect(dashboard.includes("karigo-logo.png"), "Home must use compact KariGO branding.");
expect(dashboard.includes("react-native-maps") && dashboard.includes("MapView") && dashboard.includes("Marker"), "Home must mount the native Google map, not a placeholder panel.");
expect(dashboard.includes('accessibilityLabel="Notifications"'), "Home header must include an accessible notification bell.");
expect(dashboard.includes("unread > 99 ? \"99+\" : unread"), "Home unread badge must cap at 99+.");
expect(dashboard.includes("AppState.addEventListener"), "Home must refresh unread count on foreground.");
expect(dashboard.includes("Live map"), "Home must show the live map card.");
expect(dashboard.includes("vehicleMarker") && dashboard.includes("mapFooter"), "Home map must show a Captain position marker and compact service-area footer.");
expect(dashboard.includes("Location unavailable"), "Home map must include a safe unavailable state.");
expect(dashboard.includes("Refresh GPS"), "Home must include a recoverable location refresh action.");
expect(dashboard.includes("watcherRef") && dashboard.includes("watchCaptainForegroundLocation"), "Home must start one foreground GPS watcher while online or assigned.");
expect(dashboard.includes("watcherStartingRef") && dashboard.includes("stopCaptainWatcher"), "Home must prevent duplicate GPS watchers and stop them on lifecycle changes.");
expect(dashboard.includes("backoffUntilRef") && dashboard.includes("failureCountRef"), "Home must back off failed automatic GPS uploads.");
expect(dashboard.includes("captain_gps_watcher_started") && dashboard.includes("captain_gps_watcher_stopped"), "Home must log safe GPS watcher diagnostics.");
expect(dashboard.includes("uploadCaptainLocation"), "Home must upload automatic Captain GPS refreshes to backend work-state.");
expect(dashboard.includes("captainAccessApi.updateAvailability({ ...location })"), "Home GPS refresh must submit location-only updates without mutating availability.");
expect(!dashboard.includes("deliveryOnline: currentWorkState.desiredDeliveryOnline") && !dashboard.includes("rideOnline: currentWorkState.desiredRideOnline"), "Home GPS refresh must not resend desired availability during location updates.");
expect(dashboard.includes("reasonCode === \"LOCATION_STALE\""), "Home must allow stale-location recovery through the normal online toggle.");
expect(dashboard.includes("disabled={!workState || locationUpdating}"), "Manual GPS refresh must remain available during active work while preventing duplicate submissions.");
expect(dashboard.includes("Availability"), "Home must show mode availability controls.");
expect(dashboard.includes("Current work"), "Home must show current assignment state.");
expect(dashboard.includes("No active assignment") && dashboard.includes("Waiting for assignment"), "Home must show clean assignment empty states.");
expect(dashboard.includes("captainAccessApi.updateAvailability"), "Home must update dual-mode availability through backend work-state.");
expect(dashboard.includes("Delivery") && dashboard.includes("Ride"), "Home must show independent Delivery and Ride controls.");
expect(dashboard.includes("projection.delivery.active") && dashboard.includes("projection.ride.active"), "Home must render modes from operational activation, not application approval only.");
expect(dashboard.includes("workState.activeWorkMode") && dashboard.includes("paused while"), "Home must show active-work locks across modes.");
expect(!dashboard.includes("<Text style={ui.title}>Notifications"), "Home must not contain a large Notifications card.");
expect(!dashboard.includes("Assigned deliveries"), "Home must not contain the delivery queue.");
expect(!dashboard.includes("Today's assigned") && !dashboard.includes("assigned deliveries"), "Home must not contain Delivery-only Today stats.");
expect(!dashboard.includes("Completed deliveries"), "Home must not contain Delivery-only Completed stats.");
expect(!dashboard.includes("Ride Operations promotional"), "Home must not contain promotional Ride cards.");
expect(!dashboard.includes("Update manual coordinates"), "Home must not expose manual coordinate entry.");
[
  "Manage your delivery assignments and availability",
  "Today assigned deliveries",
  "Completed deliveries",
  "Active delivery",
  "Assigned deliveries",
  "28 unread updates",
  "Open notifications",
  "Track your Captain onboarding",
  "Profile photo URL optional",
  "Device upload is not enabled in this build",
  "Preferred areas, comma-separated",
  "Update manual coordinates"
].forEach((value) => expect(!dashboard.includes(value), `Operational Home must not contain legacy text: ${value}`));

expect(applicationStatus.includes("timelineFor(category, projection.active)"), "Application status timeline must use operational activation state.");
expect(applicationStatus.includes("Operations activated"), "Application status timeline must show completed operations activation for active modes.");
expect(applicationStatus.includes("Current Captain profile"), "Application status must label projected active profile location data.");
expect(!applicationStatus.includes("residentialLocation?.label || anyApplication.pilotCity || \"Not provided\""), "Application status must not show legacy Not provided location fallbacks.");

expect(notifications.includes("Mark all read"), "Notifications screen must support mark-all-read.");
expect(notifications.includes("notificationsApi.markRead"), "Notifications screen must mark individual notifications read.");
expect(notifications.includes("notificationsApi.markAllRead"), "Notifications screen must persist mark-all-read.");
expect(notifications.includes("No notifications yet. Updates about assignments, applications and your Captain account will appear here."), "Notifications screen must include the approved empty state.");
expect(notifications.includes("targetFor") && notifications.includes("/taxi-readiness") && notifications.includes("/application-status") && notifications.includes("/earnings"), "Notifications must validate safe deep-link targets.");
expect(notifications.includes("categoryIcon"), "Notifications must show category icons.");
expect(notificationsApi.includes("notifications/unread-count"), "Notifications API must expose unread count.");
expect(notificationsApi.includes("read-all") && notificationsApi.includes("/read"), "Notifications API must support read persistence.");

expect(jobsIndex.includes("Delivery activation pending"), "Deliveries tab must show compact pending state for inactive Delivery mode.");
expect(jobsIndex.includes('Screen title="Deliveries"'), "Deliveries tab heading must be Deliveries.");
expect(jobsIndex.includes("Today assigned") && jobsIndex.includes("Completed") && jobsIndex.includes("Cancelled") && jobsIndex.includes("Delivery earnings"), "Deliveries tab must own Delivery summary stats.");
expect(jobsIndex.includes("Active delivery"), "Deliveries tab must own active Delivery workflow.");
expect(jobsIndex.includes("Assigned jobs"), "Deliveries tab must keep assigned jobs as a section.");
expect(jobsIndex.includes("Delivery history"), "Deliveries tab must own Delivery history.");
expect(jobDetail.includes("Accept job") && jobDetail.includes("Reject job"), "Delivery detail must support accept/reject actions.");
expect(jobDetail.includes("Complete delivery") && jobDetail.includes("Delivery completed successfully."), "Delivery detail must support OTP completion.");

expect(earnings.includes("projectCaptainOperationalState"), "Earnings must use state-aware Captain projection.");
expect(earnings.includes("Track your KariGO Captain earnings."), "Earnings subtitle must use production Captain copy.");
expect(earnings.includes("Total earnings") && earnings.includes("Pending payout") && earnings.includes("Paid") && earnings.includes("Ride earnings") && earnings.includes("Delivery earnings"), "Earnings must show combined Ride and Delivery totals.");
expect(earnings.includes("Your earnings will appear here after you complete a Ride or Delivery."), "Earnings must have a clean zero state.");
expect(earnings.includes("Earnings history"), "Earnings must present a combined history list.");
expect(!earnings.includes("Earnings locked"), "Earnings must not be locked when any Captain mode is active.");
expect(!earnings.includes("Track delivery earnings") && !earnings.includes("Completed delivery earnings"), "Earnings must not use Delivery-only copy.");

expect(profile.includes("Captain access"), "Profile must show independent mode summary.");
expect(profile.includes("captainVehicleTypes"), "Profile must humanise vehicle catalogue values.");
expect(profile.includes("Notifications") && profile.includes("unread"), "Profile must include compact Notifications entry.");
expect(profile.includes("setBiometricSignIn") && profile.includes("Privacy Policy") && profile.includes("Terms"), "Profile must include biometric controls and legal links.");
expect(profile.includes("/notifications"), "Profile notifications row must link to Notifications.");
[
  "Profile photo URL optional",
  "Device upload is not enabled in this build",
  "Preferred areas, comma-separated",
  "manual latitude",
  "manual longitude",
  "Update manual coordinates",
  "Assigned deliveries",
  "Open Notifications"
].forEach((value) => expect(!profile.includes(value), `Profile must not contain legacy field or duplicate nav text: ${value}`));

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
