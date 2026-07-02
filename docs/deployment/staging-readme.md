# KariGO Staging README

## Purpose And Limitations

Staging supports internal demos, QA, onboarding trials, and future sandbox-provider
testing. It uses synthetic data and mock providers. It is not approved for public or
real-customer traffic.

## Required Tools

Node.js 20+, npm, PostgreSQL, approved hosting/secret storage, and Expo-compatible test
devices for mobile validation.

## Setup

1. Provision staging PostgreSQL, API/web hosts, HTTPS, secrets, logs, and monitoring.
2. Configure variables from `staging-environment-variables.md`.
3. Run:

```bash
npm ci
npm run db:generate
npm run db:validate
npx prisma migrate deploy --schema services/backend-api/prisma/schema.prisma
npm run db:seed
npm run build
```

4. Start the API with `npm run start --workspace @karigo/backend-api`.
5. Deploy the vendor/admin Next.js builds and create customer/rider Expo preview builds.
6. Verify `GET /api/v1/health` and the approved `/api/docs` policy.
7. Run `docs/qa/staging-smoke-test-script.md`.

## Mobile Staging Builds

- Build guide: `mobile-staging-build-guide.md`
- Customer checklist: `../qa/customer-app-staging-test-checklist.md`
- Rider checklist: `../qa/rider-app-staging-test-checklist.md`
- Customer evidence template: `../qa/customer-app-staging-test-evidence.md`
- Rider evidence template: `../qa/rider-app-staging-test-evidence.md`

## Troubleshooting

- Database errors: verify staging `DATABASE_URL`, network rules, migrations, and SSL requirement.
- CORS errors: verify exact staging dashboard origins.
- Mobile API errors: verify HTTPS URL and test-device network access.
- Login errors: re-check seed completion, account role/status, and staging-only password.
- Provider errors: confirm every provider remains `mock`.

Record all findings in `docs/qa/staging-known-issues-register.md`. Proceed to provider
sandbox testing only after staging smoke and internal demo approval.

## Private Staging Task 38 Records

- `render-staging-migration-and-seed-guide.md`
- `private-staging-deployment-decision-record.md`
- `private-staging-environment-validation.md`
- `private-staging-demo-account-register.md`
- `private-staging-seed-execution-record.md`
- `../qa/private-staging-deployment-verification-script.md`
- `../qa/private-staging-health-verification.md`
- `../qa/private-staging-primary-simulation-execution-record.md`
- `../qa/private-staging-negative-simulation-execution-record.md`
- `../qa/private-staging-evidence-register.md`
- `../qa/private-staging-issue-register.md`

Complete these records before asking management to treat staging as provisioned or
simulation evidence as complete.
