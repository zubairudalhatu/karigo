const fs = require("node:fs");
const path = require("node:path");

const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "../..");
const readApp = (relativePath) => fs.readFileSync(path.join(appRoot, relativePath), "utf8");
const readRepo = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const launchApi = readApp("src/api/launch.api.ts");
const dashboard = readApp("app/tabs/dashboard.tsx");
const cockpit = readApp("src/components/captain-home-cockpit.tsx");
const controller = readRepo("services/backend-api/src/modules/launch-operations/launch-operations.controller.ts");
const service = readRepo("services/backend-api/src/modules/launch-operations/launch-operations.service.ts");
const quickLaunch = readRepo("services/backend-api/src/modules/launch-operations/quick-launch.service.ts");

const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };
const section = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const captainAvailability = section(service, "async captainAvailability", "async configs");
const captainCapability = section(service, "private async resolveCaptainCapabilityEligibility", "async controlledSupplyAccountEligible");
const rideCapacity = section(service, "if (config.serviceType === LaunchServiceType.RIDES)", "if (config.serviceType === LaunchServiceType.SME_SERVICES)");
const customerStart = section(service, "async assertCustomerCanStart", "async publicAvailability");
const publicAvailability = section(service, "async publicAvailability", "async captainAvailability");
const launchGates = section(dashboard, "const canToggle =", "const launchMessages");
const foregroundSync = section(dashboard, "function syncActiveWork", "function stopCaptainWatcher");

expect(launchApi.includes("launch/availability/me/captain"), "1. Captain app must call the dedicated authenticated Captain availability endpoint.");
expect(controller.includes('@Get("availability/me/captain")') && controller.includes("captainAvailability(query.city, query.zoneId, user.id)"), "2. Backend must expose the authenticated Captain availability route.");
expect(captainAvailability.includes('actorContext: "CAPTAIN"'), "3. Captain route must request explicit Captain actor context.");
expect(captainAvailability.includes("enforceCapacity: false"), "4. Supply activation must not be capacity-deadlocked.");
expect(captainCapability.includes("controlledSupply.captainEligibility"), "5. Captain context must be verified from authoritative capability records.");
expect(captainCapability.includes("NOT_IN_CONTROLLED_GROUP") && captainCapability.includes("MEMBERSHIP_ACTIVATION_PENDING"), "6. Operations-only Captain access must require enabled controlled membership.");
expect(captainCapability.includes("currentGpsArea?.id") && captainCapability.includes("captainOperatingAreaFromText"), "7. Captain availability must use current operational GPS area.");
expect(captainCapability.includes("LOCATION_NOT_CURRENT") && captainCapability.includes("CONTROLLED_ACCESS_NOT_ENABLED"), "8. Captain blockers must return precise safe reasons.");
expect(rideCapacity.includes("taxiDriverProfile.findMany") && !rideCapacity.includes("city: cityFilter"), "9. Ride supply must not be counted exclusively by residential/profile city.");
expect(rideCapacity.includes("captainOperatingAreaFromCoordinates") && rideCapacity.includes("captainIsApprovedForOperatingArea"), "10. Ride supply count must require fresh current and approved operating area.");
expect(customerStart.includes("participantRole: UserRole.CUSTOMER") && customerStart.includes("enforceCapacity: true"), "11. Customer demand must retain explicit Customer context and capacity enforcement.");
expect(publicAvailability.includes("enforceCapacity: true"), "12. Public demand availability must retain capacity enforcement.");
expect(service.includes("input.participantRole ?? user?.role") && !captainCapability.includes("user?.role") && !captainCapability.includes("user.update"), "13. Legacy role fallback may remain for existing consumers but must not authorize Captain context or mutate User.role.");
expect(launchGates.includes("rideLaunch?.available === true") && launchGates.includes("deliveryLaunch?.available === true"), "14. GO ONLINE must remain fail-closed until authoritative Captain availability succeeds.");
expect(dashboard.includes('setMessage("You\'re online and ready for requests.")') && cockpit.includes("LOOKING FOR REQUESTS"), "15. Confirmed effective online state must show success and the looking-for-requests cockpit.");
expect(dashboard.includes("rideLaunch.message") && !dashboard.includes("`Rides aren't open in ${mapState.area} yet.`"), "16. Captain-specific launch denials must display backend-safe reasons.");
expect(foregroundSync.includes("launchApi.myAvailability") && foregroundSync.includes("setLaunchAvailability(launchState)"), "17. Foreground sync must refresh the authoritative stage and enable GO ONLINE after transition.");
expect(!quickLaunch.includes("automaticMatching: true") && !quickLaunch.includes("autoMatching: true"), "18. Quick Launch must not enable automatic matching.");

if (failures.length) {
  console.error("Captain H8-H5 regression failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Captain H8-H5 regression passed.");
