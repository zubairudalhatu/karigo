# Full Staging Primary Scenario

Status legend: `Not Run`, `Passed`, `Failed`, `Blocked`.

Current status: **Blocked for true staging execution**. The steps below are ready for
rehearsal, but no deployed staging environment or approved staging accounts are evidenced
in the repository.

## A. Customer Registration And OTP

| Step | Action | Expected result | Actual result | Status |
| --- | --- | --- | --- | --- |
| A1 | Create or use a staging demo customer | Customer identity is safe test data | Pending staging account | Blocked |
| A2 | Register or log in through customer app | Request reaches `/api/v1/auth/customer/register` or `/api/v1/auth/login` | Pending staging run | Blocked |
| A3 | Trigger OTP using mock or approved sandbox provider | OTP record is created and provider path is used safely | Pending staging run | Blocked |
| A4 | Verify OTP | Customer becomes active/verified as designed | Pending staging run | Blocked |
| A5 | Load customer profile | `/auth/me` and customer profile return the correct user | Pending staging run | Blocked |

## B. Customer Ordering

| Step | Action | Expected result | Actual result | Status |
| --- | --- | --- | --- | --- |
| B1 | Add delivery address in supported Kano pilot zone | Address is saved and can be selected for checkout | Pending staging run | Blocked |
| B2 | Browse active vendor | Active vendors are visible to customer only through public vendor APIs | Pending staging run | Blocked |
| B3 | Add available products to cart | Unavailable items cannot be added | Pending staging run | Blocked |
| B4 | Apply `KARIGOFIRST` where eligible | Server returns validated discount/final amount | Pending staging run | Blocked |
| B5 | Create order | Backend calculates totals and creates order | Pending staging run | Blocked |
| B6 | Initiate mock or approved sandbox payment | Payment reference is generated server-side | Pending staging run | Blocked |
| B7 | Verify successful payment | Payment becomes `SUCCESSFUL`, order becomes `PAID` | Pending staging run | Blocked |
| B8 | Open customer tracking | Customer sees only their own order tracking | Pending staging run | Blocked |

## C. Vendor Order Processing

| Step | Action | Expected result | Actual result | Status |
| --- | --- | --- | --- | --- |
| C1 | Log in as assigned vendor | Non-vendor users are rejected | Pending staging run | Blocked |
| C2 | Confirm paid order appears | Vendor sees only own paid order | Pending staging run | Blocked |
| C3 | Accept order | Order moves to `VENDOR_ACCEPTED` | Pending staging run | Blocked |
| C4 | Mark `PREPARING` | Status history is recorded | Pending staging run | Blocked |
| C5 | Mark `READY_FOR_PICKUP` | Order becomes dispatch-ready | Pending staging run | Blocked |
| C6 | Confirm notifications | In-app notification exists; external provider only if enabled | Pending staging run | Blocked |

## D. Admin Dispatch

| Step | Action | Expected result | Actual result | Status |
| --- | --- | --- | --- | --- |
| D1 | Log in as admin | Non-admin users are blocked | Pending staging run | Blocked |
| D2 | Open dispatch view | Ready order is visible | Pending staging run | Blocked |
| D3 | Select available rider | Only available/eligible riders are selectable | Pending staging run | Blocked |
| D4 | Assign rider | Assignment is recorded and order status updates | Pending staging run | Blocked |
| D5 | Confirm notifications | Customer/rider notifications are triggered where enabled | Pending staging run | Blocked |

## E. Rider Delivery Flow

| Step | Action | Expected result | Actual result | Status |
| --- | --- | --- | --- | --- |
| E1 | Log in as assigned rider | Non-rider users are blocked | Pending staging run | Blocked |
| E2 | Go online if required | Availability updates through rider API | Pending staging run | Blocked |
| E3 | View assigned job | Rider sees only own job | Pending staging run | Blocked |
| E4 | Accept delivery job | Job acceptance is recorded | Pending staging run | Blocked |
| E5 | Update arriving at pickup | Status moves to `RIDER_ARRIVING_PICKUP` | Pending staging run | Blocked |
| E6 | Confirm pickup | Status moves to `PICKED_UP` | Pending staging run | Blocked |
| E7 | Update on the way | Status moves to `ON_THE_WAY` | Pending staging run | Blocked |
| E8 | Update arrived destination | Status moves to `ARRIVED_DESTINATION` | Pending staging run | Blocked |
| E9 | Verify delivery OTP | Invalid OTP is rejected, valid OTP completes delivery | Pending staging run | Blocked |
| E10 | Complete delivery | Order becomes `COMPLETED`; rider earning is recorded | Pending staging run | Blocked |

## F. Customer Completion

| Step | Action | Expected result | Actual result | Status |
| --- | --- | --- | --- | --- |
| F1 | Customer opens completed order | Completed order is visible in history | Pending staging run | Blocked |
| F2 | Confirm delivery history | Timeline shows payment, vendor, dispatch, rider, completion states | Pending staging run | Blocked |
| F3 | Confirm rating option if implemented | Rating is visible only if current MVP supports it | Pending staging run | Blocked |
| F4 | Confirm completion notification | Customer activity feed includes completion event | Pending staging run | Blocked |

## G. Support Workflow

| Step | Action | Expected result | Actual result | Status |
| --- | --- | --- | --- | --- |
| G1 | Create ticket linked to completed order | Ticket is linked to order and current user | Pending staging run | Blocked |
| G2 | Admin/support opens ticket | Admin sees safe ticket details and messages | Pending staging run | Blocked |
| G3 | Admin replies and resolves | Customer-visible message is shown to customer | Pending staging run | Blocked |
| G4 | Confirm internal notes hidden | Customer never sees internal notes | Pending staging run | Blocked |

## H. Refund Workflow

| Step | Action | Expected result | Actual result | Status |
| --- | --- | --- | --- | --- |
| H1 | Create controlled refund request | Refund is linked to order/payment safely | Pending staging run | Blocked |
| H2 | Admin reviews | Only authorized admin role can approve/reject | Pending staging run | Blocked |
| H3 | Approve or reject | Payment/order/refund state updates once | Pending staging run | Blocked |
| H4 | Confirm notification | Customer receives appropriate status update | Pending staging run | Blocked |
| H5 | Repeat refund event | Duplicate refund event is rejected or idempotent | Pending staging run | Blocked |

## I. Settlement And Reporting

| Step | Action | Expected result | Actual result | Status |
| --- | --- | --- | --- | --- |
| I1 | Confirm vendor settlement record | Settlement appears where applicable | Pending staging run | Blocked |
| I2 | Confirm rider earning record | Earning appears for completed delivery | Pending staging run | Blocked |
| I3 | Confirm admin reports | Order, payment, support, promo, earning data appears | Pending staging run | Blocked |
| I4 | Confirm audit/history | Status history and admin audit records are present | Pending staging run | Blocked |

## Evidence

Record evidence IDs in `docs/qa/full-staging-simulation-evidence-register.md` after the
scenario is actually executed.
