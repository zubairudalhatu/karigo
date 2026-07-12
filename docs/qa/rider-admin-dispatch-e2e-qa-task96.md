# Rider App + Admin Dispatch E2E QA Pack - Task 96

Date prepared: 2026-07-12

Purpose: provide a controlled staging QA pack for testing the full KariGO delivery
operations chain once the fresh Rider staging APK is installed.

This pack is for staging QA only. It does not activate live payouts, wallet withdrawals,
live taxi booking, live payment providers, Pharmacy marketplace, provider login, or any
new production feature.

## Staging Environment

| Surface | Staging target |
| --- | --- |
| Backend API | `https://karigo-8htn.onrender.com/api/v1` |
| Backend health | `https://karigo-8htn.onrender.com/api/v1/health` |
| Admin Portal | `https://admin.karigo.com.ng` |
| Vendor Dashboard | `https://vendor.karigo.com.ng` |
| Customer App | Customer staging APK / `customer-staging` update channel |
| Rider App | Fresh Rider staging APK / `rider-staging` profile |
| Provider mode | Mock providers only unless explicitly approved for sandbox testing |

## Source Documents

- `docs/qa/rider-app-staging-test-checklist.md`
- `docs/qa/rider-app-staging-refresh-audit-task95.md`
- `docs/qa/admin-portal-role-test-checklist.md`
- `docs/qa/backend-api-smoke-test-checklist.md`
- `docs/qa/full-platform-launch-readiness-checklist.md`
- `docs/deployment/rider-app-staging-build-guide.md`
- `docs/deployment/karigo-staging-demo-accounts.md`

Do not copy passwords, OTPs, bearer tokens, full phone numbers, private device identifiers
or screenshots containing sensitive details into this repository.

## QA Roles Required

| Role | Surface | Responsibility |
| --- | --- | --- |
| Customer tester | Customer App | Create order, pay with mock payment, reveal delivery OTP only when eligible |
| Vendor tester | Vendor Dashboard | Accept paid order, move to preparing and ready for pickup |
| Admin/dispatch tester | Admin Portal | Review live order, assign rider, monitor status sync |
| Rider tester | Rider App | Go online, accept job, progress delivery and complete with customer OTP |
| QA observer | All | Record evidence, issue IDs, timestamps and go/no-go status |

Credentials must come from the secure staging handover only.

## Preflight Checklist

| Check | Expected result | Status | Notes |
| --- | --- | --- | --- |
| Backend health | `/health` responds successfully | Pending | Render may cold-start |
| Rider APK installed | Fresh internal Rider APK opens as KariGO Rider Staging | Pending | Use `rider-staging` build |
| Customer app ready | Customer staging app opens and can browse/order | Pending | Use approved staging build/update |
| Admin portal ready | Admin can log in on branded domain | Pending | `https://admin.karigo.com.ng` |
| Vendor dashboard ready | Vendor can log in on branded domain | Pending | `https://vendor.karigo.com.ng` |
| Demo customer credential available | Secure handover confirms credential | Pending | Do not record password |
| Demo vendor credential available | Secure handover confirms credential | Pending | Do not record password |
| Demo rider credential available | Secure handover confirms credential | Pending | Do not record password |
| Demo admin credential available | Secure handover confirms credential | Pending | Do not record password |
| Mock providers active | Payment/OTP/notification providers remain mock or staging-safe | Pending | No live provider activation |
| Test order baseline | Vendor has active products and delivery address exists | Pending | Use staging-safe data |

## End-to-End Test Script

### T96-001 - Customer Creates A Paid Order

1. Open the Customer App.
2. Log in with the secure demo customer account.
3. Browse a Food/Grocery/Market vendor.
4. Add a product to cart.
5. Open checkout.
6. Confirm server-authoritative pricing:
   - cart subtotal
   - delivery fee
   - discount
   - payable total
7. Create the order.
8. Complete mock payment.
9. Confirm order moves to paid status in the Customer App.

Expected result:

- Order is created using backend quote values.
- Mock payment marks payment successful.
- Order appears as paid and ready for vendor/admin workflow.
- No live payment provider is called.

Evidence to record:

| Field | Value |
| --- | --- |
| Order reference |  |
| Payment provider mode | Mock |
| Customer app result | Passed / Failed / Blocked |
| Notes |  |

### T96-002 - Vendor Receives And Prepares Order

1. Open Vendor Dashboard.
2. Log in with the secure demo vendor account.
3. Open paid/new orders.
4. Confirm the customer order appears.
5. Accept the order.
6. Mark preparing.
7. Mark ready for pickup.

Expected result:

- Vendor sees only its own order.
- Vendor cannot access delivery OTP.
- Order reaches a dispatch-ready state for Admin.
- No settlement/payment/payout action is triggered by the vendor.

Evidence to record:

| Field | Value |
| --- | --- |
| Vendor order visible | Yes / No |
| Final vendor status |  |
| Vendor dashboard result | Passed / Failed / Blocked |
| Notes |  |

### T96-003 - Admin Dispatch Assigns Rider

1. Open Admin Portal.
2. Log in with the secure Super Admin or Operations/Admin account.
3. Open live orders or dispatch board.
4. Locate the test order.
5. Confirm order is ready for rider assignment.
6. Confirm an active/available demo rider is visible.
7. Assign the rider.
8. Confirm admin UI shows the assigned rider and `RIDER_ASSIGNED` state.

Expected result:

- Admin can assign only eligible active riders.
- Assignment creates/keeps delivery OTP server-side.
- Rider receives the assigned job in Rider App.
- Admin cannot expose the delivery OTP in lists/details.

Evidence to record:

| Field | Value |
| --- | --- |
| Assigned rider persona | Demo Rider |
| Admin status after assignment |  |
| Dispatch result | Passed / Failed / Blocked |
| Notes |  |

### T96-004 - Rider Accepts Job

1. Open the fresh Rider staging APK.
2. Log in with the secure demo rider account.
3. Confirm dashboard shows:
   - rider name
   - availability
   - today's assigned deliveries
   - active delivery if present
   - completed delivery count
   - support/help copy
   - staging safety note
4. Go online if allowed.
5. Open assigned jobs.
6. Open the assigned order.
7. Accept the job.

Expected result:

- Rider login/session works and is isolated from other apps.
- Password visibility toggle works without exposing password in evidence.
- Rider accepts the assigned job.
- Order status becomes `RIDER_ARRIVING_PICKUP`.
- Rider does not see or retrieve delivery OTP.

Evidence to record:

| Field | Value |
| --- | --- |
| Rider APK build/update identifier |  |
| Rider dashboard loads | Yes / No |
| Status after accept |  |
| Rider accept result | Passed / Failed / Blocked |
| Notes |  |

### T96-005 - Rider Pickup And Delivery Progression

1. From Rider job detail, confirm pickup and delivery cards render.
2. Open pickup in maps, if device policy allows.
3. Confirm pickup.
4. Start delivery.
5. Open delivery in maps, if device policy allows.
6. Confirm arrival at destination.
7. Confirm OTP entry is not shown at `ARRIVED_DESTINATION`.
8. Mark delivered.
9. Confirm OTP entry appears only after `DELIVERED`.

Expected status progression:

```text
RIDER_ASSIGNED
RIDER_ARRIVING_PICKUP
PICKED_UP
ON_THE_WAY
ARRIVED_DESTINATION
DELIVERED
```

Expected result:

- Backend remains source of truth for all status transitions.
- Rider cannot skip required status steps.
- OTP entry appears only after `DELIVERED`.
- No live taxi/payment/payout feature appears.

Evidence to record:

| Field | Value |
| --- | --- |
| Pickup status result | Passed / Failed / Blocked |
| On-the-way result | Passed / Failed / Blocked |
| Arrival result | Passed / Failed / Blocked |
| Delivered result | Passed / Failed / Blocked |
| OTP hidden before delivered | Yes / No |
| Notes |  |

### T96-006 - Customer Reveals Delivery Code

1. Open Customer App order detail.
2. Confirm delivery code is hidden before eligible status.
3. When status is `ARRIVED_DESTINATION` or `DELIVERED`, tap the customer-controlled reveal action.
4. Confirm safety copy is visible:
   `Only share this code after you have received your order.`
5. Customer verbally shares the code with the rider during the test.

Expected result:

- Only the authenticated owning customer can retrieve the OTP.
- OTP is not visible in admin/vendor/rider surfaces.
- OTP is never recorded in QA docs, screenshots or chat.

Evidence to record:

| Field | Value |
| --- | --- |
| Customer owns order | Yes / No |
| Reveal action visible at eligible status | Yes / No |
| OTP not recorded | Confirmed |
| Notes |  |

### T96-007 - Rider Completes Delivery With OTP

1. Rider enters an invalid six-digit code first, if safe to test.
2. Confirm backend rejects invalid OTP and order remains active.
3. Rider enters the valid customer-supplied OTP.
4. Confirm success message.
5. Confirm Rider App routes to or can open earnings.

Expected result:

- Invalid OTP fails safely.
- Valid OTP completes delivery.
- Order moves to `COMPLETED`.
- Delivery OTP is cleared/invalidated by backend after completion.
- Rider earning is created or updated according to current backend rules.

Evidence to record:

| Field | Value |
| --- | --- |
| Invalid OTP rejected | Yes / No / Not tested |
| Valid OTP completion result | Passed / Failed / Blocked |
| Final order status |  |
| Rider earnings visible | Yes / No |
| Notes |  |

### T96-008 - Admin Status Sync And Audit Review

1. Refresh Admin Portal order detail.
2. Confirm status history shows rider assignment and delivery progression.
3. Confirm final order status is `COMPLETED`.
4. Confirm delivery OTP is not displayed.
5. Confirm rider earning and vendor settlement records are created where expected.
6. Confirm reports/metrics update within expected staging timing.

Expected result:

- Admin sees the full operational status timeline.
- Admin does not see customer delivery OTP.
- Settlement/earning records are visible for admin recordkeeping.
- No live bank transfer, payout, or withdrawal action is triggered.

Evidence to record:

| Field | Value |
| --- | --- |
| Admin final order status |  |
| Status history complete | Yes / No |
| OTP hidden from Admin | Yes / No |
| Rider earning visible | Yes / No |
| Vendor settlement visible | Yes / No |
| Notes |  |

### T96-009 - Vendor Settlement Visibility

1. Open Vendor Dashboard as the demo vendor.
2. Open Settlements.
3. Confirm the completed order appears when eligible.
4. Confirm read-only settlement data:
   - order number
   - settlement amount
   - status
   - created date
   - paid date when applicable
5. Confirm no admin mark-paid or edit controls exist for vendor.

Expected result:

- Vendor sees only its own settlement records.
- Vendor does not see rider earnings, delivery OTP, customer secrets, admin notes,
  payment tokens or unrelated settlement records.
- Settlement notifications render title, message and timestamp separately.

Evidence to record:

| Field | Value |
| --- | --- |
| Vendor settlement visible | Yes / No |
| Vendor settlement scoped correctly | Yes / No |
| Vendor controls read-only | Yes / No |
| Notes |  |

## Negative/Security Checks

| Check | Expected result | Status | Notes |
| --- | --- | --- | --- |
| Non-rider account in Rider App | Rejected with clear role/access message | Pending |  |
| Rider cannot view OTP | No OTP fetch/display surface exists | Pending |  |
| Admin cannot see OTP | Admin order/dispatch pages do not expose code | Pending |  |
| Vendor cannot see OTP | Vendor order/settlement/notification pages do not expose code | Pending |  |
| Invalid OTP | Rejected; order remains active | Pending |  |
| Duplicate completion attempt | Does not duplicate earning/settlement/history | Pending | If practical |
| Rider rejects job | Order returns to dispatch-ready state for reassignment | Pending | Controlled test only |
| Expired/stale Rider session | Redirects to login safely | Pending | No session loop |
| Mock providers | No live payment/SMS/email/WhatsApp/push/bank provider called | Pending |  |

## Issue Register Template

| Issue ID | Area | Severity | Description | Reproduction steps | Owner | Status | Launch impact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T96-ISS-001 |  | P0/P1/P2/P3 |  |  |  | Open |  |

Severity guide:

- P0: blocks order completion, exposes secrets/OTP, triggers live provider, or corrupts money records.
- P1: blocks one role from completing the main delivery flow.
- P2: workaround exists but staging pilot quality is affected.
- P3: cosmetic/documentation issue.

## Go/No-Go Criteria

### Go For Controlled Internal Pilot

- Customer can create and mock-pay a staging order.
- Vendor can accept and prepare the paid order.
- Admin can assign an eligible rider.
- Rider can accept, progress delivery, mark delivered and complete with customer OTP.
- Customer OTP is only revealed to the owning customer at the eligible stage.
- Admin status sync is correct.
- Vendor settlement visibility works read-only.
- No P0/P1 issues remain open.
- No live providers, payouts, withdrawals, live taxi booking or Pharmacy marketplace are activated.

### No-Go / Hold

- Any OTP exposure outside the owning customer detail endpoint/screen.
- Rider cannot complete delivery with valid OTP.
- Admin cannot assign rider or monitor status.
- Vendor does not receive/prepare the paid order.
- Settlement/earning records duplicate or expose unrelated financial data.
- Any live provider or real money movement is triggered.
- Any P0/P1 issue remains unresolved.

## Final Signoff Record

| Field | Value |
| --- | --- |
| QA date/time |  |
| Tester names |  |
| Customer app build/update |  |
| Rider app build/update |  |
| Backend deployment checked |  |
| Admin portal deployment checked |  |
| Vendor dashboard deployment checked |  |
| End-to-end order reference |  |
| Final result | Go / Conditional Go / No-Go |
| Conditions or blockers |  |
| Approver |  |

Reminder: keep passwords, OTP values, bearer tokens, full phone numbers, private customer
details and sensitive screenshots out of Git.
