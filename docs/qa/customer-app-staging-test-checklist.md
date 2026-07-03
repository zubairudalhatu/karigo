# Customer App Staging Test Checklist

Use approved internal devices and staging demo accounts only. Do not record passwords,
OTPs, bearer tokens, full phone numbers, or real customer details in Git.

## Environment

- App: KariGO Customer Staging
- API: `https://karigo-8htn.onrender.com/api/v1`
- Providers: mock only

## Checklist

| Check | Expected result | Status | Notes |
| --- | --- | --- | --- |
| App installs | Internal build installs without replacing production app | Pending |  |
| Splash/logo loads | KariGO logo displays cleanly | Pending |  |
| Registration screen loads | Sign-up route is usable | Pending |  |
| Mock OTP flow works | Registration returns mock OTP flow in staging/mock mode | Pending | Do not record OTP |
| Login works | Demo customer can sign in | Pending | Use secure credential handover |
| Address creation works | Customer can add delivery address | Pending |  |
| Active vendor list loads | Vendors load from staging API | Pending |  |
| Vendor details/products load | Product list and details render | Pending |  |
| Cart works | Available products can be added/updated | Pending |  |
| `KARIGOFIRST` validates | Promo returns expected server response | Passed | Live test applied NGN 300 discount |
| Promo revalidation is clean | Success and failure messages never display together | Fixed | Prior promo state clears before each validation |
| Reused promo message is clear | One-time usage shows a customer-friendly already-used message | Fixed | No raw "not found" fallback for usage limit |
| Checkout pricing breakdown is clear | Subtotal, delivery fee, discount and payable are displayed | Fixed | Values come from backend quote/order response |
| Order creation works | Order is created through backend | Pending |  |
| Mock payment flow works | Mock initiation/verification updates order | Pending | No live gateway |
| Order tracking works | Tracking/status page loads | Passed | Paid order visible after mock payment |
| Order details pricing breakdown is clear | Subtotal, delivery fee, discount and payable are displayed | Fixed | Uses server order fields |
| Notifications page loads | Customer notifications render | Pending |  |
| Support ticket flow works | Customer can create/view ticket | Fixed | Newly created ticket is inserted immediately and list refreshes on focus/pull |
| Route names are hidden | Route segments such as `checkout`, `support`, `tabs/` are not visible as headers | Fixed | Expo Router titles are explicitly configured |
| API errors are safe | No raw JSON/stack traces shown | Pending |  |
| Render cold-start handled | Loading/retry behavior is understandable | Pending |  |

## Live Staging Flow Evidence

- Customer browsed Kano Kitchen, added Chicken Suya, checked out, applied `KARIGOFIRST`, completed mock payment, and saw the paid order.
- Vendor Dashboard received the paid order.
- Admin Portal reflected the order, GMV, delivery fee, and support activity.
- Defects fixed after this test: route-name leakage, missing checkout delivery-fee line, mixed promo success/error state, reused-promo copy, discount reset after failed promo validation, and support list refresh after ticket creation.

## Seeded Persona Reference

| Persona | Login phone placeholder |
| --- | --- |
| Demo customer | `<demo-customer-phone>` |
| Demo vendor | `<demo-vendor-owner-phone>` |
| Demo rider | `<demo-rider-phone>` |

Passwords must remain outside Git.
