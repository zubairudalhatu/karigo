# MVP Scope Confirmation

## Included And Implemented

- Customer registration, mock OTP verification, login, profile, and address management
- Public vendor/product browsing for food, grocery, and market ordering
- Vendor/product order creation and parcel delivery requests
- Server-calculated totals, promo validation/application, and mock payment
- Customer order history and milestone tracking
- Vendor paid-order acceptance, rejection, preparation, and ready-for-pickup flow
- Admin rider assignment/reassignment
- Rider availability, jobs, delivery milestones, OTP completion, and earnings
- Customer support tickets and audited admin support workflow
- Admin dashboard, operational/finance/vendor/rider/promo reports
- Vendor settlement and rider earning records with manual admin mark-paid actions
- In-app notifications/activity feed with mock external channels
- Customer app, rider app, vendor dashboard, and admin portal
- PostgreSQL/Prisma schema, migration, seed data, JWT roles, Swagger/API documentation
- QA scripts, demo script, deployment/provider/launch documentation

## Intentionally Excluded From MVP

- Live payment gateway and real refund integration
- Real bank-transfer/payout APIs
- Real SMS, email, WhatsApp, and push providers
- Wallet and loyalty points
- Ride-hailing, bill payments, hotel booking, ticketing, and medical appointments
- AI dispatch and advanced live/background GPS tracking
- Advanced marketing automation and full super-app services

## Scope Decision

The implemented scope is sufficient to demonstrate the complete KariGO delivery operating
model with mock providers. Excluded capabilities must remain outside the demo narrative
unless clearly identified as planned production integrations.
