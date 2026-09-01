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
const footer = read("src", "components", "site-footer.tsx");
const customerWebPortal = read("src", "components", "customer-web-portal.tsx");

const hero = home.slice(home.indexOf('<section className="hero">'), home.indexOf('<section className="section" id="services">'));
assert(hero.includes("Everything you need, delivered."), "Public hero proposition must remain unchanged.");
assert((hero.match(/className="button/g) || []).length === 2, "Hero must expose one primary and one secondary CTA.");
assert(hero.includes("Download the App") && hero.includes("Become a Partner"), "Hero CTAs must prioritize download and Partner onboarding.");
const canonicalCustomerGooglePlayUrl = "https://play.google.com/store/apps/details?id=com.karigo.customer";
assert(serviceData.includes(`customerGooglePlayUrl: "${canonicalCustomerGooglePlayUrl}"`), "Website config must retain the canonical Customer Google Play URL.");
assert(hero.includes("site.customerGooglePlayUrl") && hero.includes('target="_blank"') && hero.includes('rel="noopener noreferrer"'), "Homepage primary download CTA must open the centralized Google Play link safely.");
assert(home.includes("Available now on Google Play.") && !home.includes("Preparing for Google Play"), "Homepage rollout must present the Android Customer app as live.");
assert(footer.includes("Available on Google Play") && !footer.includes("Google Play soon"), "Footer rollout must present the Android Customer app as live.");
assert(home.includes("App Store release in preparation.") && footer.includes("App Store in preparation"), "Public rollout copy must keep iOS future-facing.");
assert(!home.includes("Available on App Store") && !home.includes("Download on App Store"), "Homepage must not falsely present iOS as live.");
assert(css.includes("--content-width: 1240px") && css.includes("--radius-card") && css.includes("--space-section"), "Public UI must use consolidated width, radius, and spacing tokens.");
assert(css.includes("clamp(44px, 5.7vw, 64px)"), "Desktop hero typography must cap at 64px.");
assert(css.includes("clamp(32px, 3.4vw, 40px)"), "Major section headings must use the moderate responsive scale.");
assert(css.includes("@media (max-width: 980px)") && css.includes("@media (max-width: 620px)"), "Public navigation and typography must include tablet/mobile breakpoints.");
assert(css.includes(":focus-visible") && css.includes("outline: 3px solid"), "Public controls and navigation must retain visible keyboard focus.");
const portalSidebarRule = css.match(/\.portal-sidebar\s*\{([^}]*)\}/s)?.[1] || "";
assert(portalSidebarRule.includes("align-content: start") && portalSidebarRule.includes("grid-auto-rows: max-content"), "Desktop Customer Web sidebar identity and navigation must remain compact and top-aligned.");
assert(portalSidebarRule.includes("max-height: calc(100vh - 97px)") && portalSidebarRule.includes("overflow-y: auto"), "Customer Web sidebar must remain usable at short desktop heights.");
assert(css.includes(".portal-sidebar { align-self: stretch; max-height: none; min-height: auto; overflow-y: visible; }"), "Tablet/mobile Customer Web sidebar must reset desktop height constraints.");
assert(css.includes(".portal-sidebar nav { display: flex; overflow-x: auto; padding-bottom: 6px; }"), "Customer Web navigation must remain horizontally scrollable at 980px and below.");
["Dashboard", "Wallet", "Utilities", "SME Services", "Orders", "Addresses", "Profile", "Account deletion", "Support"].forEach((tab) => assert(customerWebPortal.includes(`"${tab}"`), `Customer Web navigation must retain ${tab}.`));

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

[
  "Services under provider or operations approval are clearly marked before activation.",
  "Order from local businesses or move everyday items with clear availability status.",
  "Ride Captain onboarding and controlled operations remain clearly separated from public availability.",
  "Find approved skilled providers through KariGO SME Services.",
  "Provider and operational readiness remain visible before any utility is presented as active."
].forEach((description) => {
  assert(home.includes(description) || serviceData.includes(description), `Homepage Services description must remain present: ${description}`);
});

const servicesHeadingRule = css.match(/#services\s*>\s*\.section-heading\s*\{([^}]*)\}/s)?.[1] || "";
assert(servicesHeadingRule.includes("flex-direction: column"), "Homepage Services intro must use a vertically attached heading layout.");
assert(servicesHeadingRule.includes("align-items: flex-start"), "Homepage Services intro must align its title and description on one content edge.");
assert(css.includes("#services > .section-heading > p { margin: 0; max-width: 720px; width: 100%; }"), "Homepage Services description must retain a responsive reading width.");

const serviceGroupHeadingRule = css.match(/\.service-group-heading\s*\{([^}]*)\}/g)?.at(-1)?.match(/\{([^}]*)\}/s)?.[1] || "";
assert(serviceGroupHeadingRule.includes("flex-direction: column"), "Service-group titles and descriptions must remain vertically attached.");
assert(serviceGroupHeadingRule.includes("margin-bottom: 18px"), "Service cards must retain deliberate spacing below group descriptions.");
assert(css.includes(".service-group-heading > p") && css.includes("max-width: 720px; width: 100%;"), "Service-group descriptions must wrap within narrow viewports.");
assert(css.includes(".section-heading { align-items: center; margin-bottom: 24px; }"), "Generic section headings must retain their established desktop layout.");

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
