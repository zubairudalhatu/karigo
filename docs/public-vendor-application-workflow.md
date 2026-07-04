# Public Vendor Application Workflow

Task 44 adds a safe public vendor application workflow.

## Public Entry Points

- Customer App Profile: `Become a KariGO Vendor`
- Mobile route: `/vendor/apply`
- Mobile route: `/vendor/application-status`
- API: `POST /api/v1/vendor-applications`
- API: `GET /api/v1/vendor-applications/status?reference=&email=`

## Application Categories

- Restaurant
- Groceries
- Market Items
- Pharmacy
- Parcel/Logistics Partner
- SME Services
- Other Marketplace Vendor

## Public Status Protection

Applicants must supply both:

- Application reference.
- Application email address.

Internal review notes are not returned in public status responses.

## Important Limitation

Application approval does not automatically publish a storefront, create live products, approve payout details, approve promotions, or enable pharmacy scope.
