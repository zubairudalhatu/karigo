# KGO-EXPORT-ALERTS-v1

Scope: aggregate export-overdue, missed hourly run and controller-failure alerts only.
Sender: no-reply@karigo.com.ng. Sole destination: meetup@karigo.com.ng.
Existing Resend credential stays in the backend. No DNS, email key, service-account key, or webhook changes.

## Runtime

- Backend `RETENTION_ALERTS_ENABLED=true` enables only this operational watchdog, not the retention cleanup worker.
- `RETENTION_REPORT_AUDIENCE=https://karigo-8htn.onrender.com/api/v1/internal/retention-alerts/report`.
- `RETENTION_REPORT_SUBJECT` must be the independently verified numeric uniqueId of the existing export-custodian service account. No email-only identity bypass exists.
- `RETENTION_ALERT_EMAIL_MODE=off` during initial deployment/report validation; `synthetic-only` for the separately approved single email; `live` only after that email's delivery is verified. Default is off.
- Cloud Run `RETENTION_REPORT_ENDPOINT` equals the audience above. Existing custodian identity obtains a metadata ID token; it never receives the Resend key or database credentials.
- The backend watchdog ticks every minute independently of Cloud Scheduler and LogMatch. No successful controller report for >90 minutes opens MISSED_RUN, including when the controller has never reported.
- Existing synthetic-only GCS prefix restriction remains. This release does not authorize processing real exports or broad cleanup.

## Durability and privacy

The additive migration creates two operational tables only. A singleton row lock serializes incident/outbox edits across backend instances. Unique report receipts prevent execution replays; stale/out-of-order runs cannot replace newer heartbeat state. Reports expire after the two-hour accepted start-time window, with three-hour dedup receipt custody.

Operational JSON contains aggregate counts, opaque execution/incident/message identifiers, timestamps, fixed codes and frozen email bodies. No object paths, Customer identifiers, provider exceptions, tokens or credentials are accepted. Identity errors and endpoint errors are sanitized.

Outbox lifecycle: READY → CLAIMED → ACCEPTED → DELIVERED. Definitive failures become REJECTED; exhausted/ambiguous outcomes become REVIEW. Atomic claims have 60-second leases; sends time out after 10 seconds. At most three transient attempts use the same immutable payload and Resend key within 23 hours of first claim. Synthetic sends have at most one attempt, including expired-lease recovery. Accepted email is reconciled using GET only, never resent. Delivered means matching Resend id/from/to/subject with last_event=delivered; mailbox receipt is separately attested by the operator.

No more than one opening/reminder per alert type per rolling 24 hours, including incident reopenings. Unreconciled READY/CLAIMED/ACCEPTED/REVIEW messages block further mail for the same type. Resolution cancels unattempted mail, but never erases attempted-send evidence. Confirmed unresolved incidents may receive a later reminder under that rate limit.

## Single synthetic gate

After explicit implementation/test approval and before mode=live:

1. Set mode=synthetic-only. No real incident emails can send in this mode.
2. Run once in backend root: `node scripts/retention-alert-synthetic.cjs --approved-single-synthetic`.
3. The durable singleton prevents creating a second synthetic notification. Do not retry after unknown outcome.
4. Watchdog uses read-only Resend reconciliation to persist provider ID and DELIVERED on the outbox/incident.
5. Owner confirms exactly one email at the sole destination, sender and required subject.
6. Inspect aggregate operational state; do not print the Resend key or raw HTTP bodies.
7. After delivery and regression evidence, switch mode=live to enable only approved operational alerts. Keep broad retention worker inactive, journal unlocked and App Privacy unsaved.

## Operator handling

- OVERDUE_EXPORT: inspect aggregate count and approved holds; investigate deadline processing. Do not override a hold.
- MISSED_RUN: inspect Cloud Scheduler and Cloud Run execution health; backend or database outages are additional shared failure modes. Google Monitoring stays secondary.
- CONTROLLER_FAILURE: use sanitized execution status and audit evidence; no broad cleanup/apply.
- REVIEW/REJECTED: reconcile provider message evidence before any manual resend. Never blindly resend after the provider's idempotency window.
- Provider accepted/delivered status is not proof a human saw the email. Keep initial mailbox receipt evidence separately.
- This path is independent of LogMatch, but cannot guarantee email delivery during Resend, mailbox, backend or database outages. Existing secondary Monitoring is retained.

## Deployment checks

Require exact commit/live alignment, intended additive migration only, HTTP 200 health, unchanged readiness, real GCP-signed aggregate report accepted and replay deduplicated. Validate missed-run/failure/overdue and sender privacy with synthetic local fixtures. No test email before approval; no new credential; no Google alert policy edits.
