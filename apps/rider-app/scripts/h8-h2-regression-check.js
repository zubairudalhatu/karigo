const fs = require("node:fs");
const path = require("node:path");

const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "../..");
const readApp = (relativePath) => fs.readFileSync(path.join(appRoot, relativePath), "utf8");
const readRepo = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const dashboard = readApp("app/tabs/dashboard.tsx");
const home = readApp("src/components/captain-home-cockpit.tsx");
const location = readApp("src/lib/location.ts");
const background = readApp("src/lib/background-location.ts");
const taxiReadiness = readApp("app/taxi-readiness.tsx");
const networkErrors = readApp("src/lib/network-errors.ts");
const work = readApp("app/jobs/index.tsx");
const projection = readApp("src/lib/captain-operational-state.ts");
const quickLaunch = readRepo("services/backend-api/src/modules/launch-operations/quick-launch.service.ts");
const adminLaunch = readRepo("apps/admin-portal/app/production-launch/page.tsx");

const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };
const section = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const serializer = section(location, "export function toOperationalLocationPayload", "export type CaptainLocationErrorCode");
const deliveryToggle = section(dashboard, "async function toggleDelivery", "async function toggleRide");
const rideToggle = section(dashboard, "async function toggleRide", "async function toggleOverallAvailability");
const operationalUpload = section(dashboard, "async function uploadCaptainLocation", "async function refreshGps");
const readinessHeartbeat = section(dashboard, "function promoteReadinessLocation", "useEffect(() => {");

expect(location.includes("isApproximate?: boolean"), "1. CaptainLocation must retain local approximate metadata.");
expect(serializer.includes("latitude") && serializer.includes("longitude") && serializer.includes("accuracyMeters") && !serializer.includes("isApproximate"), "2. Operational serializer must allow only backend location fields.");
expect(dashboard.includes("toOperationalLocationPayload(currentLocation)") && !dashboard.includes("...(currentLocation ? currentLocation"), "3. Master GO ONLINE must sanitize device location metadata.");
expect(rideToggle.includes("toOperationalLocationPayload(currentLocation)"), "4. Ride-only availability must sanitize location.");
expect(deliveryToggle.includes("toOperationalLocationPayload(currentLocation)"), "5. Delivery-only availability must sanitize location.");
expect(operationalUpload.includes("updateAvailability(toOperationalLocationPayload(location))") && background.includes("toOperationalLocationPayload"), "6. Foreground and background operational uploads must sanitize location.");
expect(location.includes("Allow precise location to go online for Ride and Delivery work.") && networkErrors.includes("Allow precise location to go online."), "7. Approximate fixes must produce human precise-location guidance.");
expect(networkErrors.includes('message.includes("should not exist")') && networkErrors.includes("We couldn't take you online. Please try again.") && dashboard.includes("captainAvailabilityErrorMessage"), "8. DTO/database messages must be mapped before reaching Captain UI.");
expect(dashboard.includes("projection.hasAnyActiveMode && isForeground && !locationAutoBlocked") && dashboard.includes("recordLocalMapLocation(location)"), "9. Offline foreground local map tracking must remain current.");
expect(readinessHeartbeat.includes("toOperationalLocationPayload(location)") && !readinessHeartbeat.includes("deliveryOnline") && !readinessHeartbeat.includes("rideOnline"), "10. Readiness heartbeat must not change online state.");
expect(dashboard.includes("READINESS_HEARTBEAT_INTERVAL_MS = 10 * 60_000") && dashboard.includes("readinessHeartbeatInFlightRef") && readinessHeartbeat.includes("previousIsRecent"), "11. Readiness heartbeat must be strongly throttled and deduplicated.");
expect(quickLaunch.includes('"Location verified — Offline"') && quickLaunch.includes('LOCATION_STALE: "GPS stale"') && adminLaunch.includes("locationReadiness"), "12. Quick Launch must distinguish fresh offline GPS from stale GPS.");
expect(work.includes("!projection.hasAnyActiveMode") && projection.includes("operationalModes.includes") && work.includes('"Offline"'), "13. Approved offline Captains must not be labelled activation pending.");
expect(home.includes("return <View style={styles.cockpit}") && !home.includes("<Screen") && home.includes("flex: 1, overflow: \"hidden\""), "14. Normal Home must be a fixed non-scrollable cockpit.");
expect(home.includes('left: "50%"') && home.includes("marginLeft: -50") && home.includes("earningsShortcut"), "15. Earnings must remain fixed and visually centred.");
expect(home.includes("actionSurface") && home.includes('position: "absolute"') && home.includes("actionBottom"), "16. GO ONLINE/OFFLINE control must remain fixed above navigation.");
expect(home.includes("showPreferences ? <View style={styles.overlay}") && home.includes("preferencesSheet") && home.includes("Approved areas"), "17. Work preferences must open as a dismissible overlay.");
expect(dashboard.includes("subscribeToCaptainAssignmentNotifications") && dashboard.includes("assignmentSyncInFlightRef"), "18. Assignment takeover must remain intact.");
expect(dashboard.includes("movedMeters < 20") && dashboard.includes("uploadAgeMs < 30_000") && background.includes("CAPTAIN_BACKGROUND_LOCATION_TASK"), "19. Online and active-work GPS safeguards must remain intact.");
expect((dashboard.match(/setInterval\(/g) || []).length === 1 && (location.match(/watchPositionAsync/g) || []).length === 1, "20. No duplicate polling or foreground watcher loops may be introduced.");

if (failures.length) {
  console.error("Captain H8-H2 regression failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Captain H8-H2 regression passed.");
