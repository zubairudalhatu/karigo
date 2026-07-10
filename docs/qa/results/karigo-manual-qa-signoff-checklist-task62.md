# KariGO Manual QA Signoff Checklist - Task 62

Use this checklist after the manual credentialed QA session is complete.

## Go Criteria

KariGO can move to controlled soft-launch approval only when all required items below are passed or formally accepted by management as non-blocking.

| Area | Required result | Status |
|---|---|---|
| Secure credentials | Demo credentials were supplied without being committed, printed or screenshotted. | Pending |
| Customer App | Customer login, browse, cart, quote, promo, mock payment, tracking, delivery code and support pass. | Pending |
| Rider App | Rider login, availability, job acceptance, status progression, OTP completion and earnings pass. | Pending |
| Vendor Dashboard | Vendor login, order handling, product visibility, settlements, payout and notifications pass. | Pending |
| Admin Portal | Admin login, dashboard, dispatch, support, settlements, reports, utilities and Taxi readiness views pass. | Pending |
| Backend | Health, Swagger, CORS, protected auth, public discovery and protected role endpoints pass. | Pending |
| E2E order | One fresh order is completed from customer creation to rider completion. | Pending |
| Mock payment | Payment succeeds only after backend verification. | Pending |
| Delivery OTP | OTP is visible only to the owning customer at eligible status and is never recorded. | Pending |
| Support workflow | Customer ticket appears in customer and admin views with internal notes protected. | Pending |
| Settlements/earnings | Vendor settlements and rider earnings appear correctly after completion. | Pending |
| Readiness gates | Taxi, Pharmacy and live Bills & Utilities remain gated/not live. | Pending |
| Evidence | Evidence is complete, masked and stored outside Git where needed. | Pending |

## No-Go Criteria

Any item below should block controlled soft launch until fixed or explicitly accepted by management:

- Customer cannot complete checkout and mock payment.
- Server quote can be bypassed or stale pricing can create an order.
- Vendor cannot receive or accept paid order.
- Admin cannot assign rider.
- Rider cannot complete delivery with customer-supplied OTP.
- Customer delivery OTP is exposed to vendor/admin/rider or shown too early.
- Role access control allows cross-role or cross-vendor data access.
- Support internal notes are visible to customer.
- Payment, settlement or earnings records are materially wrong.
- Apps crash during core order lifecycle.
- Live providers or gated services are accidentally activated.

## Final Decision

| Decision | Select one |
|---|---|
| Ready for controlled soft launch |  |
| Ready after minor non-blocking fixes |  |
| Not ready: blockers remain |  |

## Required Approvals

| Approver | Role | Signature/confirmation | Date |
|---|---|---|---|
|  | QA Lead |  |  |
|  | Operations Lead |  |  |
|  | Technical Lead |  |  |
|  | Management Lead |  |  |

## Notes

Use separate implementation tasks for any product/code defects found during the manual QA session. Do not mix defect fixes into QA evidence documents.
