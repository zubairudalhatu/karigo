# Customer Web Portal Roadmap

Task 192 adds the first KariGO Customer Web Portal foundation at:

```text
https://www.karigo.com.ng/app
```

## Phase 1 Scope

The web portal is a customer account companion to the mobile app. It supports:

- Customer login, registration and OTP verification.
- Customer profile visibility and basic profile updates.
- Saved address creation and visibility.
- Wallet balance and ledger visibility.
- Flutterwave wallet top-up initiation with backend verification only.
- Utilities provider/product selection, quote request and transaction submission through backend-controlled wallet flow.
- SME Services catalogue, request submission and request history visibility.
- Order history visibility.

The portal stores the customer session in browser session storage and clears it on logout. It does not store tokens in local storage.

## Phase 1 Guardrails

The web portal does not activate:

- Food, grocery or market cart checkout on web.
- Live ride booking.
- Public provider dispatch.
- Provider login outside approved Partner Workspace flows.
- Client-side wallet crediting.
- Wallet-to-order payment.
- Legal advice automation.
- Vehicle rental contracts.
- Medical booking.

Wallet credit remains backend-verification only. Utilities fulfilment remains controlled by explicit backend/provider flags.

## Phase 2 Candidates

Future web portal work can add:

- Food/grocery browsing and cart checkout for web.
- Order detail pages with delivery status and support links.
- Wallet top-up receipts and richer transaction filters.
- Utilities receipt pages and retry/reversal visibility.
- SME Services detail pages with customer-visible admin notes.
- Profile photo upload on web.
- Privacy/security settings on web.

## Deployment Notes

Website redeploy is required for the `/app` route and navigation/footer links.

Customer mobile app changes are not required for this portal route. A fresh Customer AAB is not required by this task.
