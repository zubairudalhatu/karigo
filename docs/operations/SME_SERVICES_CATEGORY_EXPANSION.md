# SME Services Category Expansion

Task 192 expands the safe SME Services category set for customer requests, provider applications, Admin review and Partner Workspace service labels.

## New Categories

- Printing
- Car Hire
- Laundry
- Lesson Teacher
- Legal Practitioner
- Rent a Car

## Safety Copy

Legal Practitioner must use this customer-safe copy:

```text
Request a verified legal practitioner. KariGO will review and coordinate availability.
```

This category does not activate legal advice automation, document drafting automation, court representation promises or customer-provider private contact exposure.

Car Hire and Rent a Car are coordination-only categories. They do not activate instant ride dispatch, vehicle rental contracts, insurance processing, driver assignment or automatic payments.

## Operational Rules

- KariGO Admin reviews every SME Services request before coordination.
- Provider selection records a preference only where available.
- Provider private phone/email remains hidden from customers.
- Health professional records remain readiness-only until separate compliance approval.
- Payments, provider payouts and provider login are not activated by category expansion.

## Deployment Notes

Backend redeploy and Prisma migrate deploy are required because the Prisma enum was expanded.

Customer App, Admin Portal and Vendor Dashboard should be redeployed/updated so the new labels appear consistently.
