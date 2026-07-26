# Partner App Order Detail Polish QA - Task 198

Task 198 records the first usability polish after the initial KariGO Partner APK installation and live test.

## Observed Issues

- Orders listed in the Orders tab did not open when tapped.
- Bottom navigation used first-letter placeholders instead of proper icons.
- Some order, payment, document and profile statuses showed raw enum labels.
- Closed/demo partner records needed clearer warning copy in the mobile app.

## Expected Fixed Behaviour

- Tapping an order card opens `/orders/[orderId]`.
- Order detail displays order status, payment status, customer, address, items, totals and status history.
- Order detail is read-only; preparation actions remain in Partner Workspace for now.
- Bottom navigation uses Feather icons for Home, Orders, Products, Services and Profile.
- Status/payment labels are human readable, for example `Pay on Delivery`, `Ready for pickup`, `Under review`.
- Closed/inactive partner profiles show a clear review-only warning.
- Demo/test-like partner profiles show a clear production-use warning.

## APK Smoke Checklist

- [ ] Login with an approved Partner/Vendor account.
- [ ] Confirm dashboard loads.
- [ ] Confirm dashboard latest active order button opens order detail when an active order exists.
- [ ] Open Orders tab.
- [ ] Tap an order card.
- [ ] Confirm order detail opens.
- [ ] Confirm order detail shows readable status and payment labels.
- [ ] Confirm Products tab still loads.
- [ ] Confirm Services tab still loads.
- [ ] Confirm Documents tab still loads from dashboard.
- [ ] Confirm Profile tab still loads and logout works.
- [ ] Confirm closed/demo profile warning appears for non-live partner records.

## Guardrails

- No product/service create/edit workflow was activated.
- No document upload from mobile was activated.
- No payout automation was activated.
- No backend, Admin Portal, Customer App, Captain App, Vendor Dashboard or Website change is required for this polish.
- No APK/AAB artifact URL, keystore, credentials or environment values should be committed.
