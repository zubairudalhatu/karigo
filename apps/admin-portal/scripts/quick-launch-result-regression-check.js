const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const page = fs.readFileSync(path.join(root, "app", "production-launch", "page.tsx"), "utf8");
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const section = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const startFlow = section(page, "async function start()", "async function updateStep");
const sessionView = section(page, "if (session) {", "return <section className=\"section quick-launch\"><h2>Quick Launch</h2>");

assert(page.includes('<option value="ABUJA">Abuja</option>') && startFlow.includes("city, serviceType"), "1. Abuja/Rides context must be submitted from the selected controls.");
assert(startFlow.includes("customerUserId: customerId") && startFlow.includes("captainUserId: requirements.captain ? captainId"), "2. The selected controlled Customer and Captain must be submitted.");
assert(startFlow.indexOf("setSession(next)") < startFlow.indexOf("await reload()"), "3. A successful start must retain the returned session before refreshing parent data.");
assert(page.includes('{view === "quick" ? <QuickLaunchView reload={load} /> : null}') && !page.includes('{!loading && view === "quick"'), "4. Parent refresh must not unmount Quick Launch.");
assert(startFlow.includes("setCity(next.city.code)") && startFlow.includes("setServiceType(next.serviceType)"), "5. Successful refresh must preserve the authoritative city and service.");
assert(sessionView.includes("is now OPERATIONS ONLY.") && sessionView.includes("test started successfully."), "6. Persistent activation success must remain visible after refresh.");
assert(sessionView.includes("session.config.launchStage") && sessionView.includes('value="OPERATIONS_ONLY"') === false, "7. The summary must display the returned OPERATIONS_ONLY stage without a hard-coded form mutation.");
assert(sessionView.includes("session.controlledCustomer.label") && sessionView.includes("controlledSupplyName") && sessionView.includes("Capacity") && sessionView.includes("Automatic matching"), "8. Activated participants and controlled safeguards must remain understandable.");
assert(sessionView.includes("Controlled Test Started") && sessionView.includes("disabled") && !sessionView.includes(">Start Controlled Test<"), "9. An active session must not expose a duplicate Start action.");
assert(startFlow.includes('catch (cause) { setError(friendlyError(cause, "form")); }') && !startFlow.includes('setCity("KANO")') && !startFlow.includes('setCustomerId("")'), "10. Failed starts must preserve context and show a safe error.");
assert(startFlow.includes("setCity(next.city.code)") && !startFlow.includes('setCity("KANO")'), "11. Abuja success must never silently reset to Kano.");

if (failures.length) {
  console.error("Admin Quick Launch activation-result regression failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Admin Quick Launch activation-result regression passed.");
