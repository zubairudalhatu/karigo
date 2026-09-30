# Production infrastructure evidence closure — 30 September 2026

Status: **PARTIAL — OWNER CONTRACT AND BUCKET-CONFIGURATION EVIDENCE REQUIRED**. This task performed read-only inspection. No backup, restore, bucket, environment change, deployment, Play change or Git push occurred.

## Repository control

- Branch: `codex/dependency-security-remediation`
- HEAD: `ef1887d15b785c8af778a85f096a5dfe11f4c815`
- `origin/main`: `e5dc2d544309be7bf251c6a0242e42478421241a`
- Merge base: `e5dc2d544309be7bf251c6a0242e42478421241a`
- Preserved unstaged and untouched: `docs/google-play/three-app-production-readiness-2026-09-28.md`

Ahead chain, oldest first:

1. `dd8dd9e3de211fb7be9e84856b61ededee046e0f` — documentation only; Google Play Captain/Customer location/foreground-service evidence under `docs/`.
2. `ba004c18927ad3d13a53f907a5c61a9bc3988fa7` — documentation only; Captain foreground-service form record under `docs/`.
3. `8e68f22f93c12034c2d2686aa7fdb98ec0c879c8` — application runtime, tests, database schema/migration, scripts and compliance documentation under `apps/`, `packages/`, `services/` and `docs/`; production-sensitive because it changes storage/payment/deletion behavior and adds migration `20260930150000_task209b_storage_lifecycle`.
4. `ef1887d15b785c8af778a85f096a5dfe11f4c815` — application runtime, environment validation, tests/tooling and documentation under `services/` and `docs/`; production-sensitive because it changes Partner storage behavior and cleanup/rehearsal tooling; no new schema migration.

High-confidence secret scan of these changes found no newly introduced credential. No APK/AAB, build output, reviewer credential or generated binary is in the four-commit diff.

## Render production topology

| Item | Read-only evidence |
| --- | --- |
| Backend | `karigo`, service `srv-d92nv5u7r5hc73a6vsjg`, URL `https://karigo-8htn.onrender.com` |
| Type/plan/region | Node web service; Starter; Frankfurt; one instance |
| Repository/root | `zubairudalhatu/karigo`; `services/backend-api` |
| Branch | `main` |
| Auto-deploy | **Off** (`autoDeploy=no`, trigger `off`) |
| Build/start | `npm ci && npx prisma generate && npm run build`; `npm run start:prod` |
| Pre-deploy | `npx prisma migrate deploy` — executes only when a deployment is triggered |
| Live deploy | Manual deploy of `de3bbdccf17570bbeead4b18b3e9413d50048f74`, live since 24 August 2026 |
| Workers/cron | No KariGO background worker or cron service was returned; only the one web service matched the KariGO repository/name |
| Database | `karigo-staging-db`, ID `dpg-d92nd6hkh4rs738p33a0-a`, PostgreSQL 18, `basic_256mb`, 1 GB, Frankfurt, available, no HA/read replicas/pool |
| Database association | Backend and database share Render environment `evm-da6rq949v7es7388ceqg`; the database name is legacy `karigo_staging` even though it serves the production backend |
| Network evidence | Database IP allowlist currently reports `0.0.0.0/0`; credentials remain required. The rehearsal destination must not copy this broad rule unchanged. |

The authenticated Recovery page confirms a seven-day PITR window and a latest inspected recovery point of `2026-09-30 20:26:12 +01:00`. No logical export existed. A customized PITR instance can be left unattached to any Project/Environment. The minimum inspected option is `0.1c-256mb` plus 1 GB storage at $6.30/month, prorated by the second. The final button is **Create database**. No database was created.

The restore form does not provide a pre-creation network-policy control, while workspace/environment rules currently permit `0.0.0.0/0`. A logical export restored into a separately created destination remains the safer method for controlling the logical database name and verifying the destination before import, but network restriction still requires closing the effective workspace rule or using an isolated workspace/provider.

## Captain storage

Classification: **A — provider definitively identified as Google Cloud Storage**. The production endpoint is `https://storage.googleapis.com`, Google Cloud Storage's XML/S3-compatible endpoint. Render also shows bucket `karigo-captain-uploads`, storage enabled, path-style addressing enabled, and application region `auto`. No credential value was revealed or recorded.

Google Cloud documents standard server-side encryption as the default, but Render does not expose the bucket's actual encryption-key mode. The bucket location, public-access prevention/IAM, uniform bucket-level access, versioning, soft-delete retention, lifecycle, retention policy, object lock, backup/recovery configuration and service-plan/billing account remain unconfirmed until the Google Cloud bucket/account is inspected.

Account-level evidence still required: Google Cloud Terms, accepted/incorporated Cloud Data Processing Addendum, current subprocessors, service-specific terms, independent security/fraud/diagnostic/improvement uses, location and transfer terms, deletion/soft-delete behavior, account acceptance/version record and bucket configuration evidence. Preserve `CAPTAIN STORAGE CONTRACT — NOT CONFIRMED` until those account records are captured.

## Partner recommendation

Classification: **A — reuse Google Cloud Storage with a separate Partner private bucket, pending provisioning approval and account-evidence closure**. The confirmed XML/S3-compatible endpoint supports the application driver and object deletion. A separate bucket is required for IAM, lifecycle, retention, migration rollback and audit isolation.

Proposed variable shape, with values supplied only in the Render secret store:

```text
PARTNER_PRIVATE_STORAGE_DRIVER=s3
PARTNER_PRIVATE_STORAGE_ENDPOINT=<approved HTTPS endpoint or unset for AWS S3>
PARTNER_PRIVATE_STORAGE_REGION=<approved region>
PARTNER_PRIVATE_STORAGE_BUCKET=<dedicated private Partner bucket>
PARTNER_PRIVATE_STORAGE_ACCESS_KEY_ID=<scoped credential>
PARTNER_PRIVATE_STORAGE_SECRET_ACCESS_KEY=<scoped secret>
PARTNER_PRIVATE_STORAGE_FORCE_PATH_STYLE=<true-or-false>
PARTNER_PRIVATE_STORAGE_SERVER_SIDE_ENCRYPTION=<AES256-or-aws:kms>
```

The credential must permit only the required Partner namespace operations. Anonymous access must be blocked. Versioning/lifecycle/backup and delete-marker behavior must be documented before provisioning approval.

## Push-impact audit

If `origin/main` moves from `e5dc2d544309be7bf251c6a0242e42478421241a` to `ef1887d15b785c8af778a85f096a5dfe11f4c815` today:

- Render: **no automatic deployment** because KariGO auto-deploy is off. No Prisma migration runs until a later manual Render deploy, whose pre-deploy command is `npx prisma migrate deploy`.
- Vercel: three production deployments are expected for `karigo-website`, `karigo-admin-portal`, and `karigo-vendor-dashboard`. GitHub deployment records and commit status show all three deployed automatically from the current `main` commit. Their package build commands are Next.js builds and contain no Prisma migration.
- GitHub Actions: none. The repository API reports zero workflows and there is no `.github/workflows` tree.
- EAS/Expo: no automatic build or OTA update is configured in GitHub or package scripts. `eas.json` defines manual profiles only.
- Google Play: no automatic upload or submission is configured.

The push is therefore production-sensitive because of the three Vercel deployments even though Render is manual.

## Owner inputs

- Approve one isolated snapshot method and its temporary cost.
- Approve Google Cloud Storage reuse and a separate Partner bucket after bucket IAM/location/lifecycle evidence and contract records are supplied.
- Supply provider agreement/DPA/account acceptance evidence without credentials.
- Supply Flutterwave merchant agreement/DPA/account terms evidence.
- Approve retention purposes/durations identified in the deletion matrix.

## Stop gate

No restore/clone, export, database creation, bucket provisioning, environment edit, migration, cleanup, legacy-file migration, deployment or Git push is authorized by this document.
