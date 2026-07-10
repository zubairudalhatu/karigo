# KariGO E2E Evidence Template - Task 62

Use this template during manual credentialed QA. Store completed evidence in the approved QA evidence location. Do not add completed evidence containing sensitive data to Git.

## Session Details

| Field | Value |
|---|---|
| Test date |  |
| Tester name |  |
| Device/browser |  |
| Customer App build/channel |  |
| Rider App build/channel |  |
| Backend URL | `https://karigo-8htn.onrender.com/api/v1` |
| Admin Portal URL | `https://admin.karigo.com.ng` |
| Vendor Dashboard URL | `https://vendor.karigo.com.ng` |

## Test References

| Reference | Masked value |
|---|---|
| Customer persona | Demo Customer |
| Vendor persona | Demo Food Vendor / Demo Grocery Vendor / Demo Market Vendor |
| Rider persona | Demo Rider |
| Admin persona | Super Admin / Operations Admin |
| Order reference |  |
| Payment reference |  |
| Support ticket reference |  |
| Vendor settlement reference |  |
| Rider earning reference |  |

## Evidence Checklist

| Stage | Expected result | Status | Evidence reference | Notes |
|---|---|---|---|---|
| Customer login | Customer reaches home |  |  |  |
| Vendor discovery | Seeded vendors load |  |  |  |
| Cart | Product added to cart |  |  |  |
| Checkout quote | Subtotal, delivery fee, discount and payable shown |  |  |  |
| Promo | `KARIGOFIRST` succeeds or gives correct already-used message |  |  |  |
| Order creation | Order reference created |  |  |  |
| Mock payment | Order becomes paid after backend verification |  |  |  |
| Vendor login | Vendor reaches dashboard |  |  |  |
| Vendor order view | Paid order visible to correct vendor only |  |  |  |
| Vendor acceptance | Status progresses to accepted/preparing/ready |  |  |  |
| Admin login | Admin reaches dashboard |  |  |  |
| Dispatch | Admin assigns demo rider |  |  |  |
| Rider login | Rider reaches dashboard |  |  |  |
| Rider job acceptance | Rider accepts assigned job |  |  |  |
| Rider status progression | Pickup and delivery statuses update |  |  |  |
| Customer delivery code | Code is hidden until eligible state |  |  | Do not record code |
| Delivery completion | Rider completes delivery with customer-supplied code |  |  | Do not record code |
| Support ticket | Customer ticket created and visible to admin |  |  |  |
| Notifications | Customer/vendor/rider/admin notifications make sense |  |  |  |
| Settlements/earnings | Vendor settlement and rider earning visibility confirmed |  |  |  |

## Defects Found

| Defect ID | Area | Severity | Description | Repro steps | Expected | Actual | Owner | Follow-up task |
|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |

## Security Confirmation

- [ ] No passwords recorded.
- [ ] No bearer tokens recorded.
- [ ] No raw delivery OTP values recorded.
- [ ] No provider secrets recorded.
- [ ] No real customer/vendor/rider private data recorded.
- [ ] Screenshots are stored outside Git if they contain sensitive context.

## Signoff

| Role | Name | Decision | Date |
|---|---|---|---|
| QA Lead |  | Pass / Fail / Blocked |  |
| Operations Lead |  | Pass / Fail / Blocked |  |
| Technical Lead |  | Pass / Fail / Blocked |  |
| Management Reviewer |  | Go / No-Go / Deferred |  |
