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
assert(home.includes("Become a Service Provider"), "Homepage must include SME Services provider application CTA.");
assert(home.includes("KariGO is preparing secure merchant integrations"), "Bills provider-review copy must be present.");
assert(home.includes("Services under provider or operations approval are clearly marked before activation."), "Provider/operations approval services must be presented accurately.");
assert(home.includes("Preparing for Google Play"), "Website must not invent fake Play Store links.");

const site = read("src", "lib", "site.ts");
["Food Delivery", "Groceries", "KariGO Rides", "Market Items", "Pharmacy", "Parcel Delivery", "SME Services", "Airtime", "Data", "Electricity", "Cable TV"]
  .forEach((service) => assert(site.includes(service), `Service list must include ${service}.`));
const oldSmeWebsiteLabel = ["SME", "E" + "rrands"].join(" ");
assert(!site.includes(oldSmeWebsiteLabel), "Public website must use SME Services instead of the old SME label.");
assert(site.includes("Preparing"), "Preparing service states must exist.");
assert(site.includes("Preparing launch"), "Pharmacy preparing-launch state must exist.");
["food", "groceries", "taxi", "parcel", "smeServices"].forEach((icon) => assert(site.includes(`icon: "${icon}"`), `Service icon key ${icon} must be present.`));

const vendorApply = read("app", "vendors", "apply", "page.tsx");
assert(vendorApply.includes("VendorApplicationForm"), "Vendor application page must render the form.");
assert(vendorApply.includes("Approval is not automatic"), "Vendor application page must explain approval is not automatic.");

const vendorPage = read("app", "vendors", "page.tsx");
assert(vendorPage.includes("Vendor Login"), "Vendor page must include login access for onboarded vendors.");

const vendorForm = read("src", "components", "vendor-application-form.tsx");
assert(vendorForm.includes("/vendor-applications"), "Vendor application form must submit to public backend endpoint.");
assert(vendorForm.includes("NEXT_PUBLIC_API_BASE_URL") || read("src", "lib", "site.ts").includes("NEXT_PUBLIC_API_BASE_URL"), "Website must use configured API base URL.");
assert(vendorForm.includes("Your vendor application has been submitted. KariGO will review your details and contact you with the next steps."), "Success message must match approved copy.");
assert(vendorForm.includes("Vendor applications are open for Kano and Abuja launch onboarding."), "Vendor application form must state the Kano and Abuja launch limit.");
assert(vendorForm.includes("ApplicantOnboardingCard"), "Vendor application form must use account-first onboarding.");
assert(vendorForm.includes("Create the account first, verify your phone with OTP"), "Vendor application form must explain account-first OTP onboarding.");
assert(vendorForm.includes("launchCityOptions"), "Vendor application city inputs must use controlled Kano/Abuja options.");
assert(vendorForm.includes('value: "Abuja"'), "Vendor application form must support Abuja city selection.");
assert(vendorForm.includes('value: "FCT"'), "Vendor application form must support FCT state selection for Abuja.");
assert(vendorForm.includes("businessRegistrationNumber"), "Vendor application form must capture business registration number where available.");
assert(vendorForm.includes("businessRegistrationDocumentUrl"), "Vendor application form must capture business registration document evidence.");
assert(vendorForm.includes("cacEvidenceDocumentUrl"), "Vendor application form must capture CAC/business evidence where available.");
assert(vendorForm.includes("documents"), "Vendor application form must submit document metadata where supplied.");
assert(!vendorForm.includes("Authorization"), "Public vendor application form must not require auth headers.");

const serviceProviderApply = read("app", "sme-services", "apply", "page.tsx");
assert(serviceProviderApply.includes("ServiceProviderApplicationForm"), "SME Services provider application page must render the form.");
assert(serviceProviderApply.includes("Join KariGO as a Service Provider"), "SME Services provider application page must use approved headline.");
assert(serviceProviderApply.includes("does not create provider login, automatic job dispatch, service payments, payouts or live medical booking"), "SME Services provider application page must state safety limits.");

const serviceProviderForm = read("src", "components", "service-provider-application-form.tsx");
assert(serviceProviderForm.includes("/service-provider-applications"), "SME Services provider application form must submit to public backend endpoint.");
assert(serviceProviderForm.includes("Your service provider application has been submitted. KariGO will review your details and contact you with the next steps."), "SME Services provider form success message must match approved copy.");
assert(serviceProviderForm.includes("HEALTH_PROFESSIONAL"), "SME Services provider form must keep health professional readiness-only option.");
assert(serviceProviderForm.includes("does not create live dispatch, provider login, payments or payouts"), "SME Services provider form must state review-only scope.");
assert(!serviceProviderForm.includes("Authorization"), "Public SME Services provider application form must not require auth headers.");

const riders = read("app", "riders", "page.tsx");
assert(riders.includes("DeliveryCaptainApplicationForm"), "Captains page must include the Delivery Captain application form.");
assert(riders.includes("Apply as Delivery Captain"), "Captains page must link to Delivery Captain application.");
assert(riders.includes("#delivery-captain-application"), "Captains page must use the Delivery Captain application anchor.");
assert(riders.includes("#ride-captain-application"), "Captains page must use the public Ride Captain application anchor.");
assert(!riders.includes("#taxi-driver-application"), "Captains page must not use the old Taxi driver application anchor.");
assert(riders.includes("Ride Captains"), "Captains page must include Ride Captain review section.");
assert(riders.includes("Vehicle and licence checks will be required"), "Ride Captain checks must be stated.");
assert(riders.includes("TaxiDriverApplicationForm"), "Captains page must include the existing ride application form component.");
assert(riders.includes("TaxiWaitlistForm"), "Captains page must include the existing ride waitlist form component.");
assert(riders.includes("public ride requests require separate activation"), "Captains page must not present KariGO Rides as live.");

const deliveryCaptainForm = read("src", "components", "delivery-captain-application-form.tsx");
assert(deliveryCaptainForm.includes("/delivery-captain-applications"), "Delivery Captain application form must submit to the public backend endpoint.");
assert(deliveryCaptainForm.includes("Delivery Captain application has been submitted"), "Delivery Captain form success message must match approved copy.");
assert(deliveryCaptainForm.includes("dispatch, payouts and ride access remain separately controlled"), "Delivery Captain form must state safety limits.");
assert(deliveryCaptainForm.includes("Apply to deliver with KariGO in Kano or Abuja."), "Delivery Captain form must show Kano and Abuja launch copy.");
assert(deliveryCaptainForm.includes("ApplicantOnboardingCard"), "Delivery Captain form must use account-first onboarding.");
assert(deliveryCaptainForm.includes("verify their phone with OTP"), "Delivery Captain form must explain account-first OTP onboarding.");
assert(deliveryCaptainForm.includes('value: "Kano"'), "Delivery Captain city controls must include Kano.");
assert(deliveryCaptainForm.includes('value: "Abuja"'), "Delivery Captain city controls must include Abuja.");
assert(deliveryCaptainForm.includes('value: "FCT"'), "Delivery Captain state controls must include FCT.");
assert(deliveryCaptainForm.includes("profilePhotoUrl"), "Delivery Captain form must capture profile photo URL metadata.");
assert(deliveryCaptainForm.includes("driverLicenceNumber"), "Delivery Captain form must capture licence number metadata.");
assert(deliveryCaptainForm.includes("driverLicenceDocumentUrl"), "Delivery Captain form must capture licence document evidence.");
assert(deliveryCaptainForm.includes("vehicleParticularsDocumentUrl"), "Delivery Captain form must capture vehicle particulars evidence.");
assert(deliveryCaptainForm.includes("insuranceDocumentUrl"), "Delivery Captain form must capture insurance document evidence.");
assert(deliveryCaptainForm.includes("documents"), "Delivery Captain form must submit document metadata where supplied.");
assert(!deliveryCaptainForm.includes("Authorization"), "Public Delivery Captain application form must not require auth headers.");

const taxiForms = read("src", "components", "taxi-readiness-forms.tsx");
assert(taxiForms.includes("taxi/waitlist"), "Website ride waitlist form must post to the existing waitlist endpoint.");
assert(taxiForms.includes("taxi/driver-applications"), "Website ride application form must post to the existing application endpoint.");
assert(taxiForms.includes("id=\"ride-waitlist\""), "Website ride waitlist form must use the public Ride waitlist anchor.");
assert(taxiForms.includes("id=\"ride-captain-application\""), "Website Ride Captain form must use the public Ride Captain anchor.");
assert(!taxiForms.includes("id=\"taxi-driver-application\""), "Website Ride Captain form must not use the old Taxi driver anchor.");
assert(taxiForms.includes("does not book a ride or activate live ride dispatch"), "Website ride waitlist must state rides are not live.");
assert(taxiForms.includes("ApplicantOnboardingCard"), "Website Ride Captain form must use account-first onboarding.");
assert(taxiForms.includes("this form does not activate live ride dispatch"), "Website Ride Captain form must not imply live ride activation.");
assert(taxiForms.includes("driverLicenceExpiry"), "Website Ride Captain form must capture required licence expiry.");
assert(taxiForms.includes("driverLicenceDocumentUrl"), "Website Ride Captain form must capture required licence document evidence.");
assert(taxiForms.includes("vehicleParticularsDocumentUrl"), "Website Ride Captain form must capture required vehicle particulars evidence.");

const services = read("app", "services", "page.tsx");
assert(services.includes("Live / Active"), "Services page must separate live services.");
assert(services.includes("Preparing Launch"), "Services page must separate preparing-launch services.");
assert(services.includes("Join Ride Waitlist"), "Services page must link KariGO Rides interest to the waitlist.");
assert(services.includes("/riders#ride-waitlist"), "Services page must use the public Ride waitlist anchor.");
assert(services.includes("/sme-services/apply"), "Services page must link SME Services provider applications.");

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
["Services", "Vendors", "Vendor Application", "Service Provider Application", "Vendor Login", "Captains", "Ride Waitlist", "Ride review", "Download App", "Contact", "Returns", "Refunds", "Privacy Policy", "Terms"]
  .forEach((link) => assert(footer.includes(link), `Footer must include ${link}.`));
assert(footer.includes("/karigo-logo.png"), "Footer must display the KariGO logo.");
assert(footer.includes("@karigoapp"), "Footer must show the official KariGO social handle.");
["https://www.instagram.com/karigoapp", "https://x.com/karigoapp", "https://www.tiktok.com/@karigoapp", "https://www.facebook.com/karigoapp", "https://www.linkedin.com/company/karigoapp"]
  .forEach((link) => assert(footer.includes(link), `Footer must include social link ${link}.`));
assert(footer.includes("<SocialIcon name={link.icon} />"), "Footer social links must render icons instead of text chips.");
assert(footer.includes("aria-label={`KariGO on ${link.label}`}"), "Footer social icon links must keep accessible labels.");
assert(!footer.includes("{link.label}\n                </a>"), "Footer social links must not render visible text labels.");
assert(footer.includes("Google Play soon"), "Footer must include Android launch status.");
assert(footer.includes("/riders#ride-waitlist"), "Footer must use the public Ride waitlist anchor.");
assert(footer.includes("/riders#ride-captain-application"), "Footer must use the public Ride Captain application anchor.");
assert(!footer.includes("/riders#taxi-driver-application"), "Footer must not use the old Taxi driver application anchor.");
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
assert(terms.includes("Services under approval"), "Terms page must explain gated services.");
assert(terms.includes("Prohibited use"), "Terms page must include prohibited use content.");

const returnsPage = read("app", "returns", "page.tsx");
assert(returnsPage.includes("Delivery issue and return support."), "Returns page must exist.");
assert(returnsPage.includes("Wrong or missing items"), "Returns page must explain item issue support.");
assert(returnsPage.includes("Damaged or unsafe delivery"), "Returns page must explain damaged delivery support.");
assert(returnsPage.includes("meetup@karigo.com.ng"), "Returns page must provide approved support email.");
assert(returnsPage.includes("+234 805 709 2686"), "Returns page must provide approved support phone.");

const refundsPage = read("app", "refunds", "page.tsx");
assert(refundsPage.includes("Refunds are reviewed before processing."), "Refunds page must exist.");
assert(refundsPage.includes("Refunds are reviewed by KariGO Support and processed after order/payment verification."), "Refunds page must explain verification requirements.");
assert(refundsPage.includes("automatic wallet refund credit remains disabled until separately approved"), "Refunds page must keep wallet refund automation disabled.");
assert(refundsPage.includes("Cash / Pay on Delivery refunds"), "Refunds page must explain cash/POD refund handling.");

const layout = read("app", "layout.tsx");
assert(layout.includes("KariGO - Everything You Need, Delivered"), "Metadata title must be configured.");
assert(layout.includes("themeColor"), "Brand theme color metadata must be configured.");

console.log("Website staging regression checks passed.");
