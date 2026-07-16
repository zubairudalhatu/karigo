# Task 138 - SME Services Marketplace, Location and Ads Verification

## Scope

Task 138 adds staging-safe foundations for:

- Customer SME Services provider discovery and preferred-provider selection.
- Customer saved-address or new service-address selection.
- Optional location detection metadata for service-address convenience.
- Customer reviews for completed assigned SME Services requests.
- Managed Customer App home ad placement.
- Vendor ad campaign requests.
- Admin ad review, external advertiser campaign creation and controlled vendor ad credit grants.
- Customer App checkout payment provider selector verification from Task 137.

Live payments, wallet top-up, automatic ad billing, payouts, live rides, Pharmacy marketplace and marketing/bulk messaging remain disabled.

## Customer App Checks

- Open Customer App home and confirm Utilities appears only in the main category grid, not as a duplicate featured section.
- Confirm the home ad placement is labelled `Ad`.
- Confirm approved active ads appear only from the managed backend placement.
- Confirm fallback ad copy states ads do not affect checkout pricing or delivery quotes.
- Open Checkout and confirm the sandbox payment provider selector is visible.
- Open SME Services and select a category.
- Confirm available approved providers appear without phone numbers or email addresses.
- Select a provider, then switch back to `Let KariGO match me`.
- Select a saved address.
- Enter a new service address and use `Use current location` where device permissions allow.
- Submit a request and confirm the selected provider is recorded as a preference only.
- Confirm health professional booking remains readiness-only.
- Complete an assigned SME Services request through Admin, then confirm the customer can submit one review.

## Admin Portal Checks

- Open Admin Portal `Ads`.
- Create an external advertiser ad with safe public copy.
- Create or review a vendor-sponsored ad.
- Change campaign status through Submitted, Under Review, Approved and Active.
- Confirm rejected/cancelled/expired vendor ads release reserved controlled ad credit.
- Grant controlled vendor ad credit by vendor ID.
- Confirm no live payment, wallet top-up, card charge or automatic billing action appears.

## Vendor Dashboard Checks

- Open Vendor Dashboard `Ads`.
- Confirm controlled ad credit balance, reserved balance and campaign list are visible.
- Submit an ad request.
- Confirm campaign status is `Submitted` and awaits Admin approval.
- Confirm the page states live ad billing is disabled.

## Guardrails

- Provider phone/email must not appear in Customer App provider cards or request details.
- Ads must be labelled and must not alter checkout, quote or payment totals.
- Vendor ad credit is an internal controlled balance only.
- No real-money ad purchase, wallet funding, payout or marketing message is activated by this task.
- No credentials, API keys, tokens, customer phone numbers, OTPs or private provider contact details belong in QA evidence.
