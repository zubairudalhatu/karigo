# Private Staging Evidence Register

Do not store real credentials, OTP values, full phone numbers, device tokens, payment
keys, private customer data, or unmasked screenshots in Git.

| Evidence ID | Test area | Scenario | Date/time | Tester | Result | Screenshot/log reference | Sensitive data masked | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| EV-STG-001 | Deployment | Private staging provisioned | Not executed | TBD | Blocked | TBD | Yes | No staging host/database/secret manager supplied |
| EV-STG-002 | Primary simulation | Customer-to-rider happy path | Not executed | TBD | Blocked | TBD | Yes | Requires private staging deployment |
| EV-STG-003 | Negative simulation | Priority negative tests | Not executed | TBD | Blocked | TBD | Yes | Requires private staging deployment |
| EV-STG-004 | Local verification | Backend build/tests and frontend typechecks | 2026-07-01 | Codex | Pending final run | Command output in Codex session | Yes | Supporting evidence only; not a substitute for staging |

## Evidence Storage Guidance

- Store sensitive screenshots/logs in an access-controlled evidence location outside Git.
- Use masked order/ticket/payment references in repository records.
- Never include real phone numbers, OTP values, provider dashboard screenshots, or
  deployment tokens.
