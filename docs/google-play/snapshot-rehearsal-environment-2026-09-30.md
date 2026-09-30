# Snapshot rehearsal environment — 30 September 2026

Status: **PLAN ONLY — NOTHING CREATED OR RESTORED**.

## Source and capability

Source: Render Postgres `karigo-staging-db` (`dpg-d92nd6hkh4rs738p33a0-a`), PostgreSQL 18, paid `basic_256mb`, 1 GB, Frankfurt. It is linked to the production KariGO environment despite its legacy staging name.

Render documents that paid Postgres instances have point-in-time recovery (PITR), and that PITR creates a separate database instead of overwriting the source. The recovery window is three days on Hobby workspaces and seven days on Pro or higher. The connector did not expose the workspace billing tier or latest recovery point, so the exact window/latest point remains pending dashboard verification. Render also supports on-demand logical exports retained for seven days. A recovery instance is billable until deleted.

Authoritative capability source: <https://render.com/docs/postgresql-backups>. Exact account-specific recovery metadata and price remain unverified because the dashboard is waiting for the account's MFA code.

## Recommended authorized action

Preferred for this rehearsal: create an on-demand logical export, download it to an authorized operator environment, then restore it with `pg_restore` into a separately created, empty, access-restricted Frankfurt Render Postgres instance using destination-only credentials. This avoids PITR's documented behavior of copying the source IP allowlist, currently `0.0.0.0/0`, and permits the destination network policy to be restricted before credentials are issued. The operator must verify the archive and destination identity before running `pg_restore`; the command must never contain the production connection URL.

Proposed configuration:

| Setting | Proposed value |
| --- | --- |
| Source | Fresh Render logical export from `dpg-d92nd6hkh4rs738p33a0-a` |
| Destination display name | `karigo-task209b-rehearsal-20260930` |
| Destination database name | `karigo_task209b_rehearsal_20260930` |
| Region/version | Frankfurt / PostgreSQL 18 |
| Plan/storage | Smallest paid plan compatible with the export; 1 GB minimum; exact price is **not available from current evidence** and must be confirmed in the creation screen |
| Network | No production service attachment; allow only named operator source addresses or a dedicated private rehearsal runner |
| Credentials | New destination-only credentials stored in the operator secret manager; never copy to production services, repository, chat or evidence logs |
| Harness marker | `CONFIRM_TASK209B_RESTORED_SNAPSHOT=AUTHORIZED_RESTORED_COPY` |
| Harness URL | `TASK209B_REHEARSAL_DATABASE_URL=<destination-only secret URL>` |
| Runtime | One-off local/private runner; do not launch the public backend |
| Expiry | Delete destination and export after evidence approval, targeted within 24 hours and no later than seven days |

PITR remains an alternative if the Recovery page confirms a suitable recovery point and the new instance's copied IP allowlist is restricted immediately before any credential is distributed. Stop if Render cannot ensure a separate instance.

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
