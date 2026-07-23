# Partner Onboarding QA Checklist

Primary route:

```text
https://vendor.karigo.com.ng/register
```

## Public Website Routing

- Confirm Service Provider CTAs on the homepage route to the Partner Workspace registration page.
- Confirm `/services` service-provider onboarding routes to the Partner Workspace.
- Confirm `/vendors` includes service-provider onboarding access.
- Confirm `/sme-services/apply` explains the unified Partner Workspace path and no longer renders the legacy standalone form by default.
- Confirm footer links include Vendor Application, Service Provider Application and Vendor Login.

## Partner Workspace

- Confirm `/register` shows Product Seller, Service Provider and Both.
- Confirm each path opens the public vendor application with the expected partner-type query value.
- Confirm Partner Workspace login copy is visible on `/login`.
- Confirm onboarding document upload page says Partner onboarding.
- Confirm document types include service-provider evidence and portfolio/work sample.

## Admin Review

- Confirm Admin Vendor Applications still load.
- Confirm each application shows partner-type context.
- Confirm approving a vendor application still creates/links a Vendor record and password setup flow.
- Confirm SME Provider Applications still load separately for provider-specific review.

## SME Services Categories

- Confirm Admin request filters include Printing, Car Hire, Laundry, Lesson Teacher, Legal Practitioner and Rent a Car.
- Confirm Admin provider directory can create/update providers in these categories.
- Confirm Vendor/Partner Services catalogue displays the new labels.
- Confirm Customer App SME Services fallback catalogue includes the new categories.

## Guardrails

- No live dispatch is activated.
- No provider payout is activated.
- No provider public login outside approved Partner Workspace is activated.
- No legal advice automation or vehicle rental contract automation is activated.
- No secrets, OTPs, payment tokens or provider private contact details are exposed.
