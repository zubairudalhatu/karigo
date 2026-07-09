const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const home = read("app", "page.tsx");
assert(home.includes("Everything you need, delivered."), "Homepage must use approved hero headline.");
assert(home.includes("Order food, shop groceries and market items"), "Homepage must use approved subheadline.");
assert(home.includes("Download the App"), "Homepage must include Download App CTA.");
assert(home.includes("Become a Vendor"), "Homepage must include Become a Vendor CTA.");
assert(home.includes("KariGO is preparing secure merchant integrations"), "Bills readiness copy must be present.");
assert(home.includes("Coming-soon services are clearly marked"), "Coming-soon services must not be presented as live.");
assert(home.includes("Coming soon on Google Play"), "Website must not invent fake Play Store links.");

const site = read("src", "lib", "site.ts");
["Food Delivery", "Groceries", "Taxi", "Market Items", "Pharmacy", "Parcel Delivery", "SME Errands", "Airtime", "Data", "Electricity", "Cable TV"]
  .forEach((service) => assert(site.includes(service), `Service list must include ${service}.`));
assert(site.includes("Coming soon"), "Readiness service states must exist.");
assert(site.includes("Preparing launch"), "Pharmacy preparing-launch state must exist.");
assert(site.includes("meetup@karigo.com.ng"), "Contact email must be present.");
assert(site.includes("+234 805 709 2686"), "Contact phone must be present.");

const vendorApply = read("app", "vendors", "apply", "page.tsx");
assert(vendorApply.includes("VendorApplicationForm"), "Vendor application page must render the form.");
assert(vendorApply.includes("Approval is not automatic"), "Vendor application page must explain approval is not automatic.");

const vendorForm = read("src", "components", "vendor-application-form.tsx");
assert(vendorForm.includes("/vendor-applications"), "Vendor application form must submit to public backend endpoint.");
assert(vendorForm.includes("NEXT_PUBLIC_API_BASE_URL") || read("src", "lib", "site.ts").includes("NEXT_PUBLIC_API_BASE_URL"), "Website must use configured API base URL.");
assert(vendorForm.includes("Your vendor application has been submitted. KariGO will review your details and contact you with the next steps."), "Success message must match approved copy.");
assert(!vendorForm.includes("Authorization"), "Public vendor application form must not require auth headers.");

const riders = read("app", "riders", "page.tsx");
assert(riders.includes("Taxi Drivers - Preparing Launch"), "Riders page must include future taxi driver section.");
assert(riders.includes("Vehicle and licence checks will be required"), "Taxi driver readiness checks must be stated.");

const services = read("app", "services", "page.tsx");
assert(services.includes("Live / Active"), "Services page must separate live services.");
assert(services.includes("Preparing Launch"), "Services page must separate preparing-launch services.");

const contact = read("app", "contact", "page.tsx");
assert(contact.includes("This page does not send email automatically"), "Contact page must avoid unconfigured email sending.");

const layout = read("app", "layout.tsx");
assert(layout.includes("KariGO - Everything You Need, Delivered"), "Metadata title must be configured.");
assert(layout.includes("themeColor"), "Brand theme color metadata must be configured.");

console.log("Website staging regression checks passed.");
