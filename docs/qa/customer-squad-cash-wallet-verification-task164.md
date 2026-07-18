# Task 164 - Customer Squad, Cash/POD and Wallet Verification

## Test Setup

- Backend: deployed with Task 164 changes.
- Customer App: updated via EAS Update or rebuilt from the same runtime.
- Payment provider: Squad by GTBank in live-approved backend config.
- Mock payment: hidden from public live checkout.
- Monnify/Paystack: not customer-selectable for launch.

## Customer App Checks

| Check | Expected result | Status |
| --- | --- | --- |
| Load checkout | Payment provider section loads without staging provider list | Pending |
| Provider selection | Only Squad by GTBank is shown in live mode | Pending |
| Start Squad payment | Hosted Squad checkout opens externally, not as an Expo Router page | Pending |
| Cancel payment | Customer returns to checkout/order payment status screen | Pending |
| Verify incomplete payment | Backend does not mark order paid | Pending |
| Verify successful payment | Order is marked paid only after backend verification/webhook success | Pending |
| Cash/POD copy | Customer sees Pay on Delivery / Cash readiness and amount warning | Pending |
| Cash/POD action | Cash payment cannot fake an electronic payment | Pending |
| Wallet copy | Wallet top-up/payment guardrails are visible | Pending |
| Wallet money movement | No client-only wallet credit/debit occurs | Pending |
| Returns/refunds link | Profile includes Returns and Refunds | Pending |

## Safe Failure Messages

Customer-facing errors should not expose provider internals or secrets. Squad failures should use a safe retry/support message and server logs should contain only safe metadata.

## Evidence Rules

- Do not store full payment URLs in Git.
- Do not store card data, provider keys, webhook secrets, OTPs, screenshots with private data, or customer credentials.
- Use masked order/payment references in QA notes.
