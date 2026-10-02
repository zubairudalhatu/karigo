const fs = require("fs");
const path = require("path");

const website = path.resolve(__dirname, "..");
const repo = path.resolve(website, "..", "..");
const read = (file) => fs.readFileSync(path.join(repo, file), "utf8");
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

const header = read("apps/website/src/components/site-header.tsx");
const footer = read("apps/website/src/components/site-footer.tsx");
const badges = read("apps/website/src/components/app-download-badges.tsx");
const home = read("apps/website/app/page.tsx");
const css = read("apps/website/app/globals.css");
const register = read("apps/vendor-dashboard/app/register/page.tsx");
const vendorCss = read("apps/vendor-dashboard/app/globals.css");

["Services", "Partners", "Captains", "Help"].forEach((label) => {
  expect(header.includes(`label: "${label}"`), `Desktop navigation must retain ${label}.`);
});
expect(header.includes("usePathname"), "Navigation must react to pathname changes.");
expect(header.includes("openGroup") && header.includes("current === group.label ? null : group.label"), "Navigation must hold one controlled dropdown state.");
expect(header.includes('event.key === "Escape"'), "Escape must close the navigation.");
expect(header.includes("contains(event.target as Node)"), "Outside clicks must close the navigation.");
expect(header.includes("onClick={closeMenu}"), "Navigation links must close open menus.");
expect(header.includes("aria-expanded={openGroup === group.label}") && header.includes("aria-controls={`nav-menu-${group.label.toLowerCase()}`}"), "Dropdown controls must expose ARIA state.");

["/", "/contact", "/riders", "/vendors/apply", "/safety", "/careers"].forEach((route) => {
  const file = route === "/" ? "apps/website/app/page.tsx" : `apps/website/app${route}/page.tsx`;
  expect(fs.existsSync(path.join(repo, file)), `Representative route must exist: ${route}`);
});

expect(css.includes("grid-template-columns: repeat(2, minmax(0, 1fr))"), "Shared two-column forms must use minmax(0, 1fr).");
expect(css.includes(".form-card input,.form-card select,.form-card textarea") && css.includes("width: 100%"), "Form controls must be width constrained.");
expect(css.includes(".split > *,.form-grid > *,.card-grid > * { min-width: 0; }"), "Shared grid children must be shrinkable.");
expect(css.includes("overflow-wrap: anywhere") && css.includes("white-space: normal"), "Long labels and actions must wrap.");

expect(home.includes("<AppDownloadBadges />") && footer.includes("<AppDownloadBadges footer />"), "Homepage and footer must share store-download treatment.");
expect(badges.includes("get-it-on-google-play.png") && badges.includes("site.customerGooglePlayUrl"), "Shared Android treatment must use the official badge and Customer listing.");
expect(!badges.match(/href=.*App Store/), "iOS coming-soon treatment must not have a store URL.");
expect(footer.includes("KariGO Express Limited. All rights reserved.") && footer.includes("Zamkah Technologies Limited"), "Approved corporate footer lines must remain unchanged.");

["Back to KariGO", "Help / Support", "Privacy", "Terms", "Support", "KariGO Express Limited", "Zamkah Technologies Limited"].forEach((text) => {
  expect(register.includes(text), `Public Partner registration shell must include ${text}.`);
});
expect(register.includes("partner-public-shell") && vendorCss.includes("grid-template-rows: auto 1fr auto"), "Partner registration must use the public header/content/footer shell.");
expect(vendorCss.includes(".partner-type-grid > *,.partner-register-card,.partner-public-header > * { min-width: 0; }"), "Partner registration cards must resist overflow.");

console.log("Website UX closeout regression passed.");
