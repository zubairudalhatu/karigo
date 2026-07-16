# Task 141 - Go-Live Payment And Cutover Verification

## Scope

Use this record to verify controlled production go-live readiness after the Task
141 checklist is reviewed. This record does not activate live payments, live
utilities, wallet withdrawals, automatic refunds, rides, payouts, Pharmacy
marketplace, provider login or marketing/bulk messaging.

## Evidence Rules

- Do not record live keys, webhook secrets, card details, OTPs, bearer tokens,
  passwords, private APK links or provider dashboard secrets.
- Mask phone numbers, customer addresses and email addresses.
- Store screenshots and provider dashboard evidence outside Git.
- Use order/payment references only where necessary.

## Environment Verification

| Test ID | Check | Expected Result | Status | Evidence |
| --- | --- | --- | --- | --- |
| `T141-ENV-001` | Backend health | Production health endpoint returns healthy | `Pending / Pass / Fail` |  |
| `T141-ENV-002` | Database migration status | Clean, no pending migration surprise | `Pending / Pass / Fail` |  |
| `T141-ENV-003` | Production CORS | Only approved origins work | `Pending / Pass / Fail` |  |
| `T141-ENV-004` | Admin Portal | Login and dashboard load | `Pending / Pass / Fail` |  |
| `T141-ENV-005` | Vendor Dashboard | Login and dashboard load | `Pending / Pass / Fail` |  |
| `T141-ENV-006` | Public Website | Home, services, vendors, riders, contact, privacy, terms load | `Pending / Pass / Fail` |  |
| `T141-ENV-007` | Customer App | Correct release/update points to production API if production launch is approved | `Pending / Pass / Fail / N/A` |  |
| `T141-ENV-008` | Captain App | Correct release/update points to production API if production launch is approved | `Pending / Pass / Fail / N/A` |  |

## Payment Verification

| Test ID | Check | Expected Result | Status | Evidence |
| --- | --- | --- | --- | --- |
| `T141-PAY-001` | Mock fallback | Mock checkout still works if rollback is needed | `Pending / Pass / Fail` |  |
| `T141-PAY-002` | Selected provider | Only the management-approved provider is enabled | `Pending / Pass / Fail / Blocked` |  |
| `T141-PAY-003` | Non-selected providers | Other live providers remain disabled | `Pending / Pass / Fail` |  |
| `T141-PAY-004` | Hosted checkout | Customer opens provider checkout only through backend-returned URL | `Pending / Pass / Fail` |  |
| `T141-PAY-005` | Backend verification | KariGO marks payment successful only after provider verification/webhook | `Pending / Pass / Fail` |  |
| `T141-PAY-006` | Amount/currency/reference | Mismatch is rejected | `Pending / Pass / Fail` |  |
| `T141-PAY-007` | Duplicate verification/webhook | Idempotent, no duplicate order/payment transition | `Pending / Pass / Fail` |  |
| `T141-PAY-008` | Customer/Vendor/Admin status | All surfaces show consistent payment/order state | `Pending / Pass / Fail` |  |
| `T141-PAY-009` | Provider dashboard | Transaction appears with correct masked reference | `Pending / Pass / Fail` |  |
| `T141-PAY-010` | Failure path | Cancelled/failed provider attempt leaves order unpaid with clear retry guidance | `Pending / Pass / Fail` |  |

## Operational Verification

| Test ID | Check | Expected Result | Status | Evidence |
| --- | --- | --- | --- | --- |
| `T141-OPS-001` | Vendor receives paid order | Vendor Dashboard shows paid order ready for action | `Pending / Pass / Fail` |  |
| `T141-OPS-002` | Admin dispatch | Admin can assign Delivery Captain | `Pending / Pass / Fail` |  |
| `T141-OPS-003` | Captain flow | Delivery Captain can accept, pick up, deliver and complete with customer code | `Pending / Pass / Fail` |  |
| `T141-OPS-004` | Support flow | Customer support ticket can be created and reviewed | `Pending / Pass / Fail` |  |
| `T141-OPS-005` | Refund handling | Refund request remains controlled/admin-reviewed | `Pending / Pass / Fail` |  |
| `T141-OPS-006` | SME Services | Request/review flow works without live dispatch/payment/payout | `Pending / Pass / Fail` |  |

## Go/No-Go Summary

| Area | Decision |
| --- | --- |
| Product surfaces | `Go / Conditional / No-Go` |
| Operations coverage | `Go / Conditional / No-Go` |
| Selected payment provider | `Go / Conditional / No-Go / Not selected` |
| Mock fallback | `Go / Conditional / No-Go` |
| Support readiness | `Go / Conditional / No-Go` |
| Security/secret review | `Go / Conditional / No-Go` |
| Final production go-live | `Go / Conditional / No-Go` |

## Current Status

```text
Pending. This record is ready for execution after provider selection, sandbox
certification, production secret review and management signoff.
```
