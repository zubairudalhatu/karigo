# WhatsApp Sandbox Test Evidence

Never include raw recipients, credentials, business/phone identifiers, confidential
message content, personal data, or unredacted provider screenshots.

| Field | Value |
| --- | --- |
| Test ID |  |
| Date and time |  |
| Environment | Staging |
| Selected provider | Meta Cloud sandbox assessment |
| Tester |  |
| Recipient phone masked | `+234*******000` |
| Template name |  |
| Trigger event |  |
| Expected result |  |
| Actual result |  |
| Status | Passed / Failed / Blocked |
| Screenshot or provider-log reference | Safe external reference only |
| Webhook event reference | Sanitized external identifier only |
| Error details | Sanitized summary only |
| Fix applied |  |
| Retest status |  |
| Reviewer approval |  |

## Security Review

- [ ] Recipient is masked and consent evidence remains external
- [ ] No access/app/webhook token or provider identifier is present
- [ ] No confidential template variables or personal data is present
- [ ] Screenshot/log evidence is redacted and access controlled
- [ ] Request acceptance is not labeled as confirmed delivery
