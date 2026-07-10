# Bills & Utilities Provider Integration Readiness

The current implementation is provider-ready but mock-only. A real provider must not be enabled until management approval, sandbox testing and reconciliation controls are complete.

## Current Mock Provider

The backend includes a `MockUtilityProvider` with:

- `validateRecipient`
- `quote`
- `purchase`
- `checkStatus`

Mock behaviour:

- Airtime and Data return successful mock responses.
- Electricity returns a fictional token such as `KGO-TEST-1234-5678`.
- Cable TV returns a successful mock subscription reference.
- Invalid recipients fail safely.
- Amount `99999` kobo simulates a failed transaction.

## Future Provider Checklist

- Provider selected and approved.
- Sandbox account created.
- Sandbox credentials stored only in secret manager.
- Provider product catalogue mapping approved.
- Customer amount limits approved.
- Provider webhook/callback behaviour documented.
- Idempotency key strategy implemented.
- Provider status polling implemented.
- Reversal/refund process approved.
- Reconciliation report format approved.
- Fraud and velocity limits implemented.
- Customer support scripts updated.
- Legal/compliance review completed.

## Reconciliation Requirements

Before live launch, KariGO must reconcile:

- KariGO transaction reference.
- Provider transaction reference.
- Provider status.
- Customer charge status.
- Fulfilment status.
- Reversal/refund status.
- Settlement impact.

## Fraud and Limit Controls Required

- Daily customer utility spend limit.
- Per-transaction minimum and maximum amount.
- Recipient velocity checks.
- Failed-attempt monitoring.
- Admin override audit log.
- Suspicious activity report.

## Refund and Reversal Requirements

- Define when a utility transaction can be refunded.
- Define provider reversal flow.
- Define customer support evidence requirements.
- Define finance approval path.
- Prevent duplicate refunds.
- Record all changes in audit logs.
