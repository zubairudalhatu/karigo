const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const header = read("src", "components", "site-header.tsx");
const home = read("app", "page.tsx");
const servicesPage = read("app", "services", "page.tsx");
const serviceData = read("src", "lib", "site.ts");
const css = read("app", "globals.css");

const hero = home.slice(home.indexOf('<section className="hero">'), home.indexOf('<section className="section" id="services">'));
assert(hero.includes("Everything you need, delivered."), "Public hero proposition must remain unchanged.");
assert((hero.match(/className="button/g) || []).length === 2, "Hero must expose one primary and one secondary CTA.");
assert(hero.includes("Download the App") && hero.includes("Become a Partner"), "Hero CTAs must prioritize download and Partner onboarding.");
assert(css.includes("--content-width: 1240px") && css.includes("--radius-card") && css.includes("--space-section"), "Public UI must use consolidated width, radius, and spacing tokens.");
assert(css.includes("clamp(44px, 5.7vw, 64px)"), "Desktop hero typography must cap at 64px.");
assert(css.includes("clamp(32px, 3.4vw, 40px)"), "Major section headings must use the moderate responsive scale.");
assert(css.includes("@media (max-width: 980px)") && css.includes("@media (max-width: 620px)"), "Public navigation and typography must include tablet/mobile breakpoints.");
assert(css.includes(":focus-visible") && css.includes("outline: 3px solid"), "Public controls and navigation must retain visible keyboard focus.");

["Services", "Rides", "Partners", "Captains", "Apps", "Help"].forEach((label) => assert(header.includes(`label: "${label}"`), `Header must include ${label} navigation.`));
assert(header.includes("<details") && header.includes("<summary>"), "Grouped public navigation must use keyboard-accessible disclosure controls.");
assert(header.includes('aria-controls="primary-navigation"') && header.includes("aria-expanded={menuOpen}"), "Mobile public navigation must expose expanded state.");
assert((header.match(/desktop-cta/g) || []).length === 1 && header.includes("Become a Partner"), "Desktop header must expose one priority CTA.");
assert(header.includes("Details coming through KariGO onboarding"), "Unsupported app destinations must remain non-clicking guidance.");
["Everyday Delivery", "Mobility", "Local", "Utilities"].forEach((label) => assert(serviceData.includes(`eyebrow: "${label}"`), `Service groups must include the ${label} label.`));

const groupIds = ["everyday-delivery", "mobility", "local-services", "utilities"];
groupIds.forEach((id) => {
  assert(serviceData.includes(`id: "${id}"`), `Service data must define ${id}.`);
  assert(home.includes("serviceGroups.map"), "Homepage must render grouped services.");
  assert(servicesPage.includes("serviceGroups.map"), "Services page must render grouped services.");
});
assert(serviceData.includes('status: "Apply now"') && serviceData.includes('status: "Preparing"'), "Grouped services must preserve non-live status labels.");

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : entry.name.endsWith(".tsx") ? [target] : [];
  });
}
const sources = [...sourceFiles(path.join(root, "app")), ...sourceFiles(path.join(root, "src", "components"))]
  .map((file) => fs.readFileSync(file, "utf8"));
const internalLinks = new Set();
for (const source of sources) {
  for (const match of source.matchAll(/(?:href:\s*|href=)["'`]([^"'`]+)["'`]/g)) {
    const href = match[1];
    if (href.startsWith("/")) internalLinks.add(href.split("#")[0] || "/");
  }
}
for (const route of internalLinks) {
  const target = route === "/" ? path.join(root, "app", "page.tsx") : path.join(root, "app", ...route.split("/").filter(Boolean), "page.tsx");
  assert(fs.existsSync(target), `Public navigation/link target must exist: ${route}`);
}

console.log(`Website visual consolidation regression passed (${internalLinks.size} internal routes audited).`);
