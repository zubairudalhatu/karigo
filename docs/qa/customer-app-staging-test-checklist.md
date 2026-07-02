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
| `KARIGOFIRST` validates | Promo returns expected server response | Pending |  |
| Order creation works | Order is created through backend | Pending |  |
| Mock payment flow works | Mock initiation/verification updates order | Pending | No live gateway |
| Order tracking works | Tracking/status page loads | Pending |  |
| Notifications page loads | Customer notifications render | Pending |  |
| Support ticket flow works | Customer can create/view ticket | Pending |  |
| API errors are safe | No raw JSON/stack traces shown | Pending |  |
| Render cold-start handled | Loading/retry behavior is understandable | Pending |  |

## Seeded Persona Reference

| Persona | Login phone placeholder |
| --- | --- |
| Demo customer | `<demo-customer-phone>` |
| Demo vendor | `<demo-vendor-owner-phone>` |
| Demo rider | `<demo-rider-phone>` |

Passwords must remain outside Git.
