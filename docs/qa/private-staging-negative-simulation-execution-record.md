# Private Staging Negative Simulation Execution Record

Do not mark any test `Passed` unless it was actually executed in private staging.

## Execution Metadata

| Field | Value |
| --- | --- |
| Date/time | Not executed |
| Environment | Private staging pending |
| Testers | TBD |
| Overall result | Blocked |

## Priority Negative Tests

| Test ID | Scenario | Expected result | Actual result | Status | Evidence reference | Issue ID |
| --- | --- | --- | --- | --- | --- | --- |
| NEG-STG-001 | Invalid OTP | OTP rejected; attempt count increases | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| NEG-STG-002 | OTP expiry or simulated expiry | Expired OTP rejected | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| NEG-STG-003 | OTP resend cooldown | Cooldown enforced | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| NEG-STG-004 | Invalid promo | Promo rejected safely; server total unchanged | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| NEG-STG-005 | Payment failure | Payment fails safely; order not paid | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| NEG-STG-006 | Duplicate payment verification | Idempotent; no duplicate side effects | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| NEG-STG-007 | Vendor rejection | Rejection reason required and status recorded | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| NEG-STG-008 | Rider rejection | Rejection reason recorded and reassignment path available | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| NEG-STG-009 | Invalid delivery OTP | Completion blocked | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| NEG-STG-010 | Unauthorized order access | Other customer's order denied | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| NEG-STG-011 | Unauthorized rider-job access | Other rider's job denied | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| NEG-STG-012 | Unauthorized vendor-order access | Other vendor's order denied | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| NEG-STG-013 | Non-admin access to admin route | Access denied | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| NEG-STG-014 | Notification provider failure | Core workflow succeeds; failure logged safely | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| NEG-STG-015 | API temporary failure handling | Friendly error/retry state, no raw stack trace | Not executed; staging unavailable | Blocked | TBD | ISS-001 |

## Current Result

The negative simulation remains **blocked** because private staging endpoints and test
accounts are not available.
