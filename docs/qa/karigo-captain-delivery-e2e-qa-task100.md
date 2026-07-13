# KariGO Captain Delivery E2E QA Execution Pack - Task 100

Date prepared: 2026-07-13

## Purpose

This pack is the final staging QA execution guide for testing the refined KariGO
Captain delivery workflow after Task 99.

The test chain is:

```text
Customer App order placement
-> Vendor Dashboard preparation
-> Admin Portal dispatch
-> KariGO Captain assignment
-> Delivery Captain pickup and delivery workflow
-> Customer delivery code completion
-> Admin final status verification
-> settlement visibility review
```

This is a QA, evidence and signoff pack only. It does not activate live rides,
live ride booking, live payouts, wallet withdrawals, live payments, Pharmacy
marketplace, provider login, or any live provider integration.

## Approved Language

Use the following terms during QA recording and management review:

| Term | Usage |
| --- | --- |
| KariGO Captain | The renamed operational app for approved delivery and future ride operators |
| Delivery Captain | Captain handling delivery jobs only |
| Ride Captain | Future Captain mode for KariGO Rides readiness only |
| KariGO Rides | Future ride service; not live in this QA |
| Ride readiness | Application/review path for future ride operations |
| Ride operations | Admin-facing staging/readiness area; not live dispatch |

Internal code, API paths, database fields and package identifiers may still use
`rider` or `taxi` names for compatibility. Do not treat those internal names as
public copy defects unless they appear in visible customer/admin/vendor/Captain UI.

## Staging Environment

| Surface | Staging target |
| --- | --- |
| Backend API | `https://karigo-8htn.onrender.com/api/v1` |
| Backend health | `https://karigo-8htn.onrender.com/api/v1/health` |
| Admin Portal | `https://admin.karigo.com.ng` |
| Vendor Dashboard | `https://vendor.karigo.com.ng` |
| Customer App | Customer staging APK / `customer-staging` update channel |
| KariGO Captain App | Captain staging APK / `rider-staging` update channel |
| Provider mode | Mock providers only unless sandbox provider testing is separately approved |

Credential source: secure staging handover only. Do not record passwords, OTP
values, bearer tokens, full phone numbers, private device identifiers, payment
details or sensitive screenshots in Git.

## Source Documents

- `docs/qa/rider-admin-dispatch-e2e-qa-task96.md`
- `docs/qa/rider-app-staging-test-checklist.md`
- `docs/qa/captain-app-role-mode-readiness-task98.md`
- `docs/qa/captain-ride-copy-cleanup-task99.md`
- `docs/qa/admin-portal-role-test-checklist.md`
- `docs/qa/vendor-dashboard-role-test-checklist.md`
- `docs/qa/customer-app-role-test-checklist.md`
- `docs/qa/backend-api-smoke-test-checklist.md`
- `docs/deployment/karigo-staging-demo-accounts.md`

## QA Roles

| Role | Surface | Responsibility |
| --- | --- | --- |
| Customer tester | Customer App | Create order, mock-pay, track order and reveal delivery code only when eligible |
| Vendor tester | Vendor Dashboard | Accept paid order, mark preparing and ready for pickup |
| Admin/dispatch tester | Admin Portal | Review order, assign Delivery Captain and verify final state |
| Captain tester | KariGO Captain App | Go online, accept job, progress pickup/delivery and complete with customer code |
| QA recorder | All | Record evidence, issue IDs, timestamps and final recommendation |

## Preflight Checklist

| Check | Expected result | Status | Notes |
| --- | --- | --- | --- |
| Backend health | `/api/v1/health` responds successfully | Pending | Render may cold-start |
| Backend base path | `/api/v1` may return `NOT_FOUND`; this is expected | Pending | Use `/api/v1/health` for health |
| Customer App ready | Staging app opens, guest/onboarding flow works and login succeeds | Pending | Use secure customer credential |
| Vendor Dashboard ready | Vendor can log in at branded domain | Pending | Use secure vendor credential |
| Admin Portal ready | Admin can log in at branded domain | Pending | Use secure admin credential |
| KariGO Captain App ready | Staging app opens with Captain branding | Pending | Use secure Delivery Captain credential |
| Captain wording visible | App uses KariGO Captain, Delivery Captain and Ride readiness wording | Pending | No visible old driver-mode copy |
| Mock payment active | Checkout uses mock payment only | Pending | No live provider call |
| Mock OTP/notifications active | OTP and notification providers remain staging-safe | Pending | No real provider activation |
| Demo vendor/products ready | Test vendor has active products | Pending | Use staging-safe data |
| Demo Delivery Captain ready | Captain is active/available for assignment | Pending | Admin may need to set availability |

## End-to-End Execution Script

### T100-001 - Customer Creates Paid Order

1. Open the Customer App.
2. Log in with the secure demo customer account.
3. Browse a Food, Grocery or Market vendor.
4. Add one or more products to cart.
5. Open checkout.
6. Confirm server-authoritative pricing:
   - cart subtotal
   - delivery fee
   - discount
   - payable total
7. Create the order.
8. Complete mock payment.
9. Confirm the order is paid and visible in Customer App order details.

Expected result:

- Order is created using backend quote values.
- Mock payment marks payment successful.
- Order becomes ready for vendor/admin workflow.
- No live payment provider is called.

Evidence:

| Field | Value |
| --- | --- |
| Order reference |  |
| Vendor used |  |
| Payment provider mode | Mock |
| Customer result | Passed / Failed / Blocked |
| Notes |  |

### T100-002 - Vendor Prepares Order

1. Open Vendor Dashboard.
2. Log in with the secure demo vendor account.
3. Open new/paid orders.
4. Confirm the test order appears.
5. Accept the order.
6. Mark preparing.
7. Mark ready for pickup.

Expected result:

- Vendor sees only its own order.
- Vendor does not see delivery code/OTP.
- Order reaches dispatch-ready status.
- No payout, transfer or settlement edit action is exposed to the vendor.

Evidence:

| Field | Value |
| --- | --- |
| Vendor order visible | Yes / No |
| Final vendor status |  |
| Vendor result | Passed / Failed / Blocked |
| Notes |  |

### T100-003 - Admin Assigns Delivery Captain

1. Open Admin Portal.
2. Log in with secure admin credentials.
3. Open Orders or Dispatch.
4. Locate the test order.
5. Confirm the order is ready for Delivery Captain assignment.
6. Confirm an eligible active Delivery Captain is available.
7. Assign the Delivery Captain.
8. Confirm order detail shows assigned Captain and assignment status.

Expected result:

- Admin can assign an eligible Delivery Captain.
- Assignment is visible in Admin Portal and Captain App.
- Admin does not see the customer delivery code/OTP.
- Ride operations remain separate and do not activate live rides.

Evidence:

| Field | Value |
| --- | --- |
| Assigned Captain persona | Demo Delivery Captain |
| Admin status after assignment |  |
| Dispatch result | Passed / Failed / Blocked |
| Notes |  |

### T100-004 - Delivery Captain Accepts Job

1. Open the KariGO Captain App.
2. Log in with the secure Delivery Captain account.
3. Confirm dashboard shows:
   - Captain greeting/name
   - Delivery Captain availability
   - today's assigned deliveries
   - active delivery if present
   - completed delivery summary if available
   - support/help guidance
   - staging safety note
4. Go online if required.
5. Open Deliveries.
6. Open the assigned job.
7. Accept the job.

Expected result:

- Captain login/session works and is isolated from other surfaces.
- Captain App uses Captain/Delivery Captain wording.
- Job can be accepted.
- Delivery code/OTP is not visible in the Captain App.

Evidence:

| Field | Value |
| --- | --- |
| Captain app build/update |  |
| Dashboard loads | Yes / No |
| Status after accept |  |
| Captain accept result | Passed / Failed / Blocked |
| Notes |  |

### T100-005 - Pickup And Delivery Progression

1. From Captain job detail, confirm pickup and delivery sections render.
2. Progress through pickup.
3. Start delivery.
4. Mark arrived at destination.
5. Confirm delivery code entry is not shown too early if the app requires
   the delivered state before completion.
6. Mark delivered where required by the current flow.
7. Confirm delivery code entry appears only at the allowed completion stage.

Expected status progression:

```text
RIDER_ASSIGNED
RIDER_ARRIVING_PICKUP
PICKED_UP
ON_THE_WAY
ARRIVED_DESTINATION
DELIVERED
COMPLETED
```

Expected result:

- Backend remains source of truth for status transitions.
- Captain cannot skip required operational steps.
- Delivery code completion is only available at the safe stage.
- No live ride, payout, withdrawal or payment action appears.

Evidence:

| Field | Value |
| --- | --- |
| Pickup result | Passed / Failed / Blocked |
| On-the-way result | Passed / Failed / Blocked |
| Arrival result | Passed / Failed / Blocked |
| Delivered result | Passed / Failed / Blocked |
| Code entry timing correct | Yes / No |
| Notes |  |

### T100-006 - Customer Reveals Delivery Code

1. Open Customer App order detail.
2. Confirm delivery code is hidden before eligible status.
3. At the eligible status, tap the customer-controlled reveal action.
4. Confirm safety text is visible:
   `Only share this code after you have received your order.`
5. Customer verbally shares the code with the Delivery Captain during the test.

Expected result:

- Only the authenticated owning customer can retrieve the code.
- Code is not visible in Admin Portal, Vendor Dashboard, Captain App, notifications
  or order list screens.
- Code value is never recorded in QA documents or screenshots.

Evidence:

| Field | Value |
| --- | --- |
| Customer owns order | Yes / No |
| Reveal action visible at eligible status | Yes / No |
| Safety copy visible | Yes / No |
| Code not recorded | Confirmed |
| Notes |  |

### T100-007 - Delivery Captain Completes Delivery

1. If safe, submit one invalid six-digit code first.
2. Confirm invalid code is rejected and the order remains active.
3. Enter the valid customer-supplied code.
4. Confirm success message.
5. Confirm the order moves to `COMPLETED`.
6. Confirm Captain earnings visibility if supported by current staging data.

Expected result:

- Invalid code fails safely.
- Valid code completes delivery.
- Completion does not duplicate order history, earnings or settlement records.
- Delivery code is cleared/invalidated after completion.

Evidence:

| Field | Value |
| --- | --- |
| Invalid code rejected | Yes / No / Not tested |
| Valid code completion result | Passed / Failed / Blocked |
| Final order status |  |
| Captain earnings visible | Yes / No |
| Notes |  |

### T100-008 - Admin Final Verification

1. Refresh Admin Portal order detail.
2. Confirm final order status is `COMPLETED`.
3. Confirm status history shows assignment and delivery progression.
4. Confirm no delivery code/OTP is shown.
5. Confirm Captain earning and vendor settlement records are created where expected.
6. Confirm dashboard/report metrics update within expected staging timing.

Expected result:

- Admin sees the full operational status trail.
- Admin cannot view delivery code/OTP.
- Settlement and earning records are visible for internal recordkeeping.
- No live bank transfer, payout or withdrawal action is triggered.

Evidence:

| Field | Value |
| --- | --- |
| Admin final order status |  |
| Status history complete | Yes / No |
| Code hidden from Admin | Yes / No |
| Captain earning visible | Yes / No |
| Vendor settlement visible | Yes / No |
| Notes |  |

### T100-009 - Vendor Settlement Visibility

1. Open Vendor Dashboard as the demo vendor.
2. Open Settlements.
3. Confirm the completed order appears when eligible.
4. Confirm read-only settlement data:
   - order number
   - settlement amount
   - status
   - created date
   - paid date when applicable
5. Confirm no admin mark-paid, edit or transfer control exists for vendor.
6. Confirm settlement notification title, message and timestamp render separately.

Expected result:

- Vendor sees only its own settlement records.
- Vendor does not see Captain earnings, delivery code/OTP, customer secrets,
  admin notes, payment tokens or unrelated financial records.
- Settlement view remains read-only.

Evidence:

| Field | Value |
| --- | --- |
| Vendor settlement visible | Yes / No |
| Vendor scoping correct | Yes / No |
| Read-only controls confirmed | Yes / No |
| Notification formatting correct | Yes / No |
| Notes |  |

## Captain/Ride Readiness Negative Checks

| Check | Expected result | Status | Notes |
| --- | --- | --- | --- |
| Non-Captain account in Captain App | Rejected with clear role/access message | Pending |  |
| Captain cannot view delivery code | No code fetch/display surface exists | Pending |  |
| Admin cannot view delivery code | Admin order/dispatch pages do not expose code | Pending |  |
| Vendor cannot view delivery code | Vendor order/settlement/notification pages do not expose code | Pending |  |
| Invalid delivery code | Rejected; order remains active | Pending |  |
| Duplicate completion attempt | Does not duplicate history, earning or settlement | Pending | If practical |
| Captain rejects job | Order returns to dispatch-ready or reassignment-safe state | Pending | Controlled test only |
| Expired Captain session | Redirects to login safely | Pending | No session loop |
| Ride readiness visible | Presented as future/staging readiness only | Pending | No live rides |
| Ride operations in Admin | Does not expose live ride dispatch, fare billing or payment capture | Pending |  |
| Mock providers | No live payment/SMS/email/WhatsApp/push/bank provider called | Pending |  |

## Issue Register

| Issue ID | Area | Severity | Description | Reproduction steps | Owner | Status | Launch impact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T100-ISS-001 |  | P0/P1/P2/P3 |  |  |  | Open |  |

Severity guide:

- P0: blocks order completion, exposes secrets/delivery code, triggers live provider,
  corrupts financial records, or causes cross-tenant data exposure.
- P1: blocks one role from completing the main delivery flow.
- P2: workaround exists but staging pilot quality is affected.
- P3: cosmetic or documentation issue.

## Evidence Log

Record evidence references only. Do not paste sensitive data.

| Evidence ID | Test ID | Surface | Safe reference | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| T100-EV-001 |  |  | Screenshot/log reference only | Passed / Failed / Blocked |  |

Allowed evidence:

- masked screenshots with no passwords, OTP values, full phone numbers or tokens
- order reference
- deployment/build label
- timestamp
- issue ID

Not allowed in Git:

- passwords
- delivery codes/OTP values
- bearer tokens
- full phone numbers
- real payment details
- unmasked customer/vendor/Captain private information
- provider credentials or dashboard screenshots containing secrets

## Go/No-Go Criteria

### Go For Controlled Internal Pilot

- Customer can create and mock-pay a staging order.
- Vendor can accept and prepare the paid order.
- Admin can assign an eligible Delivery Captain.
- Delivery Captain can accept, progress delivery, mark delivered and complete with
  customer-supplied code.
- Customer delivery code is only revealed to the owning customer at the eligible stage.
- Admin final status sync is correct.
- Vendor settlement visibility works read-only.
- Captain App, Admin Portal and Website use the approved Captain/Ride wording.
- No P0/P1 issues remain open.
- No live providers, payouts, withdrawals, live rides or Pharmacy marketplace are activated.

### Conditional Go

- Only P2/P3 issues remain.
- Workarounds are documented.
- Management and operations owners accept the risk in writing.

### No-Go / Hold

- Any delivery code/OTP exposure outside the owning customer flow.
- Delivery Captain cannot complete delivery with valid customer code.
- Admin cannot assign or monitor Delivery Captain status.
- Vendor cannot receive or prepare paid order.
- Settlement or earning records duplicate or expose unrelated data.
- Any live provider or real money movement is triggered.
- Any P0/P1 issue remains unresolved.

## Final Signoff Record

| Field | Value |
| --- | --- |
| QA date/time |  |
| Tester names |  |
| Customer app build/update |  |
| KariGO Captain app build/update |  |
| Backend deployment checked |  |
| Admin Portal deployment checked |  |
| Vendor Dashboard deployment checked |  |
| End-to-end order reference |  |
| P0 issues open | Yes / No |
| P1 issues open | Yes / No |
| Final recommendation | Go / Conditional Go / No-Go |
| Conditions or blockers |  |
| Operations owner |  |
| Technical owner |  |
| Management approver |  |

## Next Action After QA

If all required tests pass, prepare the controlled internal pilot evidence summary
and management signoff note. If any P0/P1 issue appears, pause pilot approval and
create a focused follow-up fix task with reproduction steps and evidence references.
