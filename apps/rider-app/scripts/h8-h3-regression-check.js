const fs = require("node:fs");
const path = require("node:path");

const appRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(appRoot, relativePath), "utf8");
const dashboard = read("app/tabs/dashboard.tsx");
const home = read("src/components/captain-home-cockpit.tsx");

const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };
const section = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const masterToggle = section(dashboard, "async function toggleOverallAvailability", "const deliveryApplicationExists");
const launchGates = section(dashboard, "const canToggle =", "const launchMessages");
const foregroundSync = section(dashboard, "function syncActiveWork", "function stopCaptainWatcher");

expect(dashboard.includes("useState(true)") && dashboard.includes("launchAvailabilityLoading"), "1. Launch availability must begin in a fail-closed loading state.");
expect(launchGates.includes("deliveryLaunch?.available === true") && launchGates.includes("rideLaunch?.available === true"), "2. A service must be explicitly available before Captain can start it.");
expect(!launchGates.includes("available !== false"), "3. Missing launch data must never be inferred as available.");
expect(launchGates.includes("canStartDelivery") && launchGates.includes("canStartRide"), "4. Start permission must be separate from saved work preferences.");
expect(masterToggle.includes("canStartDelivery") && masterToggle.includes("canStartRide"), "5. Mixed-mode GO ONLINE must submit only launch-authorized modes.");
expect(dashboard.includes("effectiveDeliveryOnline || workState.effectiveRideOnline") && dashboard.includes("updated.effectiveDeliveryOnline || updated.effectiveRideOnline"), "6. Button intent and success must use authoritative effective state.");
expect(masterToggle.includes('setMessage("You\'re online and ready for requests.")') && masterToggle.includes("if (goOnline && effectiveOnline)"), "7. Online success must require an effective returned mode.");
expect(dashboard.includes("message === \"You're online and ready for requests.\"") && dashboard.includes("setMessage(\"\")"), "8. A later authoritative offline state must clear stale online success.");
expect(home.includes('"CHECKING AVAILABILITY..."') && home.includes('"UPDATING..."') && home.includes('"GO OFFLINE"'), "9. Button labels must cover checking, updating, online, and offline states.");
expect(home.includes("rideDesiredOnline") && home.includes("rideEffectiveOnline") && home.includes("Preference saved — unavailable"), "10. Saved preference and effective request receipt must be presented separately.");
expect(foregroundSync.includes("launchApi.myAvailability") && foregroundSync.includes("setLaunchAvailability(launchState)"), "11. Foreground/resume synchronization must refresh authoritative launch availability.");
expect(foregroundSync.includes("setLaunchAvailability(null)") && foregroundSync.includes("setLaunchAvailabilityLoading(false)"), "12. Failed launch refreshes must stay fail closed.");
expect(dashboard.includes('if (active) void syncActiveWork("foreground")'), "13. OFF to OPERATIONS_ONLY becomes actionable on foreground without manual refresh.");
expect(dashboard.includes("subscribeToCaptainAssignmentNotifications") && dashboard.includes("assignmentSyncInFlightRef"), "14. Assignment takeover and sync deduplication must remain intact.");
expect((dashboard.match(/setInterval\(/g) || []).length === 1, "15. The launch refresh must not introduce another polling loop.");

if (failures.length) {
  console.error("Captain H8-H3 regression failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Captain H8-H3 regression passed.");
