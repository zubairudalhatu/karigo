# Staging Seed Data

Run only against an approved synthetic staging database:

```bash
npm run db:seed
```

Set `SEED_DEMO_PASSWORD` and the `SUPER_ADMIN_*` variables in staging secret storage
before running. Never use real customer, vendor, rider, or production-admin details.

## Included Synthetic Data

- Configurable super admin
- Demo operations admin
- Demo customer with profile and Home address
- Demo active/open vendor and vendor user
- Food, grocery, and market vendor categories
- Jollof Rice and Chicken Suya products
- Demo active/online rider and rider user
- `KARIGOFIRST` launch promo
- Sample awaiting-payment parcel order

Default local identifiers are documented in `docs/deployment/local-runbook.md`; staging
operators must record actual staging account placeholders separately and distribute them
through an approved channel.

After staging setup, replace default/example passwords, verify roles/statuses, and
re-seed only when the team accepts that existing demo records may be updated.
