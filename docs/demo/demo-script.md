# KariGO Soft Launch Demo Script

## Preparation

From the monorepo root:

```bash
npm run db:seed
npm run dev:api
npm run dev:customer
npm run dev:rider
npm run dev:vendor
npm run dev:admin
```

Use the development-only accounts in `docs/deployment/local-runbook.md`. All seeded
accounts use the documented development password. Never use these credentials outside a
local or controlled demo environment.

## Part 1: Customer Journey

1. Open the customer app and sign in as the demo customer.
2. Show the KariGO services, active vendor, and products.
3. Add Jollof Rice or Chicken Suya to the cart.
4. Choose the seeded Home address and validate `KARIGOFIRST`.
5. Create the order and complete mock payment.
6. Open order tracking and point out the readable status timeline, payment state, and
   delivery OTP safety warning.

Talking point: order totals, discounts, and payment success remain backend-controlled.

## Part 2: Vendor Journey

1. Open the vendor dashboard and sign in as the demo vendor.
2. Show dashboard metric cards and the new paid order.
3. Open the order, review items/address/payment state, and accept it.
4. Mark the order preparing, then ready for pickup.

Talking point: invalid vendor actions are hidden by the UI and rejected by the backend.

## Part 3: Admin Dispatch Journey

1. Open the admin portal and sign in as the demo super admin.
2. Show the pilot dashboard and reports.
3. Open Dispatch, select the available demo rider, and assign the ready order.
4. Open the order detail to show its status history and rider assignment.

## Part 4: Rider Journey

1. Open the rider app and sign in as the demo rider.
2. Go online and open the assigned job.
3. Accept the job and demonstrate the pickup/delivery address links.
4. Progress through pickup, on-the-way, arrival, and delivered statuses.
5. Complete delivery with the order delivery OTP.
6. Show the completed delivery and updated earnings.

Talking point: the rider cannot skip backend-controlled transitions or complete without
the correct OTP.

## Part 5: Support And Reporting

1. From the customer app, create a support ticket linked to the completed order.
2. From the admin portal, open the ticket, add a customer-visible response and an
   internal note, then update its status.
3. Return to the customer ticket to show that internal notes remain hidden.
4. Show admin dashboard metrics, reports, vendor settlement, rider earning, and
   notification/activity feeds.

## Presenter Notes

- Keep `PAYMENT_PROVIDER=mock` and all external notification providers mocked.
- Use one clean order journey rather than creating many records during the demo.
- Explain that vendor settlement and rider payout actions are records only; no bank
  transfer occurs.
- If a network/API error occurs, use the retry/reload action and continue from the last
  persisted order state.
