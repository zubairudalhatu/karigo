# Snapshot rehearsal environment — 30 September 2026

Status: **PLAN ONLY — NOTHING CREATED OR RESTORED**.

## Source and capability

Source: Render Postgres `karigo-staging-db` (`dpg-d92nd6hkh4rs738p33a0-a`), PostgreSQL 18, paid `basic_256mb`, 1 GB, Frankfurt. It is linked to the production KariGO environment despite its legacy staging name.

The authenticated Recovery page confirms point-in-time recovery from any timestamp in the past **7 days**. The latest point shown during inspection was **2026-09-30 20:26:12 Africa/Lagos (UTC+01:00)**. PITR creates a separate PostgreSQL instance. The page also supports on-demand logical exports retained for at least seven days; no export existed at inspection time. A recovery instance is billed until deleted.

Authoritative capability source: <https://render.com/docs/postgresql-backups>. The restore form offers `0.1c-256mb` compute at $6/month and 1 GB storage at $0.30/month, for **$6.30/month prorated by the second** (approximately $0.21 for 24 hours, before taxes and billing-rounding differences).

## Recommended authorized action

Preferred for this rehearsal: create a fresh logical export, download it to an authorized operator environment, create a separate empty Frankfurt PostgreSQL 18 instance, and restore it with `pg_restore` using destination-only credentials. The PITR form can create a separate instance, but it exposes only a display-name field, inherits a seven-day recovery point, and the workspace/environment currently applies `0.0.0.0/0`; it does not provide a pre-creation network-restriction control. Logical export is safer for establishing the required logical database name and validating destination identity before restore. The command must never contain the production connection URL.

Proposed configuration:

| Setting | Proposed value |
| --- | --- |
| Source | Fresh Render logical export from `dpg-d92nd6hkh4rs738p33a0-a` |
| Destination display name | `karigo-task209b-rehearsal-20260930` |
| Destination database name | `karigo_task209b_rehearsal_20260930` |
| Region/version | Frankfurt / PostgreSQL 18 |
| Plan/storage | `0.1c-256mb` at $6/month plus 1 GB at $0.30/month; $6.30/month total, prorated by the second |
| Network | No production service attachment; allow only named operator source addresses or a dedicated private rehearsal runner |
| Credentials | New destination-only credentials stored in the operator secret manager; never copy to production services, repository, chat or evidence logs |
| Harness marker | `CONFIRM_TASK209B_RESTORED_SNAPSHOT=AUTHORIZED_RESTORED_COPY` |
| Harness URL | `TASK209B_REHEARSAL_DATABASE_URL=<destination-only secret URL>` |
| Runtime | One-off local/private runner; do not launch the public backend |
| Expiry | Delete destination and export after evidence approval, targeted within 24 hours and no later than seven days |

PITR remains an alternative using the latest confirmed point `2026-09-30 20:26:12 +01:00` or another timestamp within the preceding seven days. Choose “No, don't copy existing settings,” leave Project/Environment unselected, use `0.1c-256mb` with 1 GB, and stop before **Create database**. Do not use PITR until the effective workspace/environment `0.0.0.0/0` rule is removed or the owner explicitly accepts credential-only isolation for the short-lived instance.

## Execution sequence requiring later approval

1. Record the source database ID, current time, chosen export/recovery point and aggregate source metadata.
2. Create the export and empty destination, or the recovery instance, only after action-time approval.
3. Create/restrict the destination before any application or operator connects.
4. Verify destination host/database/name and a non-production marker, then restore only into the empty destination with `pg_restore`; never use production `DATABASE_URL` with the rehearsal harness.
5. Set the two harness variables in the one-off process only.
6. Run migration rehearsal and counts-only Partner/Flutterwave inventories.
7. Capture aggregate counts, migration runtime and warning codes without row values.
8. Delete temporary credentials, destination database and export at the approved expiry; record deletion evidence.

## Outbound-side-effect isolation matrix

Do not run a public backend. If application code must be loaded for a check, use these names/states in the private one-off environment:

| Flow | Rehearsal state |
| --- | --- |
| Runtime | `APP_ENV=rehearsal`, `NODE_ENV=test`, `LAUNCH_GLOBAL_KILL_SWITCH=true` |
| Payments | `PAYMENTS_LIVE_ENABLED=false`, `PAYMENT_PROVIDER=mock`, `PAYMENTS_PROVIDER=mock`, `FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED=false`; all Flutterwave credential/webhook variables unset |
| Email | `EMAIL_PROVIDER=mock`, `RIDE_RECEIPT_EMAIL_ENABLED=false`, `ACCOUNT_ACTIVATION_EMAIL_ENABLED=false`, `APPLICATION_EMAIL_NOTIFICATIONS_ENABLED=false`; all Resend credential variables unset |
| SMS/OTP | `OTP_PROVIDER=mock`, `SMS_PROVIDER=mock`, `APPLICATION_SMS_NOTIFICATIONS_ENABLED=false`, `GUARANTOR_SMS_NOTIFICATIONS_ENABLED=false`; all Termii credential variables unset |
| Push/FCM | `PUSH_PROVIDER=mock`, `PUSH_NOTIFICATION_ENABLED=false`; `EXPO_ACCESS_TOKEN`, `FCM_SERVER_KEY`, `FCM_PROJECT_ID` unset |
| Calls | `RIDE_IN_APP_CALL_ENABLED=false`, `RIDE_CALL_PROVIDER=disabled`; Agora ID/certificate unset |
| WhatsApp | `WHATSAPP_PROVIDER=mock`; WhatsApp tokens/secrets/phone/account IDs unset |
| Utilities | `UTILITIES_PROVIDER=mock`, `UTILITIES_ENABLED=false`, `UTILITIES_PROVIDER_ENABLED=false`, `UTILITIES_TEST_MODE=true`, `UTILITIES_CUSTOMER_PURCHASE_ENABLED=false`, `UTILITIES_WALLET_PAYMENT_ENABLED=false`, `UTILITIES_LIVE_FULFILLMENT_ENABLED=false`, `ACCELERATE_ENABLED=false`; provider credentials unset |
| Captain storage | `CAPTAIN_UPLOADS_STORAGE_ENABLED=false`; all Captain storage credentials unset |
| Partner storage | `PARTNER_PRIVATE_STORAGE_DRIVER=local`, `PARTNER_PRIVATE_STORAGE_LOCAL_ROOT=<disposable rehearsal directory>`; all Partner object-storage credentials unset |
| Webhooks | No public URL, listener, tunnel or callback registration; webhook secrets unset |
| Workers/schedules | Do not create Render worker/cron services; do not start queue processors or schedulers |
| Clients | Do not point production EAS, Vercel or mobile/web clients at the destination |

## Success and stop conditions

Success requires a separate database, restricted network, no provider credentials, no outbound calls, unchanged production service configuration, successful migration validation and aggregate-only evidence.

Stop immediately if the destination URL equals production, the database name lacks `restore`, `snapshot`, `rehearsal` or `task209b`, any live provider credential is present, any production client/service is attached, or the source backup point cannot be identified.
