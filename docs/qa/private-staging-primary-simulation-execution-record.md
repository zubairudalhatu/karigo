# Private Staging Primary Simulation Execution Record

Do not mark any step `Passed` unless it was actually executed in private staging and
evidence has been recorded.

## Execution Metadata

| Field | Value |
| --- | --- |
| Date/time | Not executed |
| Environment | Private staging pending |
| Testers | TBD |
| Order reference | TBD / masked |
| Evidence register | `docs/qa/private-staging-evidence-register.md` |
| Overall result | Blocked |

## Primary Scenario Steps

| Step ID | Workflow step | Expected result | Actual result | Status | Evidence reference | Issue ID |
| --- | --- | --- | --- | --- | --- | --- |
| PRI-001 | Customer registration/login | Customer can authenticate safely | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| PRI-002 | OTP flow | Mock OTP verifies account without exposing OTP | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| PRI-003 | Address creation | Supported Kano address saved and selectable | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| PRI-004 | Vendor browsing | Active vendor and products visible | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| PRI-005 | Cart and promo | Cart builds correctly; `KARIGOFIRST` validates where eligible | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| PRI-006 | Order creation | Server creates order and calculates totals | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| PRI-007 | Mock payment | Payment verifies and order becomes `PAID` | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| PRI-008 | Vendor acceptance | Vendor sees paid order and accepts it | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| PRI-009 | Vendor preparation | Vendor marks preparing then ready for pickup | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| PRI-010 | Admin dispatch | Admin assigns available rider | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| PRI-011 | Rider pickup flow | Rider accepts job and updates pickup statuses | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| PRI-012 | Delivery updates and OTP | Rider completes valid delivery OTP flow | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| PRI-013 | Customer completion | Customer sees completed order and notification | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| PRI-014 | Support ticket | Customer creates ticket and admin replies/resolves | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| PRI-015 | Refund review | Admin reviews controlled refund request once | Not executed; staging unavailable | Blocked | TBD | ISS-001 |
| PRI-016 | Settlement/earnings/reporting | Vendor settlement, rider earning, and admin reports reflect order | Not executed; staging unavailable | Blocked | TBD | ISS-001 |

## Current Result

The primary simulation remains **blocked**, not failed, because the private staging
environment has not been provisioned.
