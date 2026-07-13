# Customer Payment Status Polish - Task 102

Date prepared: 2026-07-13

## Summary

The Customer App now presents clearer payment guidance for mock payments and controlled
Paystack Test Mode checkout. The app opens only backend-returned HTTPS authorization URLs,
requires the customer to return and tap `Verify payment status`, and leaves final payment
state changes to backend verification.

## Customer-Facing Behaviour

- `Awaiting payment`: shown for unpaid orders before vendor and dispatch processing.
- `Paystack Test Mode authorization`: shown after the app opens the external Paystack
  Test Mode checkout page.
- `Payment successful`: shown only after backend verification updates the order.
- `Payment failed`: shown when payment is not complete or cannot be verified.
- `Refund under review`: describes admin-reviewed refund handling without promising
  provider-side refund timing.
- `Wallet and refunds`: states that wallet refunds, wallet-to-utility payments and wallet
  automation are future workflows.

## Safety Rules Preserved

- The frontend does not receive or store Paystack secret keys.
- The frontend does not trust callback/query-string payment status.
- The frontend does not mark orders paid by itself.
- Mock payment remains usable for staging fallback.
- Live Paystack remains disabled.
- Wallet funding, automatic refunds, withdrawals and payout automation remain disabled.

## Integration Separation

Paystack Test Mode, Accelerate utility services, and Termii SMS are integration-ready
concepts only. Live payment collection, live utility fulfilment, wallet refund automation,
SMS sending and payout automation remain disabled until separately approved.

- Paystack is for customer checkout/payment collection.
- Accelerate.ng is reserved for future utility payment services.
- Termii is reserved for future SMS/notification services.

Future task placeholders:

- Future Task: Accelerate.ng Utility Payment Integration
- Future Task: Termii SMS/OTP Notification Integration
- Future Task: Wallet-to-Utility Payment Flow
- Future Task: Wallet Refund and Paystack Reconciliation Flow

## Deployment Note

No Customer App secrets are required for this polish. Any Paystack Test Mode credentials
must stay in the staging backend secret manager. If the Customer App is already installed,
publish a Customer App EAS Update or create a fresh internal APK depending on the current
release process.
