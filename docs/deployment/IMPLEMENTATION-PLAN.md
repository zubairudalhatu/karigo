# Incremental Implementation Plan

## Increment 1: Foundation

- Monorepo, app shells, shared brand/theme and logo
- NestJS bootstrap, Swagger and environment configuration
- PostgreSQL/Prisma schema and module registry

## Increment 2: Identity and Catalogue

- Phone-first customer registration and OTP abstraction
- JWT login, refresh strategy, RBAC guards and admin sub-role guards
- Customer profile and address ownership
- Vendor onboarding, approvals, categories and products

## Increment 3: Customer Order Journey

- Food/grocery/market cart and checkout
- Parcel delivery and SME Services request flows
- Delivery fee calculation placeholder
- Mock payment initiation, webhook verification and idempotency

## Increment 4: Fulfilment

- Vendor accept/reject/preparing/ready workflow
- Admin-controlled dispatch
- Rider online/offline, job acceptance and milestone updates
- Delivery OTP and completion

## Increment 5: Operations and Pilot Readiness

- Support tickets and notifications
- Vendor settlements and rider earnings
- Admin dashboard, reports, promotions and audit logs
- Automated backend tests and end-to-end manual QA checklist
