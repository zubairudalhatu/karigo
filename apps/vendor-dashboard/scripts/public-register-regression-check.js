const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

const register = read("app", "register", "page.tsx");
const css = read("app", "globals.css");

["Back to KariGO", "Help / Support", "Privacy", "Terms", "Support"].forEach((text) => {
  expect(register.includes(text), `Partner registration shell must include ${text}.`);
});
expect(register.includes("&copy; 2026 KariGO Express Limited"), "Partner registration must include the approved KariGO copyright line.");
expect(register.includes("A <strong>Zamkah Technologies Limited</strong> company"), "Partner registration must include the approved ownership line.");
expect(register.includes("partner-public-shell") && css.includes("grid-template-rows: auto 1fr auto"), "Partner registration must render a public header/content/footer shell.");
expect(css.includes(".partner-type-grid > *,.partner-register-card,.partner-public-header > * { min-width: 0; }"), "Partner registration grid items must be overflow-safe.");
expect(css.includes("overflow-wrap: anywhere") && css.includes("white-space: normal"), "Partner onboarding actions must wrap long labels.");

console.log("Partner public registration regression check passed.");
