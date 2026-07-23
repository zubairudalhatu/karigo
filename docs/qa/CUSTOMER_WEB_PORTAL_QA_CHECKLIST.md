# Customer Web Portal QA Checklist

Route:

```text
https://www.karigo.com.ng/app
```

## Access

- Confirm the public website header links to Customer App / Customer Web Portal.
- Confirm the footer includes Customer Web Portal.
- Confirm unauthenticated visitors see login, registration and OTP verification choices.
- Confirm non-customer accounts cannot use the customer portal.
- Confirm logout clears the browser session.

## Customer Account

- Log in with a verified customer.
- Register a new customer account and complete OTP verification.
- Confirm profile data loads.
- Update full name/email and confirm the profile refreshes.
- Add a saved address and confirm it appears in the address list.

## Wallet

- Confirm wallet balance and ledger load.
- Start a wallet top-up and confirm only an HTTPS hosted checkout link opens externally.
- Return to the portal and verify the top-up reference.
- Confirm the browser does not credit wallet balance by itself.

## Utilities

- Load provider/product choices for Airtime, Data, Electricity and Cable TV.
- Request a quote.
- Submit a utility transaction only when wallet/provider flags permit.
- Confirm failed provider-access messages stay safe and do not expose raw provider payloads.

## SME Services

- Confirm the catalogue includes Printing, Car Hire, Laundry, Lesson Teacher, Legal Practitioner and Rent a Car.
- Confirm Legal Practitioner copy says KariGO will review and coordinate availability.
- Submit a non-readiness-only SME Services request using a saved address.
- Confirm request history shows the submitted request.
- Confirm health professional remains readiness-only.

## Guardrails

- Food/grocery web cart checkout remains Phase 2.
- KariGO Rides remains readiness-only.
- No provider phone/email is exposed.
- No payment secrets, OTPs or direct artifact URLs appear in the page.
