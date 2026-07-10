# Customer App Role Test Checklist

Use this checklist with the Demo Customer account from `docs/deployment/karigo-staging-demo-accounts.md`.

| Area | Steps | Expected result | Failure signs | Tester notes |
|---|---|---|---|---|
| Launch and splash | Install/open Customer staging APK. | KariGO branding loads without route-name leakage. | Blank screen, technical route text, crash. | Confirm APK/build version. |
| Login | Sign in with demo customer phone and approved staging password. | Customer lands on Home and session persists after app restart. | Invalid credentials, session expired loop, wrong role rejection. | Verify API URL points to Render staging API. |
| Profile | Open Profile. | Customer name, links to addresses/support/utility history appear. | Missing user, broken navigation. | Logout remains available. |
| Saved addresses | Open Addresses, view default Home address, add/edit if needed. | Address list loads and default address can be selected. | Empty list after seed, validation errors, stale address in checkout. | Do not use real address data. |
| Home service grid | Review Food, Groceries, Market Items, Parcel, SME Errand, Pharmacy, Taxi and Bills tiles. | Active services navigate correctly; readiness/test services are clearly labelled. | Taxi public booking visible with flags off; Pharmacy live without approval. | Confirm no dense text menu returns. |
| Food Delivery | Open Food catalogue, vendor list, Kano Kitchen and product detail. | Food vendors/products load; add-to-cart works. | No vendors, product API error, wrong category results. | Test Jollof Rice or Chicken Suya. |
| Groceries | Open Groceries catalogue and vendor/products. | Grocery vendor/products load separately from food. | Food products shown under grocery. | Use Kano Fresh Mart. |
| Market Items | Open Market Items catalogue. | Market vendor/products load. | Wrong category or empty unexpected state. | Use Kano Everyday Market. |
| Cart feedback | Add item, update quantity, remove item. | Snackbar/feedback appears; cart count updates. | Duplicate adds, no feedback, stale total. | Verify bottom nav cart badge. |
| Checkout quote | Select address and open checkout. | Server quote shows subtotal, delivery fee, discount and payable. | Delivery fee shows zero because quote missing; create order enabled without quote. | Retry quote failure path if possible. |
| Promo code | Apply `KARIGOFIRST` before payment. | Valid promo displays one clear success message; reused/invalid promo shows specific error and resets discount. | Success and failure visible together; stale discount. | Promo is first-order only. |
| Order creation | Create vendor order. | Order is created in awaiting payment/paid flow as designed. | Order creation without quote, incorrect total. | Use mock payment only. |
| Mock payment | Complete mock payment. | Payment successful, order becomes paid, vendor sees paid order. | Payment stuck pending, frontend trusts payment without backend verification. | No real payment provider. |
| Order detail | Open created order. | Backend-created totals match checkout; timeline visible. | Totals mismatch, missing status history. | Check delivery fee and payable. |
| Delivery code/OTP | Progress order through rider arrival/completion flow. | Customer can reveal delivery code only when eligible; safety copy visible. | OTP visible too early, no reveal action, code shown after completion. | Never screenshot raw OTP into docs. |
| Support tickets | Create support ticket and return to Support Centre. | New ticket appears immediately; refresh loads latest messages. | "Nothing here yet" after creation, raw errors. | Admin support should also receive ticket. |
| Notifications | Open notifications, mark read where available. | Activity feed loads and read/unread state works. | Concatenated text, missing event. | No sensitive tokens or OTPs. |
| Bills and Utilities | Open Airtime/Data/Electricity/Cable TV test flows. | Test-mode warnings appear; transaction receipt/history loads. | "Pay Now" live wording, real provider claim. | No real airtime/data/token delivered. |
| Taxi waitlist | Open Taxi when flags are off. | Coming soon/readiness/waitlist flow only. | Public live booking available with flags off. | Taxi dispatch is staging-gated. |
| Taxi Test Mode | Enable flags only in approved staging test. | Request Test Taxi appears with test-mode warning and no payment. | Live ride guarantee or payment button. | Requires backend flags too. |
| Pharmacy readiness | Open Pharmacy tile with flag off. | Readiness page appears. | Live pharmacy marketplace without approval. | Compliance-gated. |
| Parcel and SME Errand | Create parcel/errand request as test. | Safe parcel flow works with mock payment where applicable. | Missing pickup/dropoff validation. | Do not use real recipient data. |
| Bottom navigation | Use Home, Browse, Cart, Orders, Profile. | Navigation stays stable and hides on auth screens. | Header duplication, wrong tab active. | Confirm Android safe area. |
| Logout/session | Logout and reopen. | User returns to login; stale token cleared. | User remains authenticated or session expired loop. | Retest login after logout. |
