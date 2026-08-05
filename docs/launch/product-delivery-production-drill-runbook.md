# Product order and delivery controlled drill runbook

## Preconditions

- The exact product/order service is `OPERATIONS_ONLY` through owner action.
- Controlled Customer, Product Seller or mixed Partner, and Delivery Captain are enabled for the same city/service.
- Product, Partner availability, Captain GPS, manual assignment, handoff verification, and reconciliation ownership are ready.

## Success path

1. Create the drill record and controlled participant links.
2. Customer creates an order; Partner receives and accepts it.
3. Partner prepares the order.
4. Admin verifies the eligible Delivery Captain and assigns manually.
5. Captain accepts, confirms pickup, and progresses the delivery.
6. Customer receives status updates.
7. Complete the required handoff/OTP flow without recording the OTP.
8. Verify completed order, Partner earning, Captain earning, payment/reconciliation record, and cross-mode lock release.
9. Mark all steps and record the safe operational reference.

## Failure cases

Exercise Partner rejection, product unavailable, allowed Customer cancellation, Captain decline, assignment expiry, payment failure, and service pause. Active orders must remain manageable after pause; new orders must be blocked. Automatic payouts and automatic Captain assignment remain disabled.
