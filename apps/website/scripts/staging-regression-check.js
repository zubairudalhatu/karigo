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
assert(home.includes("KariGO is preparing secure merchant integrations"), "Bills coming-soon copy must be present.");
assert(home.includes("Coming-soon services are clearly marked"), "Coming-soon services must be presented accurately.");
assert(home.includes("Coming soon on Google Play"), "Website must not invent fake Play Store links.");

const site = read("src", "lib", "site.ts");
["Food Delivery", "Groceries", "Taxi", "Market Items", "Pharmacy", "Parcel Delivery", "SME Errands", "Airtime", "Data", "Electricity", "Cable TV"]
  .forEach((service) => assert(site.includes(service), `Service list must include ${service}.`));
assert(site.includes("Coming soon"), "Coming-soon service states must exist.");
assert(site.includes("Preparing launch"), "Pharmacy preparing-launch state must exist.");
["food", "groceries", "taxi", "parcel"].forEach((icon) => assert(site.includes(`icon: "${icon}"`), `Service icon key ${icon} must be present.`));

const vendorApply = read("app", "vendors", "apply", "page.tsx");
assert(vendorApply.includes("VendorApplicationForm"), "Vendor application page must render the form.");
assert(vendorApply.includes("Approval is not automatic"), "Vendor application page must explain approval is not automatic.");

const vendorPage = read("app", "vendors", "page.tsx");
assert(vendorPage.includes("Vendor Login"), "Vendor page must include login access for onboarded vendors.");

const vendorForm = read("src", "components", "vendor-application-form.tsx");
assert(vendorForm.includes("/vendor-applications"), "Vendor application form must submit to public backend endpoint.");
assert(vendorForm.includes("NEXT_PUBLIC_API_BASE_URL") || read("src", "lib", "site.ts").includes("NEXT_PUBLIC_API_BASE_URL"), "Website must use configured API base URL.");
assert(vendorForm.includes("Your vendor application has been submitted. KariGO will review your details and contact you with the next steps."), "Success message must match approved copy.");
assert(!vendorForm.includes("Authorization"), "Public vendor application form must not require auth headers.");

const riders = read("app", "riders", "page.tsx");
assert(riders.includes("Taxi Drivers - Coming Soon"), "Riders page must include future taxi driver section.");
assert(riders.includes("Vehicle and licence checks will be required"), "Taxi driver checks must be stated.");
assert(riders.includes("TaxiDriverApplicationForm"), "Riders page must include taxi driver application form.");
assert(riders.includes("TaxiWaitlistForm"), "Riders page must include customer taxi waitlist form.");
assert(riders.includes("Taxi is coming later and is not live for ride requests yet"), "Riders page must not present taxi as live.");

const taxiForms = read("src", "components", "taxi-readiness-forms.tsx");
assert(taxiForms.includes("taxi/waitlist"), "Website taxi waitlist form must post to taxi waitlist endpoint.");
assert(taxiForms.includes("taxi/driver-applications"), "Website taxi driver form must post to driver application endpoint.");
assert(taxiForms.includes("does not book a ride or activate live taxi dispatch"), "Website taxi waitlist must state taxi is not live.");
assert(taxiForms.includes("Approval is required and this form does not activate live taxi dispatch"), "Website taxi driver form must not imply live taxi activation.");

const services = read("app", "services", "page.tsx");
assert(services.includes("Live / Active"), "Services page must separate live services.");
assert(services.includes("Preparing Launch"), "Services page must separate preparing-launch services.");
assert(services.includes("Join Taxi Waitlist"), "Services page must link Taxi coming-soon interest to the waitlist.");

const contact = read("app", "contact", "page.tsx");
assert(contact.includes("ContactInquiryForm"), "Contact page must render the inquiry form.");
assert(contact.includes("Public contact details are intentionally not displayed"), "Contact page must avoid direct contact detail exposure.");

const contactForm = read("src", "components", "contact-inquiry-form.tsx");
assert(contactForm.includes("Submit Inquiry"), "Contact inquiry form must include a visible submit button.");
assert(contactForm.includes("Your inquiry has been received. KariGO will contact you with the next steps."), "Contact inquiry form must use public-facing success copy.");
assert(!contactForm.includes("KariGO will open public inquiry submission soon"), "Contact inquiry form must not show internal readiness copy.");

const header = read("src", "components", "site-header.tsx");
assert(header.includes("menu-toggle"), "Website header must include mobile menu control.");
assert(header.includes("Become a Vendor"), "Mobile navigation must include vendor application access.");
assert(header.includes("Vendor Login"), "Website header must include vendor login access.");
assert(header.includes("https://vendor.karigo.com.ng"), "Vendor login must point to branded vendor dashboard domain.");

const footer = read("src", "components", "site-footer.tsx");
assert(footer.includes("&copy; 2026 KariGO Express Limited"), "Footer must include legal copyright text.");
["Services", "Vendors", "Vendor Application", "Vendor Login", "Riders & Drivers", "Taxi Waitlist", "Driver Readiness", "Download App", "Contact", "Privacy Policy", "Terms"]
  .forEach((link) => assert(footer.includes(link), `Footer must include ${link}.`));
assert(footer.includes("/karigo-logo.png"), "Footer must display the KariGO logo.");
assert(footer.includes("@karigoapp"), "Footer must show the official KariGO social handle.");
["https://www.instagram.com/karigoapp", "https://x.com/karigoapp", "https://www.tiktok.com/@karigoapp", "https://www.facebook.com/karigoapp", "https://www.linkedin.com/company/karigoapp"]
  .forEach((link) => assert(footer.includes(link), `Footer must include social link ${link}.`));
assert(footer.includes("Google Play soon"), "Footer must include Android launch status.");
assert(!footer.includes("KariGO is focused on core delivery services while preparing new categories carefully."), "Footer must not include internal service-focus note.");
assert(!footer.includes("Official store links will appear here when available."), "Footer must not include app-store placeholder note.");
assert(!footer.includes("Email:"), "Footer must not expose email contact text.");
assert(!footer.includes("Phone:"), "Footer must not expose phone contact text.");
assert(!footer.includes("Location:"), "Footer must not expose location contact text.");

const privacy = read("app", "privacy", "page.tsx");
assert(privacy.includes("Information we may collect"), "Privacy page must include data collection content.");
assert(privacy.includes("How we use information"), "Privacy page must include usage content.");
assert(privacy.includes("Security and retention"), "Privacy page must include security and retention content.");

const terms = read("app", "terms", "page.tsx");
assert(terms.includes("Using KariGO"), "Terms page must include platform usage content.");
assert(terms.includes("Services coming soon"), "Terms page must explain gated services.");
assert(terms.includes("Prohibited use"), "Terms page must include prohibited use content.");

const layout = read("app", "layout.tsx");
assert(layout.includes("KariGO - Everything You Need, Delivered"), "Metadata title must be configured.");
assert(layout.includes("themeColor"), "Brand theme color metadata must be configured.");

console.log("Website staging regression checks passed.");
