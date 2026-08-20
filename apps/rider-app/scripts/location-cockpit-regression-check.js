const fs = require("node:fs");
const path = require("node:path");

const appRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(appRoot, relativePath), "utf8");
const dashboard = read("app/tabs/dashboard.tsx");
const home = read("src/components/captain-home-cockpit.tsx");
const location = read("src/lib/location.ts");
const backgroundLocation = read("src/lib/background-location.ts");
const work = read("app/jobs/index.tsx");

const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };
const between = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));

expect(dashboard.includes("projection.hasAnyActiveMode && isForeground && !locationAutoBlocked"), "Offline foreground Captains must keep one local map watcher.");
expect(dashboard.includes("recordLocalMapLocation(location)") && dashboard.includes("operationalLocationRequiredRef.current && !location.isApproximate") && dashboard.includes("void uploadCaptainLocation"), "Local watcher samples must update the marker before any precise conditional operational upload.");
expect(between(dashboard, "async function recenterLocalMap", "useEffect(() => {").includes("acquireLocalMapLocation") && !between(dashboard, "async function recenterLocalMap", "useEffect(() => {").includes("updateAvailability"), "Recenter must be local-only and must not mutate backend availability.");
expect(dashboard.includes('stopCaptainWatcher("background")'), "The foreground local watcher must stop when the app backgrounds.");
expect(dashboard.includes("operationalLocationRequiredRef.current") && dashboard.includes("movedMeters < 20") && dashboard.includes("uploadAgeMs < 30_000"), "Online operational uploads must preserve movement and time thresholds.");
expect(dashboard.includes("watcherRef.current") && dashboard.includes("watcherStartingRef.current") && dashboard.includes("localLocationRequestRef.current"), "Watcher and fresh-fix requests must be deduplicated.");
expect(dashboard.includes('if (workState?.activeWorkMode)') && dashboard.includes("enableActiveWorkBackgroundLocation") && backgroundLocation.includes("karigo-captain-active-work-location"), "Background tracking must remain scoped to assigned work.");
expect(dashboard.includes('source: "Current location"') && dashboard.includes('source: "Last known location"') && dashboard.includes("priority: 0"), "Fresh local coordinates must win while stored coordinates remain clearly last-known.");
expect(home.includes("Recenter map on current location") && home.includes("animateToRegion") && !home.includes("updateAvailability"), "Map recenter must change only the camera.");
expect(dashboard.includes("if (!projection.hasAnyActiveMode || !isForeground) return") && dashboard.includes("acquireLocalMapLocation().catch"), "Foreground open and resume must request a local map fix.");
expect(dashboard.includes("localLocationForOnlineTransition") && dashboard.includes("ONLINE_LOCATION_REUSE_MS") && dashboard.includes("requestCaptainForegroundLocation(strong)"), "Offline-to-online transition must reuse a fresh precise local fix or acquire one operational-quality fix.");
expect(location.includes("getForegroundPermissionsAsync") && location.includes("permission.canAskAgain") && location.includes("PRECISE_REQUIRED") && location.includes("ACQUISITION_TIMEOUT"), "Permission, precise-location and timeout states must use explicit human-safe handling.");
expect(dashboard.includes("assignmentSyncInFlightRef") && dashboard.includes("subscribeToCaptainAssignmentNotifications") && (dashboard.match(/setInterval\(/g) || []).length === 1, "Assignment takeover and the single fallback polling loop must remain intact.");
expect(work.includes('"Offline"') && work.includes("Go online from Home when you're ready to receive requests.") && work.includes('"Ride in progress"') && work.includes('"Delivery in progress"'), "Work status wording must distinguish offline, idle and busy states.");
expect(home.includes("firstFreshLocationCenteredRef") && !home.includes("region={props.region}"), "The map may centre on the first fresh fix without fighting later manual movement.");

if (failures.length) {
  console.error("Captain location cockpit regression failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Captain location cockpit regression passed.");
