# Full Staging Negative And Failure Scenarios

Use this table during staging rehearsal. Mark `Passed` only after execution and evidence.

| Test ID | Scenario | Preconditions | Test steps | Expected result | Actual result | Status | Severity if failed | Required action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NEG-001 | Invalid OTP | Customer has pending OTP | Submit wrong OTP | Verification fails; attempt count increases; account remains unverified | Not run | Blocked | High | Execute after staging accounts exist |
| NEG-002 | Expired OTP | Pending OTP can be expired safely | Submit expired OTP | Clear expired message; no verification | Not run | Blocked | High | Execute with controlled expiry |
| NEG-003 | OTP resend cooldown | Resend endpoint enabled | Request resend twice inside cooldown | Second request is rejected safely | Not run | Blocked | Medium | Execute after staging OTP setup |
| NEG-004 | Invalid address | Customer logged in | Submit incomplete/invalid address | Validation error; checkout blocked | Not run | Blocked | Medium | Execute in customer app/API |
| NEG-005 | Promo code rejected | Customer has cart | Submit invalid promo | Clear rejection; total unchanged server-side | Not run | Blocked | Medium | Execute during checkout |
| NEG-006 | Payment failure | Order awaiting payment | Simulate failed/cancelled payment | Payment not successful; order not `PAID` | Not run | Blocked | Critical | Execute with mock/sandbox failure path |
| NEG-007 | Duplicate payment verification | Successful payment exists | Verify same reference twice | No duplicate status history, promo usage, settlement, or notification | Not run | Blocked | Critical | Execute after payment success |
| NEG-008 | Invalid webhook signature | Webhook route configured | Send invalid signature | Request rejected; payment unchanged | Not run | Blocked | Critical | Execute only in approved sandbox |
| NEG-009 | Vendor rejects order | Paid order assigned to vendor | Reject with reason | Order moves to rejection/refund review path | Not run | Blocked | High | Execute controlled rejection |
| NEG-010 | Rider rejects job | Rider has assigned job | Reject with reason | Job removed/reassignment needed; history recorded | Not run | Blocked | High | Execute dispatch rehearsal |
| NEG-011 | No rider available | Ready order and no eligible rider | Attempt assignment | Admin sees safe empty state; order not corrupted | Not run | Blocked | High | Execute with controlled data |
| NEG-012 | Invalid delivery OTP | Rider at destination | Submit wrong OTP | Completion fails; order remains undelivered | Not run | Blocked | Critical | Execute with masked OTP evidence |
| NEG-013 | Delivery OTP reused | Completed delivery exists | Reuse OTP | Reuse rejected; no duplicate completion/earning | Not run | Blocked | Critical | Execute after completion |
| NEG-014 | Support ticket ownership | Customer logged in | Open another user's ticket | Access denied | Not run | Blocked | Critical | Execute access-control test |
| NEG-015 | Duplicate refund request | Refund already requested | Submit another request | Duplicate prevented or idempotent | Not run | Blocked | High | Execute refund rehearsal |
| NEG-016 | Provider notification failure | Mock failure can be simulated | Trigger event with provider failure | Core workflow succeeds; in-app notification remains primary | Not run | Blocked | Medium | Execute provider failure test |
| NEG-017 | App restart during tracking | Customer tracking active | Restart app and reopen tracking | Auth/order state reloads safely | Not run | Blocked | Medium | Execute on test device/browser |
| NEG-018 | API temporary failure | API can be interrupted safely | Trigger request during temporary failure | Friendly error/retry state; no raw stack trace | Not run | Blocked | Medium | Execute in staging window |
| NEG-019 | Unauthorized customer order access | Two customer accounts exist | Customer A opens Customer B order | Access denied | Not run | Blocked | Critical | Execute role/ownership test |
| NEG-020 | Unauthorized rider job access | Two riders/jobs exist | Rider A opens Rider B job | Access denied | Not run | Blocked | Critical | Execute role/ownership test |
| NEG-021 | Unauthorized vendor order access | Two vendors/orders exist | Vendor A opens Vendor B order | Access denied | Not run | Blocked | Critical | Execute role/ownership test |
| NEG-022 | Admin route by non-admin | Non-admin token exists | Call admin endpoint | Access denied | Not run | Blocked | Critical | Execute role guard test |

## Current Negative Scenario Status

No true staging negative scenario has been executed in this task. Automated backend tests
cover important parts of these behaviors, but the full staging matrix remains blocked
until staging accounts and the deployment are available.
