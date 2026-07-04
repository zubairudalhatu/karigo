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
| Cart add feedback appears | Tapping Add to cart shows a short non-blocking confirmation with `View cart` | Fixed | Product name appears where available |
| Rapid duplicate add is blocked | Add button briefly changes to `Added` and prevents accidental duplicate quantity | Fixed | Intentional second add works after the short lockout clears |
| Bottom navigation appears | Authenticated screens show Home, Browse, Cart, Orders and Profile | Fixed | Hidden on auth/onboarding routes |
| Bottom navigation cart badge updates | Badge count changes immediately after cart add/update/clear | Fixed | Uses customer cart context count |
| Home quick-link clutter removed | Addresses, Cart, Orders, Profile and Support are not shown as dense homepage text links | Fixed | Addresses/Support/Notifications moved into Profile |
| Category filtering is server-scoped | Food, Groceries and Market Items request backend category filters | Fixed | Uses `GET /products?category=...` |
| Food catalogue is accurate | Food Delivery only renders `FOOD` products | Pending | Verify with seeded Kano Kitchen data |
| Grocery catalogue is accurate | Groceries only renders `GROCERIES` products | Pending | Verify with seeded Kano Fresh Mart data |
| Market catalogue is accurate | Market Items only renders `MARKET_ITEMS` products | Pending | Verify with seeded Kano Everyday Market data |
| Category search remains scoped | Search within a category does not leak products from other categories | Pending | Test one food and one grocery search term |
| `KARIGOFIRST` validates | Promo returns expected server response | Passed | Live test applied NGN 300 discount |
| Promo revalidation is clean | Success and failure messages never display together | Fixed | Prior promo state clears before each validation |
| Reused promo message is clear | One-time usage shows a customer-friendly already-used message | Fixed | No raw "not found" fallback for usage limit |
| Checkout pricing breakdown is clear | Subtotal, delivery fee, discount and payable are displayed | Fixed | Values come from backend quote/order response |
| Checkout requires server quote | Create order is disabled until backend quote returns subtotal, fee, discount, payable and quote reference | Fixed | Prevents absent quote from displaying NGN 0 delivery fee |
| Checkout quote refresh works | Address, cart, focus and validated promo changes refresh quote | Fixed | Shows "Updating delivery total..." while refreshing |
| Checkout quote failure is safe | Quote failure blocks order creation and shows retry action | Fixed | Retry delivery total button reloads quote |
| Explicit zero-fee quote is preserved | NGN 0 delivery fee only displays when backend quote explicitly returns zero | Fixed | Missing quote shows waiting state instead of NGN 0 |
| Order creation works | Order is created through backend | Pending |  |
| Mock payment flow works | Mock initiation/verification updates order | Pending | No live gateway |
| Order tracking works | Tracking/status page loads | Passed | Paid order visible after mock payment |
| Order details pricing breakdown is clear | Subtotal, delivery fee, discount and payable are displayed | Fixed | Uses server order fields |
| Delivery code stays hidden before arrival | No OTP appears before `ARRIVED_DESTINATION` | Fixed | Customer must not see code early |
| Delivery code reveal works | Eligible order shows "Show delivery code", then grouped six-digit code | Fixed | Only visible to owning customer after tap |
| Delivery code safety copy is clear | "Only share this code after you have received your order." is visible | Fixed | Do not record OTP in QA evidence |
| Delivery code unavailable after completion | Completed orders no longer reveal the delivery OTP | Fixed | Backend clears code on completion |
| Notifications page loads | Customer notifications render | Pending |  |
| Support ticket flow works | Customer can create/view ticket | Fixed | Newly created ticket is inserted immediately and list refreshes on focus/pull |
| Route names are hidden | Route segments such as `checkout`, `support`, `tabs/` are not visible as headers | Fixed | Expo Router titles are explicitly configured |
| Native header titles are minimized | Detail flows keep only the back affordance while page content carries the title | Fixed | Visual retest required in next APK |
| Home copy is approved | Home displays `Food, groceries, parcels and errands across Kano.` | Fixed | Exact copy required for staging demo |
| Service categories are clear | Food Delivery, Groceries, Market Items, Parcel Delivery and SME Errands display as clean chips | Fixed | Red is used as a soft accent only |
| Vendor cards are content-first | Vendor name, category, city, open/closed state and favourite affordance are readable | Fixed | Closed vendors show an overlay state |
| Cart presentation is clear | Cart item totals, quantity actions and server-pricing note are readable | Fixed | No pricing behavior changed |
| Checkout receipt layout is clear | Subtotal, delivery fee, discount and payable render as a structured receipt | Fixed | Payable is visually strongest |
| Order detail receipt layout is clear | Server-created order totals match checkout and are easy to scan | Fixed | Uses backend order fields |
| Visual style is consistent | White/light-gray cards, black headings, muted support text and restrained KariGO red are used | Fixed | Applies through shared Customer UI primitives |
| API errors are safe | No raw JSON/stack traces shown | Pending |  |
| Render cold-start handled | Loading/retry behavior is understandable | Pending |  |

## Live Staging Flow Evidence

- Customer browsed Kano Kitchen, added Chicken Suya, checked out, applied `KARIGOFIRST`, completed mock payment, and saw the paid order.
- Vendor Dashboard received the paid order.
- Admin Portal reflected the order, GMV, delivery fee, and support activity.
- Defects fixed after this test: route-name leakage, missing checkout delivery-fee line, mixed promo success/error state, reused-promo copy, discount reset after failed promo validation, support list refresh after ticket creation, secure customer delivery-code reveal for Rider completion, and content-first Customer App visual polish.
- Task 51 fixes add bottom navigation, instant cart feedback, cart badge updates, server-scoped category requests and a simplified homepage with account-management items moved to Profile.

## Visual Polish Retest

- Confirm no technical route path or duplicate native title is visible on Home, Login, Vendor, Cart, Checkout, Order details, Support centre, Support ticket detail, Addresses and Profile.
- Confirm back arrows remain available on detail/flow screens and Android safe-area spacing remains comfortable.
- Confirm Home keeps the KariGO logo, approved Kano positioning copy, clean category chips and readable vendor cards.
- Confirm Cart and Checkout keep the existing server-authoritative quote behavior while using the clearer receipt-style pricing layout.
- Confirm Order details display the backend-created totals and delivery-code card without exposing OTP before the eligible statuses.

## Seeded Persona Reference

| Persona | Login phone placeholder |
| --- | --- |
| Demo customer | `<demo-customer-phone>` |
| Demo vendor | `<demo-vendor-owner-phone>` |
| Demo rider | `<demo-rider-phone>` |

Passwords must remain outside Git.
