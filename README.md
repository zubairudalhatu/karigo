# KariGO Platform

KariGO is an MVP delivery and local-commerce platform for the Kano pilot, designed with nationwide-ready boundaries. This monorepo contains the customer app, rider app, vendor dashboard, admin portal, NestJS API, shared packages, source specifications and deployment notes.

## MVP Scope

Included services:

- Food delivery
- Grocery delivery
- Market delivery
- Pharmacy marketplace readiness, compliance-gated and disabled for automated fulfilment
- Parcel delivery
- SME Services for approved service-provider requests

Future super-app services such as ride hailing, bill payments, ticketing, subscriptions and a full wallet are intentionally excluded.

## Workspace

```text
karigo-platform/
├── apps/
│   ├── customer-app/       # React Native Expo
│   ├── rider-app/          # React Native Expo
│   ├── vendor-dashboard/   # Next.js
│   └── admin-portal/       # Next.js
├── services/
│   └── backend-api/        # NestJS, Prisma and Swagger
├── packages/
│   ├── shared-types/
│   ├── ui-components/
│   └── config/             # Shared brand configuration and primary logo
└── docs/
```

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- Docker Desktop, or an accessible PostgreSQL database

## Local Setup

```bash
cd karigo-platform
copy services\backend-api\.env.example services\backend-api\.env
npm install
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run dev:api
```

The API runs at `http://localhost:4000/api/v1`. Swagger is available at `http://localhost:4000/api/docs`.

The MVP API collection and QA workflow are available in `docs/api/KariGO_MVP_API.postman_collection.json`, `docs/api/api-testing-checklist.md`, and `docs/qa/`.

Frontend integration planning is documented in `docs/api/frontend-api-integration-map.md` and `docs/frontend/`. The shared API client is exported from `@karigo/config`; frontend contracts are exported from `@karigo/shared-types`.

The customer app API integration is documented in `docs/frontend/customer-app-api-integration.md`.
The rider app API integration is documented in `docs/frontend/rider-app-api-integration.md`.
The vendor dashboard API integration is documented in `docs/frontend/vendor-dashboard-api-integration.md`.
The admin portal API integration is documented in `docs/frontend/admin-portal-api-integration.md`.

Run a product surface in a separate terminal:

```bash
npm run dev:customer
npm run dev:rider
npm run dev:vendor
npm run dev:admin
```

Vendor dashboard: `http://localhost:3000`  
Admin portal: `http://localhost:3001`

## Foundation Decisions

- PostgreSQL UUID primary keys and Prisma-managed relations
- Snake-case database tables with idiomatic camel-case application fields
- Role-based access from the start, including admin sub-roles
- Full order-status history and admin audit records
- Backend-controlled payment records and webhook audit logs
- Milestone-based delivery tracking for MVP
- Admin-controlled or semi-automatic dispatch for the pilot
- Shared brand tokens and approved KariGO logo across every surface

## Current Status

The MVP backend workflows and all four frontend integrations are implemented and polished
for an internal stakeholder demo. Live PostgreSQL-backed food, parcel, refund, support,
promo, notification, reporting, and access-control smoke scenarios pass using mock
providers.

The health endpoint is `GET /api/v1/health`. The initial module registry is `GET /api/v1/platform/modules`.

**Readiness decision:** ready for internal demo; not ready for a real-customer controlled
soft launch or public launch until critical blockers are closed.

## Verification

```bash
npm run db:generate
npm run db:validate
npm run typecheck
npm run test
npm run build
npm run test:e2e:smoke --workspace @karigo/backend-api
```

Mock payment uses `PAYMENT_PROVIDER=mock`. External notification channels remain mock placeholders; in-app notifications are persisted.

## Production Provider Planning

The current provider abstractions are intentionally mock-first. Paystack Test Mode,
Monnify Sandbox/Test Mode, and Squad Sandbox/Test Mode are implemented for controlled
staging verification only; Flutterwave remains a placeholder. SMS, email, WhatsApp, and
push channels remain gated by their own approved provider flags. Switch providers only
through environment variables after approval and testing.

- Provider readiness audit: `docs/providers/provider-readiness-audit.md`
- Payment integration plan: `docs/providers/payment-provider-integration-plan.md`
- SMS/OTP, email, WhatsApp, and push plans: `docs/providers/`
- Provider environment variables: `docs/providers/provider-environment-variables.md`
- Implementation roadmap: `docs/providers/provider-implementation-roadmap.md`

Sandbox payment verification is available for Paystack, Monnify, and Squad. Never commit
live credentials or expose backend provider secrets to frontend applications. Keep
`PAYMENT_PROVIDER=mock` and `PAYMENTS_PROVIDER=mock` for the Kano pilot default unless a
short controlled sandbox test window is approved. See
`docs/payments/multi-provider-sandbox-payment-foundation-task121.md` and
`docs/deployment/sandbox-payment-verification-runbook-task122.md`.

Task 32 sandbox activation remains waiting for approval, secure credentials, deployed
staging evidence, and customer callback handling. Use
`docs/providers/sandbox-activation-readiness-check.md`,
`docs/providers/staging-payment-provider-configuration.md`, and
`docs/qa/payment-sandbox-test-script.md`; never commit sandbox credentials or test
instrument details.

Task 33 prepares the Termii SMS OTP sandbox path without activating it. Management record
`MDR-009` remains open, and approved staging credentials, sender ID, test phone, and
deployed staging evidence are still required. Mock OTP remains active. See
`docs/providers/sms-otp-sandbox-activation-readiness-check.md`,
`docs/providers/staging-sms-otp-provider-configuration.md`, and
`docs/qa/sms-otp-sandbox-test-script.md`.

Task 34 verifies the transactional email catalogue and prepares staging evidence without
activating email delivery. No provider has been approved and all SMTP/SendGrid/Mailgun/SES
adapters remain fail-closed placeholders. See
`docs/providers/email-sandbox-activation-readiness-check.md`,
`docs/providers/staging-email-provider-configuration.md`, and
`docs/qa/transactional-email-sandbox-test-script.md`.

Task 35 hardens authenticated device-token ownership and prepares the Expo Push staging
assessment without activating delivery. `MDR-014`, an Expo adapter, approved mobile builds,
credentials, physical devices, and deployed staging remain required. See
`docs/providers/push-sandbox-activation-readiness-check.md`,
`docs/providers/staging-push-provider-configuration.md`, and
`docs/qa/push-notification-sandbox-test-script.md`.

Task 36 restricts WhatsApp to an explicit operational template allowlist and prepares the
Meta Cloud staging/webhook assessment without activating delivery. `MDR-015`, consent,
approved templates/recipients, adapters, credentials, and deployed staging remain required.
See `docs/providers/whatsapp-sandbox-activation-readiness-check.md` and
`docs/qa/whatsapp-sandbox-test-script.md`.

The final provider and launch decision package is available under `docs/handover/`:

- `final-provider-readiness-matrix.md`
- `provider-go-live-decision-plan.md`
- `production-secrets-handling-policy.md`
- `staging-environment-recommendation.md`
- `final-launch-risk-register.md`
- `internal-demo-approval-checklist.md`
- `controlled-soft-launch-approval-checklist.md`
- `final-mvp-handover-summary.md`

Current decision: proceed with the internal demo and staging preparation. Do not enable
real-customer traffic or live provider credentials until the controlled-soft-launch
checklist is fully approved.

## Deployment And Launch

- Deployment checklist: `docs/deployment/production-environment-checklist.md`
- Deployment runbook: `docs/deployment/deployment-runbook.md`
- Production TODOs: `docs/deployment/production-todo-register.md`
- Local runbook: `docs/deployment/local-runbook.md`
- Soft-launch checklist and monitoring: `docs/launch/`
- Controlled pilot operations pack: `docs/launch/README.md`,
  `docs/launch/controlled-soft-launch-plan.md`, and
  `docs/launch/pilot-governance.md`
- Post-pilot and public-launch decision framework:
  `docs/launch/post-soft-launch-review-plan.md`,
  `docs/launch/public-launch-readiness-checklist.md`, and
  `docs/launch/public-launch-go-no-go-meeting-template.md`
- Management/investor/board package: `docs/management/README.md` and
  `docs/management/demo-package-index.md`
- Soft-launch demo script and readiness checklist: `docs/demo/`
- UI polish and brand consistency notes: `docs/frontend/ui-polish-notes.md` and `docs/frontend/brand-consistency-notes.md`
- E2E evidence and known issues: `docs/qa/`
- Final handover package and decision checklist: `docs/handover/handover-package-index.md`
- Staging deployment pack: `docs/deployment/staging-readme.md`,
  `docs/deployment/staging-deployment-plan.md`, and
  `docs/deployment/staging-deployment-checklist.md`
- Mobile staging builds: `docs/deployment/mobile-staging-build-guide.md`,
  `docs/qa/customer-app-staging-test-checklist.md`, and
  `docs/qa/rider-app-staging-test-checklist.md`
- Internal demo runbook/checklist and feedback form: `docs/demo/internal-demo-runbook.md`,
  `docs/demo/internal-demo-checklist.md`, and `docs/demo/demo-feedback-form.md`
- Staging smoke test and issue register: `docs/qa/staging-smoke-test-script.md` and
  `docs/qa/staging-known-issues-register.md`
- Full staging E2E/go-no-go pack: `docs/qa/full-staging-pilot-simulation-plan.md`,
  `docs/qa/full-staging-primary-scenario.md`,
  `docs/qa/full-staging-negative-scenarios.md`,
  `docs/qa/full-staging-simulation-evidence-register.md`,
  `docs/qa/end-to-end-readiness-checklist.md`,
  `docs/launch/go-no-go-readiness-scoring-matrix.md`,
  `docs/launch/full-staging-go-no-go-readiness-report.md`,
  `docs/launch/final-launch-blocker-register.md`,
  `docs/launch/controlled-soft-launch-recommendation.md`, and
  `docs/management/go-no-go-meeting-pack.md`
- Private staging provisioning/execution pack:
  `docs/deployment/render-staging-migration-and-seed-guide.md`,
  `docs/deployment/private-staging-deployment-decision-record.md`,
  `docs/deployment/private-staging-environment-validation.md`,
  `docs/deployment/private-staging-demo-account-register.md`,
  `docs/deployment/private-staging-seed-execution-record.md`,
  `docs/qa/private-staging-deployment-verification-script.md`,
  `docs/qa/private-staging-health-verification.md`,
  `docs/qa/private-staging-primary-simulation-execution-record.md`,
  `docs/qa/private-staging-negative-simulation-execution-record.md`,
  `docs/qa/private-staging-evidence-register.md`, and
  `docs/qa/private-staging-issue-register.md`

## Source Of Truth

The supplied KariGO documents are preserved under `docs/`. Their extracted text companions are included to make implementation search-friendly. When requirements conflict, use this priority:

1. KariGO MVP Product Requirement Document
2. KariGO MVP User Stories and Technical Task Breakdown
3. KariGO MVP Database and API Specification
4. KariGO API Documentation and QA Workflow
5. KariGO Frontend Implementation Roadmap
6. Explicit product-owner direction

The explicit approved brand direction for this build is primary red, charcoal/black, white and light grey.

## Consumer Discovery And Vendor Onboarding

Task 44 adds a category-first Customer App homepage, vendor-first Browse ordering,
pharmacy marketplace readiness and a public vendor application workflow.

- Consumer discovery: `docs/consumer-discovery-and-homepage.md`
- Vendor-first Browse: `docs/vendor-first-browse-experience.md`
- Vendor storefront/product discovery priority: `apps/customer-app/app/vendors/[id].tsx`
- Marketplace advertising placement: `docs/marketplace-advertising-placement.md`
- Pharmacy readiness: `docs/pharmacy-marketplace-readiness.md`
- Public vendor application workflow: `docs/public-vendor-application-workflow.md`
- Admin review workflow: `docs/vendor-application-review-and-approval.md`
- Product media readiness: `docs/vendor-product-media-management.md`
- Payout account readiness: `docs/vendor-payout-account-readiness.md`
- Payout account API: `docs/api/vendor-payout-account-api.md`
- Payout verification process: `docs/operations/vendor-payout-account-verification-process.md`
- Payout staging checklist: `docs/qa/vendor-payout-account-staging-checklist.md`
- Vendor product promotion readiness: `docs/vendor-product-promotions.md`

New read-only discovery endpoints live under `/api/v1/discovery/*`. Public vendor
applications can be submitted through `POST /api/v1/vendor-applications`; admin review
is available through `/api/v1/admin/vendor-applications`.

`PHARMACY_MARKETPLACE_ENABLED` defaults to off unless explicitly set in the deployment
environment. No live payout, prescription verification, external ad network, pharmacy
approval automation or automatic vendor approval has been activated.

Task 52 adds vendor payout-account submission and admin verification readiness.
Vendor verification does not initiate transfers or mark settlements paid; payout
execution remains Admin-controlled through the existing settlements workflow.

## Remaining Launch Work

The platform is ready for internal soft-launch review with mock providers. Real payment/refund providers, production infrastructure, hardened web sessions, mobile device testing, monitoring, backups, operational approval, and legal/privacy review remain required before a public pilot.

See `docs/handover/launch-blocker-audit.md` for the accountable blocker register and
`docs/handover/final-soft-launch-decision-checklist.md` for the current go/no-go decision.
Task 37 adds the full staging simulation and go/no-go package. Current Task 37
recommendation is no-go for real-customer controlled soft launch until deployed staging,
full E2E evidence, provider/OTP decisions, legal review, and operations sign-off are
complete.
Task 38 adds the private staging provisioning and simulation execution records. Actual
private staging execution remains blocked until staging hosts, database, secret manager,
demo accounts, and evidence storage are supplied.
Never commit real provider keys, production passwords, tokens, or customer data.
