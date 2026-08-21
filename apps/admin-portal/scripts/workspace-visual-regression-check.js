const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const shell = read("src", "components", "portal.tsx");
const css = read("app", "globals.css");
const dashboard = read("app", "page.tsx");
const productionLaunch = read("app", "production-launch", "page.tsx");

const groups = ["Operations", "People & Partners", "Commerce & Finance", "SME Operations", "Growth & Engagement", "Support & Governance", "System"];
groups.forEach((group) => assert(shell.includes(`label: "${group}"`), `Admin navigation must include ${group}.`));
const operations = shell.slice(shell.indexOf('{ label: "Operations"'), shell.indexOf('{ label: "People & Partners"'));
assert(operations.includes('label: "Production Launch"') && operations.includes('href: "/production-launch"'), "Production Launch must remain highly visible in Operations.");
assert(shell.includes("activeGroupLabel") && shell.includes("setExpandedGroups") && shell.includes("[activeGroupLabel]: true"), "Current route group must automatically expand.");
assert(shell.includes("aria-expanded={expanded}") && shell.includes("aria-controls={groupId}"), "Collapsible groups must expose accessible state and relationships.");
assert(shell.includes('aria-current={active ? "page" : undefined}'), "Active Admin routes must use aria-current.");
assert(shell.includes('aria-controls="admin-navigation"') && shell.includes("mobileNavOpen"), "Responsive Admin navigation must use an accessible drawer control.");
assert(css.includes(".sidebar.is-open") && css.includes("@media (max-width: 900px)"), "Admin sidebar must become a drawer at tablet/mobile widths.");
assert(css.includes(":focus-visible") && css.includes("outline: 3px solid"), "Admin controls must retain visible keyboard focus.");
assert(css.includes("font-size: clamp(30px, 3vw, 36px)") && css.includes("font-size: clamp(21px, 2vw, 25px)"), "Admin page and section headings must use the moderate scale.");
assert(css.includes("--radius-card: 12px") && css.includes("--space-page"), "Admin UI must use consolidated radius and spacing tokens.");
assert(css.includes(".table th,.table td") && css.includes("padding: 9px 10px"), "Admin tables must use compact readable rows.");

["Operations", "Customers & supply", "Transactions", "Exceptions & support"].forEach((group) => assert(dashboard.includes(`title: "${group}"`), `Dashboard must group ${group} metrics.`));
assert(dashboard.includes("metric-card") && dashboard.includes("dashboard-groups"), "Dashboard metrics must use compact grouped cards.");
assert(productionLaunch.includes('className="actions launch-tabs"') && productionLaunch.includes('aria-label="Production Launch views"'), "Production Launch tabs must use the compact accessible visual hook.");
assert(productionLaunch.includes("Quick Launch") && productionLaunch.includes("Start Controlled Test") && productionLaunch.includes("Stop Test / Return Service OFF"), "Production Launch safety workflow must remain present.");

const navHrefs = [...shell.matchAll(/href:\s*"([^"]+)"/g)].map((match) => match[1]);
assert(new Set(navHrefs).size === navHrefs.length, "Grouped Admin navigation must not duplicate routes.");
for (const route of navHrefs) {
  const target = route === "/" ? path.join(root, "app", "page.tsx") : path.join(root, "app", ...route.split("/").filter(Boolean), "page.tsx");
  assert(fs.existsSync(target), `Admin navigation route must exist: ${route}`);
}

function pages(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? pages(path.join(directory, entry.name)) : entry.name === "page.tsx" ? [path.join(directory, entry.name)] : []);
}
const pageRoutes = pages(path.join(root, "app"));
assert(pageRoutes.length >= 37, `Admin production build must retain at least 37 page routes; found ${pageRoutes.length}.`);

console.log(`Admin workspace visual regression passed (${navHrefs.length} navigation routes, ${pageRoutes.length} page routes).`);
