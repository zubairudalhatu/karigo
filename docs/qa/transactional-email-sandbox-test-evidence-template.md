# Transactional Email Sandbox Test Evidence

Mask recipients and reference sensitive provider evidence only by an approved external
identifier. Never include credentials, sender-domain records, personal details, or
unredacted provider screenshots.

| Field | Value |
| --- | --- |
| Test ID |  |
| Date and time |  |
| Environment | Staging |
| Selected provider |  |
| Tester |  |
| Recipient email masked | `t***@e***` |
| Template name |  |
| Trigger event |  |
| Expected result |  |
| Actual result |  |
| Status | Passed / Failed / Blocked |
| Screenshot or provider-log reference | Safe external reference only |
| Rendering issue observed |  |
| Error details | Sanitized summary only |
| Fix applied |  |
| Retest status |  |
| Reviewer approval |  |

## Security Review

- [ ] Recipient is masked
- [ ] No API key, SMTP password, token, or provider secret is present
- [ ] No personal customer/payment/support data is present
- [ ] Sender-domain records and screenshots remain outside Git
- [ ] Provider acceptance is not mislabeled as confirmed delivery
