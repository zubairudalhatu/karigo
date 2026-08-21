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
const googleServices = readJson("google-services.json");
const firebaseAndroidPackages = googleServices.client.map((client) => client.client_info?.android_client_info?.package_name);
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
const networkErrors = read("src/lib/network-errors.ts");
const reliableGet = read("src/api/reliable-get.ts");
const earningsApi = read("src/api/earnings.api.ts");
const sharedApi = read("../../packages/config/src/api.ts");
const captainCatalogApi = read("src/api/captain-catalog.api.ts");
const locationHelper = read("src/lib/location.ts");
const captainNotifications = read("src/lib/captain-notifications.ts");
const backgroundLocation = read("src/lib/background-location.ts");
const rideWorkspace = read("src/components/captain-ride-workspace.tsx");
const captainHome = read("src/components/captain-home-cockpit.tsx");
const launchApi = read("src/api/launch.api.ts");
expect(launchApi.includes("launch/availability/me"), "Captain app must resolve city/service launch state from backend.");
expect(dashboard.includes("Your online preference is preserved; existing assignments remain available."), "Captain app must preserve safe active-work continuity during a launch pause.");
expect(dashboard.includes("deliveryLaunch?.available === true") && dashboard.includes("rideLaunch?.available === true") && !dashboard.includes("available !== false"), "Captain availability toggles must fail closed until backend launch state explicitly allows them.");

const stagingProfile = easJson.build?.["rider-staging"];
const productionProfile = easJson.build?.["captain-production"];

expect(!JSON.stringify(packageJson).includes("eas-cli"), "Captain app must not depend on eas-cli.");
expect(packageJson.dependencies?.["expo-updates"] === "~0.28.18", "Captain app must use Expo SDK 53-compatible expo-updates.");
expect(packageJson.dependencies?.["expo-location"] === "~18.1.6", "Captain app must use Expo SDK 53-compatible location support.");
expect(packageJson.dependencies?.["expo-notifications"] === "~0.31.5", "Captain app must use Expo SDK 53-compatible push notifications.");
expect(packageJson.dependencies?.["expo-task-manager"] === "~13.1.6", "Captain app must use Expo SDK 53-compatible background tasks.");
expect(packageJson.dependencies?.["expo-device"] === "~7.1.4", "Captain app must use Expo SDK 53-compatible device registration.");
expect(packageJson.dependencies?.["@react-native-community/netinfo"] === "11.4.1", "Captain app must use the approved connectivity listener.");
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
expect(appConfig.includes('version: "1.1.0"'), "Captain app version must create the native H7 runtime 1.1.0 boundary.");
expect(appConfig.includes("versionCode: isStaging ? 1 : 15"), "Captain production versionCode must be 15 for the Captain 1.1 native dispatch AAB.");
expect(appConfig.includes('googleServicesFile: "./google-services.json"'), "Captain production Android config must include the approved Firebase client configuration.");
expect(firebaseAndroidPackages.length === 1 && firebaseAndroidPackages[0] === "com.karigo.rider", "Firebase Android client configuration must belong only to com.karigo.rider.");
expect(Boolean(googleServices.project_info?.project_number), "Firebase Android client configuration must include its project identity.");
expect(appConfig.includes('"android.permission.SYSTEM_ALERT_WINDOW"') && appConfig.includes("allowBackup: false"), "Captain production must block overlay access and Android backup.");
expect(appConfig.includes('icon: "./assets/icon.png"'), "Captain config must use the approved fallback launcher icon.");
expect(appConfig.includes('foregroundImage: "./assets/adaptive-icon-foreground.png"'), "Captain config must use the approved adaptive K foreground.");
expect(appConfig.includes('monochromeImage: "./assets/adaptive-icon-monochrome.png"'), "Captain config must use the approved themed K silhouette.");
expect(appConfig.includes('"../../scripts/with-approved-android-launcher-icons.cjs"'), "Captain config must preserve approved Android fallback launchers.");
expect(appConfig.includes('backgroundColor: "#111111"'), "Captain adaptive icon must use the approved black background.");
expect(easJson.build?.["captain-play-internal"]?.channel === "captain-production", "Captain Play Internal profile must use the production channel.");
expect(easJson.submit?.["captain-play-internal"]?.android?.track === "internal", "Captain Play submit profile must target Internal testing.");
expect(productionProfile?.env?.EXPO_PUBLIC_RIDES_CONTROLLED_PILOT_ENABLED === "false", "Captain production must disable the controlled-pilot flag.");
expect(productionProfile?.env?.EXPO_PUBLIC_TAXI_STAGING_DISPATCH_ENABLED === "false", "Captain production must disable staging dispatch.");
expect(JSON.stringify(appJson.expo.plugins).includes("expo-build-properties"), "Captain app base config must include build-properties.");
expect(JSON.stringify(appJson.expo.plugins).includes("with-approved-android-launcher-icons.cjs"), "Captain app base config must preserve approved Android fallback launchers.");
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
expect(rootLayout.includes('import "../src/lib/background-location"'), "Root layout must register the background location task at startup.");
expect(appConfig.includes("isAndroidBackgroundLocationEnabled: true") && appConfig.includes("isIosBackgroundLocationEnabled: true"), "Captain native config must enable active-work background location.");
expect(appConfig.includes('"expo-notifications"') && appConfig.includes('defaultChannel: "captain-assignments"'), "Captain native config must register assignment notifications.");
expect(captainAccessBootstrap.includes("router.replace(access.nextStep === \"APPLICATION_STATUS\" ? \"/application-status\" : access.nextRoute)"), "Captain access bootstrap must route operational Captains through backend nextRoute.");
expect(riderNav.includes("Home") && riderNav.includes("Work") && riderNav.includes("Earnings") && riderNav.includes("Profile"), "Captain bottom nav must expose Home, Work, Earnings and Profile.");
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
expect(locationHelper.includes("timeInterval: 30_000") && locationHelper.includes("distanceInterval: strongAccuracy ? 15 : 25"), "Captain GPS watcher must preserve the active-work floor and use a battery-conscious local threshold.");

expect(dashboard.includes("projectCaptainOperationalState"), "Home must use state-aware Captain projection.");
expect(dashboard.includes("karigo-logo.png"), "Home must use compact KariGO branding.");
expect(dashboard.includes("react-native-maps") && dashboard.includes("MapView") && dashboard.includes("Marker"), "Home must mount the native Google map, not a placeholder panel.");
expect(dashboard.includes('accessibilityLabel="Notifications"'), "Home header must include an accessible notification bell.");
expect(dashboard.includes("unread > 99 ? \"99+\" : unread"), "Home unread badge must cap at 99+.");
expect(dashboard.includes("AppState.addEventListener"), "Home must refresh unread count on foreground.");
expect(dashboard.includes("Live map"), "Home must show the live map card.");
expect(dashboard.includes("vehicleMarker") && dashboard.includes("mapFooter"), "Home map must show a Captain position marker and compact service-area footer.");
expect(dashboard.includes("Location unavailable"), "Home map must include a safe unavailable state.");
expect(!dashboard.includes("Refresh GPS") && dashboard.includes("Retry location"), "Home must remove normal-workflow GPS refresh while retaining diagnostics-only retry.");
expect(dashboard.includes("watcherRef") && dashboard.includes("watchCaptainForegroundLocation"), "Home must start one foreground GPS watcher while online or assigned.");
expect(dashboard.includes("watcherStartingRef") && dashboard.includes("stopCaptainWatcher"), "Home must prevent duplicate GPS watchers and stop them on lifecycle changes.");
expect(dashboard.includes("backoffUntilRef") && dashboard.includes("failureCountRef"), "Home must back off failed automatic GPS uploads.");
expect(dashboard.includes("captain_gps_watcher_started") && dashboard.includes("captain_gps_watcher_stopped"), "Home must log safe GPS watcher diagnostics.");
expect(dashboard.includes("uploadCaptainLocation"), "Home must upload automatic Captain GPS refreshes to backend work-state.");
expect(dashboard.includes("assignmentSyncInFlightRef") && dashboard.includes("syncActiveWork"), "Home must use one deduplicated active-work sync coordinator.");
expect(dashboard.includes("online_idle_fallback") && dashboard.includes("12_000"), "Online-idle fallback sync must use a battery-conscious 12-second interval.");
expect(dashboard.includes("AppState.addEventListener") && dashboard.includes('syncActiveWork("foreground")'), "Foreground resume must resync authoritative work.");
expect(dashboard.includes("NetInfo.addEventListener") && dashboard.includes("connectivity_restored"), "Connectivity restoration must resync authoritative work.");
expect(captainNotifications.includes("addNotificationReceivedListener") && captainNotifications.includes("addNotificationResponseReceivedListener"), "Captain push receipt and tap handlers must refresh assignments.");
expect(captainNotifications.includes("registerDeviceToken") && captainNotifications.includes("RIDER_APP"), "Captain app must register its authenticated Expo token.");
expect(backgroundLocation.includes("hasStartedLocationUpdatesAsync") && backgroundLocation.includes("stopLocationUpdatesAsync"), "Background tracking must run only as one controlled active-work task.");
expect(rideWorkspace.includes("NEW KARIGO RIDE") && rideWorkspace.includes("ACCEPT RIDE") && rideWorkspace.includes("PIN REQUIRED") && rideWorkspace.includes("COMPLETE RIDE"), "Ride takeover workspace must cover the full Captain lifecycle.");
expect(dashboard.includes("captainAccessApi.updateAvailability(toOperationalLocationPayload(location))"), "Home GPS refresh must submit a sanitized location-only update without mutating availability.");
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
expect(notifications.includes("targetFor") && notifications.includes("/tabs/dashboard") && notifications.includes("/application-status") && notifications.includes("/earnings"), "Ride notifications must deep-link to the active cockpit.");
expect(notifications.includes("categoryIcon"), "Notifications must show category icons.");
expect(notificationsApi.includes("notifications/unread-count"), "Notifications API must expose unread count.");
expect(notificationsApi.includes("read-all") && notificationsApi.includes("/read"), "Notifications API must support read persistence.");

expect(jobsIndex.includes('Screen title="Work"'), "Combined work tab heading must be Work.");
expect(jobsIndex.includes("Active") && jobsIndex.includes("Work history"), "Work tab must expose active and chronological history sections.");
expect(jobsIndex.includes("taxiApi.trips") && jobsIndex.includes("jobsApi.list"), "Work tab must combine Ride and Delivery authority.");
expect(jobsIndex.includes('href="/tabs/dashboard"') && jobsIndex.includes('href={`/jobs/${activeDelivery.id}`}'), "Work tab must route both active assignment modes.");
expect(jobsIndex.includes("Ride") && jobsIndex.includes("Delivery"), "Work tab must label both work types.");
expect(jobDetail.includes("Accept job") && jobDetail.includes("Reject job"), "Delivery detail must support accept/reject actions.");
expect(jobDetail.includes("Complete delivery") && jobDetail.includes("Delivery completed successfully."), "Delivery detail must support OTP completion.");

expect(earnings.includes("projectCaptainOperationalState"), "Earnings must use state-aware Captain projection.");
expect(earnings.includes("A clear view of your Captain income."), "Earnings subtitle must use concise production Captain copy.");
expect(earnings.includes("Pending payout") && earnings.includes("Paid") && earnings.includes("Ride earnings") && earnings.includes("Delivery earnings"), "Earnings must show combined Ride and Delivery totals.");
expect(earnings.includes("Completed Captain earnings will appear here."), "Earnings must have a clean zero state.");
expect(earnings.includes("Earnings history"), "Earnings must present a combined history list.");
expect(!earnings.includes("Earnings locked"), "Earnings must not be locked when any Captain mode is active.");
expect(!earnings.includes("Track delivery earnings") && !earnings.includes("Completed delivery earnings"), "Earnings must not use Delivery-only copy.");

expect(profile.includes("workPreference") && profile.includes("projection.ride.active") && profile.includes("projection.delivery.active"), "Profile must show independent mode summary.");
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
expect(taxiApi.includes("rider/taxi/profile") && taxiApi.includes("rider/taxi/trips/available") && taxiApi.includes('rider/taxi/trips"'), "Ride API client must expose active assignments and history.");
expect(!taxiReadiness.includes("Pay Now") && !taxiReadiness.includes("cashout"), "Ride screen must not expose payment or cashout actions.");

expect(dashboard.includes("Your Ride Captain access is approved for scheduled controlled production operations."), "Controlled Ride Captains must see the operations-only operating-window message.");
expect(dashboard.includes("Your Delivery Captain access is approved for scheduled controlled production operations."), "Controlled Delivery Captains must see the operations-only operating-window message.");
expect(dashboard.includes('launchStage === "OPERATIONS_ONLY"'), "Captain operations-only messages must depend on backend launch eligibility.");
expect(networkErrors.includes("You're offline. We'll reconnect when your connection returns."), "Actual Captain network failures must use offline messaging.");
expect(networkErrors.includes("Some information could not be refreshed. Tap to retry."), "Secondary GET timeouts must use non-contradictory refresh messaging.");
expect(networkErrors.includes("KariGO is taking longer than expected. Try again."), "Critical Captain timeouts must use server-delay messaging.");
expect(!networkErrors.includes("Please check your connection"), "Captain timeout mapping must not claim every timeout is an internet outage.");
expect(reliableGet.includes("retryOnNetworkFailure: true") && reliableGet.includes("retryOnTemporaryFailure: true"), "Captain idempotent GETs must allow one safe temporary-failure retry.");
expect(sharedApi.includes("retryDelayMs") && sharedApi.includes("Math.random()") && sharedApi.includes("!hasRetried"), "Shared API retry must remain one attempt with short jitter.");
[captainAccessApi, notificationsApi, launchApi, earningsApi].forEach((source) => expect(source.includes("captainGetOptions"), "Captain Home GET wrappers must opt into safe retries."));
expect(!captainAccessApi.slice(captainAccessApi.indexOf("updateAvailability")).includes("captainGetOptions"), "Availability mutation must never opt into automatic retry.");
expect(dashboard.includes("loadInFlightRef") && dashboard.includes("loadAbortRef") && dashboard.includes("controller.signal"), "Captain Home must deduplicate refresh calls and cancel stale requests on unmount.");
expect(dashboard.includes("secondaryRefreshFailed") && dashboard.includes("captainRequestMessage(e, \"secondary\")"), "Captain Home must separate non-critical refresh failures from critical errors.");
expect(dashboard.includes("lastLocationSuccessAtRef") && dashboard.includes('setRefreshNotice("")') && dashboard.includes('setMessage("Location refreshed.")'), "Successful GPS refresh must clear unrelated secondary timeout messaging.");
expect(captainHome.includes("CaptainHomeCockpit") && captainHome.includes("MapView") && captainHome.includes("StyleSheet.absoluteFillObject") && !captainHome.includes("<Screen"), "Captain Home must use a fixed map-first cockpit.");
expect(captainHome.includes("showPreferences") && captainHome.includes("Work preferences") && captainHome.includes("preferencesSheet"), "Captain Home must expose preferences as a contextual overlay.");
expect(captainHome.includes("LOOKING FOR REQUESTS") && captainHome.includes("GO ONLINE") && captainHome.includes("GO OFFLINE"), "Captain Home must provide fixed one-glance online and offline actions.");
expect(captainHome.includes('accessibilityRole="switch"') && captainHome.includes("accessibilityState"), "Captain Home preferences must expose accessible toggle semantics.");
expect(captainHome.includes("availabilityUpdating") && captainHome.includes("UPDATING..."), "Captain availability controls must prevent repeated submissions.");
expect(dashboard.includes("Today") && dashboard.includes("This week") && dashboard.includes('href="/earnings"'), "Captain Home must include a compact earnings shortcut backed by existing summary data.");
expect(profile.includes("displayName") && profile.includes("captainCode") && profile.includes("projection.overallStatus"), "Captain Profile must organize identity and status clearly.");
expect(profile.includes("Work preferences") && profile.includes("Ride on") && profile.includes("Delivery on"), "Captain Profile must summarize supported work preferences without inventing backend settings.");
expect(profile.includes("approvedOperatingAreas"), "Captain Profile must project backend-approved operating areas.");
expect(!profile.includes(">Operating areas require review<"), "Captain Profile must not show the old generic operating-area warning.");
expect(profile.includes("Automatic matching and auto-accept remain off."), "Captain Profile must preserve manual controlled matching guardrails.");
expect(profile.includes("Safety Centre") && profile.includes("Support") && profile.includes("Report an issue"), "Captain Profile must expose clear safety and support actions.");
expect(earnings.includes("TODAY") && earnings.includes("THIS WEEK") && earnings.includes("Pending payout") && earnings.includes("Paid"), "Captain Earnings must preserve today, week, pending and paid settlement hierarchy.");
expect(jobsIndex.includes("deliveryRoute") && jobsIndex.includes("→") && jobsIndex.includes("formatKobo(row.amount)") && jobsIndex.includes("formatNaira(row.amount)"), "Captain Work history must show safe routes with explicit Ride Kobo and Delivery Naira amounts.");
expect(jobDetail.includes("Payment method:") && jobDetail.includes("Activity") && jobDetail.includes("Contact KariGO Support"), "Captain work detail must preserve payment/lifecycle data and add a support action.");
expect(jobDetail.includes("without sharing unnecessary Customer details"), "Captain support detail must reinforce Customer privacy.");
expect(locationHelper.includes("timeInterval: 30_000") && (locationHelper.match(/watchPositionAsync/g) || []).length === 1, "Captain must preserve one throttled foreground watcher implementation.");
expect(captainHome.includes("props.area"), "Home must project the GPS-resolved operating area.");
expect(captainHome.includes("Recenter map on current location") && captainHome.includes("crosshair"), "Home must expose a compact local-only recenter control.");
expect(captainHome.includes("CaptainHomeSkeleton"), "Home must render a recognisable startup skeleton instead of a blank screen.");
expect(profile.includes("rideProfile?.approvedOperatingAreas") && profile.includes("deliveryProfile?.approvedOperatingAreas"), "Profile must show approved operating areas per mode.");
expect(profile.includes("rideProfile?.approvedOperatingAreas") && profile.includes("deliveryProfile?.approvedOperatingAreas"), "Captain Profile must preserve multi-city approved areas per mode.");


if (failures.length) {
  console.error("Captain regression check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Captain regression check passed.");
