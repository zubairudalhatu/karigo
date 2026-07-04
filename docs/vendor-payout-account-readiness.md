# Vendor Payout Account Readiness

Task 44 keeps payout setup separated from live payout execution.

## Current Status

- Admin settlement marking remains manual and does not initiate bank transfer.
- Payout account collection is documented for finance review.
- No live bank transfer provider was connected.

## Required Future Workflow

- Vendor submits payout details from the vendor workspace.
- Full account numbers must be encrypted or replaced with secure provider references.
- List views must show masked account numbers only.
- Admin/finance review statuses:
  - DRAFT
  - SUBMITTED
  - UNDER_REVIEW
  - CHANGES_REQUESTED
  - APPROVED
  - REJECTED
  - SUSPENDED
- Editing an approved payout account should return it to review.

## Security Rules

- Do not log full account numbers.
- Do not expose payout details to support-only users.
- Do not trigger payouts from account approval.
- Keep payout approval separate from settlement execution.
