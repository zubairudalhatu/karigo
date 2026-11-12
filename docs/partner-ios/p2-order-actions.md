# Partner iOS P2: existing order actions only

P1 leaves mobile orders read-only. These are verified backend contracts, not proposed new states.

| Action | Endpoint (POST) | Allowed current states | Result |
|---|---|---|---|
| Accept | `/vendor-dashboard/orders/:orderId/accept` | PAID, VENDOR_CONFIRMING | VENDOR_ACCEPTED |
| Reject | `/vendor-dashboard/orders/:orderId/reject` | PAID, VENDOR_CONFIRMING | VENDOR_REJECTED |
| Preparing | `/vendor-dashboard/orders/:orderId/preparing` | VENDOR_ACCEPTED | PREPARING |
| Ready | `/vendor-dashboard/orders/:orderId/ready` | PREPARING | READY_FOR_PICKUP |

Read contracts: GET `/vendor-dashboard/orders` and GET `/vendor-dashboard/orders/:orderId`. Each returns server-derived `availableActions`; detail includes chronological `statusHistory`.

P2 work:
1. Render only server-provided actions for the authenticated business. Re-fetch after every action and after reconnect/resume; never infer authorization from hidden buttons.
2. Add confirmation/busy handling, prevent double taps, and handle stale status/ownership errors by refreshing. Do not blindly retry mutations after a lost response.
3. Reject uses the existing RejectVendorOrderDto reason/details. A successful payment becomes REFUND_PENDING and the response flags refundReviewRequired; do not claim that rejecting issues a refund.
4. Show existing status history/actor/note safely, role-scoped order details, empty/loading/error states and accessible controls.
5. Test ownership/approval, every permitted and forbidden transition, stale updates, cancellation received from another actor, duplicate taps, offline recovery and push navigation.

There is no Partner endpoint here for rider assignment, dispatch, delivery completion, refund execution or post-acceptance cancellation. Those remain other actors' responsibilities. Ready means READY_FOR_PICKUP, not dispatched/delivered. Do not invent a cancellation endpoint or expand the state machine in P2.

Evidence: `services/backend-api/src/modules/vendor-dashboard-orders/vendor-dashboard-orders.controller.ts`, `vendor-order-status.service.ts`, `vendor-dashboard-orders.service.ts`; mobile `apps/partner-app/app/orders` remains unchanged in P1.
