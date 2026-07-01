# Staging Environment Recommendation

KariGO should use a persistent staging environment before any real-customer launch.
Staging must resemble production but use synthetic/test data and sandbox credentials.

## Recommended Topology

- Dedicated staging API with HTTPS and restricted Swagger access.
- Dedicated staging PostgreSQL database; never share production data.
- Staging vendor dashboard and admin portal on separate protected URLs.
- Expo preview/test builds for customer and rider apps.
- Paystack test keys and approved sandbox webhook URL.
- Termii test/preparation credentials only after approval.
- Mock email, WhatsApp, and push initially; enable one sandbox at a time.
- Named test accounts for customer, vendor, rider, support, finance, and admin roles.

## Staging Checklist

- [ ] Provision hosting, database, HTTPS, CORS, secret storage, logs, monitoring, and backups.
- [ ] Apply migrations with `prisma migrate deploy`; validate rollback/recovery notes.
- [ ] Seed only approved synthetic test accounts/data.
- [ ] Verify health, Swagger decision, auth, role guards, complete order flow, refunds, support, reports, and audit logs.
- [ ] Configure and verify provider webhook route/signature/idempotency.
- [ ] Test provider outage and degraded-mode procedures.
- [ ] Run physical-device and target-browser matrix.
- [ ] Complete security, operations, finance, and QA sign-off.

## Approval

Staging deployment is recommended now. Production deployment is not recommended until
the staging checklist, provider decisions, legal review, and launch blockers are closed.
