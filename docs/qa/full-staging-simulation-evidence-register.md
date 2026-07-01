# Full Staging Simulation Evidence Register

Do not store secrets, OTP values, full phone numbers, device tokens, payment keys, raw
provider payloads, or private customer data in this repository. Link to masked evidence
only.

| Evidence ID | Test area | Scenario | Date/time | Environment | Tester | Related order reference | Related ticket/refund reference | Expected result | Actual result | Status | Screenshot/log reference | Sensitive data masked | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| E2E-001 | Platform | Task 37 automated backend build/test | 2026-07-01 | Local workspace | Codex | N/A | N/A | Backend build/tests pass | Pending final verification run | Pending | N/A | Yes | Record final command result after verification |
| E2E-002 | Customer-to-rider journey | Primary happy path | TBD | Staging | TBD | TBD | TBD | Full order completes with payment, vendor, dispatch, rider, support, settlement, reports | Not executed | Blocked | TBD | Yes | Requires deployed staging and demo accounts |
| E2E-003 | Provider fallback | Mock providers available | TBD | Staging/local | TBD | N/A | N/A | Mock payment/OTP/email/WhatsApp/push remain selectable | Not executed as full staging smoke | Blocked | TBD | Yes | Automated unit tests support fallback behavior |

## Evidence Handling Rules

- Store screenshots in an access-controlled evidence folder outside Git when they include
  operational data.
- Mask all email addresses, phone numbers, order customer names, payment references where
  needed, device tokens, and provider dashboard details.
- Never paste raw provider webhook payloads if they include signatures, tokens, phone
  numbers, or personal data.
- Record failed and blocked scenarios honestly.
