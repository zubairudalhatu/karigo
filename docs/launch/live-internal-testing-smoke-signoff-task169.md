# Task 169 - Live Internal Testing Smoke Signoff

Date: 18 July 2026

Scope: controlled internal testing smoke verification for Kano and Abuja after Task 168 deployment and Task 169 AAB uploads.

Production publishing is not approved. Live payment mode remains controlled by backend environment configuration and backend verification.

## Environment

| Surface | Expected status |
| --- | --- |
| Backend API | Redeployed with Task 168 commit or newer |
| Website | Redeployed with Task 168 copy/form updates |
| Admin Portal | Redeployed with Task 168 activation and ride pricing visibility |
| Vendor Dashboard | Redeployed with Task 168 activation resend/session handling |
| Customer App | Fresh internal-testing AAB uploaded, versionCode `3` |
| KariGO Captain App | Fresh internal-testing AAB uploaded, versionCode `4` |
| Google Play production | Not published |

## Customer App Smoke Checklist

Run this once in Kano and once in Abuja.

| Area | Test | Kano | Abuja | Notes |
| --- | --- | --- | --- | --- |
| Account | New customer can create account with phone-first flow | Pending | Pending |  |
| OTP | New customer can verify OTP | Pending | Pending |  |
| OTP recovery | Registered but unverified customer login resends OTP | Pending | Pending |  |
| Address | Customer can create address using GPS | Pending | Pending |  |
| Address | Customer can create address manually if GPS denied | Pending | Pending |  |
| Vendor browsing | Customer can browse vendors/products | Pending | Pending |  |
| Cart | Customer can add items and view cart | Pending | Pending |  |
| Checkout | Squad payment opens externally, not as an internal app route | Pending | Pending |  |
| Checkout | Pay on Delivery appears where backend config allows it | Pending | Pending |  |
| Wallet | Top up wallet action appears when backend config enables it | Pending | Pending |  |
| Wallet | Wallet balance remains backend-authoritative | Pending | Pending |  |
| Support | Returns and Refunds pages are accessible | Pending | Pending |  |
| Profile | Privacy and Security section is accessible | Pending | Pending |  |

## Vendor Smoke Checklist

| Area | Test | Status | Notes |
| --- | --- | --- | --- |
| Website application | Vendor application starts with account contact step | Pending |  |
| Launch cities | Kano and Abuja/FCT are available and controlled | Pending |  |
| Documents | Business registration/evidence fields are visible | Pending |  |
| Admin review | Admin can review vendor application | Pending |  |
| Activation | Admin can send secure activation link without seeing raw token | Pending |  |
| Activation resend | Admin can resend activation link | Pending |  |
| Vendor self-resend | Approved inactive vendor can request a new activation link | Pending |  |
| Password setup | Vendor can set password from valid activation link | Pending |  |
| Login | Vendor can log into Vendor Dashboard | Pending |  |
| Orders | Vendor sees order visibility including Cash/POD status where applicable | Pending |  |

## Captain Smoke Checklist

| Area | Test | Status | Notes |
| --- | --- | --- | --- |
| In-app application | Captain can start application from app | Pending |  |
| Website application | Delivery Captain form is visible on website | Pending |  |
| Launch cities | Kano and Abuja/FCT are available and controlled | Pending |  |
| Documents | Driver licence image metadata field is visible | Pending |  |
| Documents | Vehicle particulars metadata field is visible | Pending |  |
| GPS | App requests foreground location permission only when needed | Pending |  |
| Online/offline | Captain can go online/offline | Pending |  |
| GPS privacy | App does not update live location while offline | Pending |  |
| Delivery | Cash/POD collection confirmation is available where applicable | Pending |  |
| Ride | Ride Captain pricing/review copy remains controlled and not live dispatch | Pending |  |
| Profile | Captain profile/security polish appears as expected | Pending |  |

## Admin Smoke Checklist

| Area | Test | Status | Notes |
| --- | --- | --- | --- |
| Payment Readiness | Admin can view provider readiness safely | Pending |  |
| Developer Settings | Admin can view mode/config status without secrets | Pending |  |
| Wallet | Admin can see wallet top-up records where implemented | Pending |  |
| Orders | Admin can monitor orders and payment/POD state | Pending |  |
| Cash reconciliation | Admin can review Cash/POD reconciliation state | Pending |  |
| Vendor applications | Admin can review and activate vendors | Pending |  |
| Captain applications | Admin can review Delivery Captain applications | Pending |  |
| Ride pricing | Admin can view ride pricing defaults | Pending |  |

## Go/No-Go

| Decision item | Status | Owner | Notes |
| --- | --- | --- | --- |
| Customer internal-testing AAB uploaded | Pending | Release operator |  |
| Captain internal-testing AAB uploaded | Pending | Release operator |  |
| Kano smoke passed | Pending | QA lead |  |
| Abuja smoke passed | Pending | QA lead |  |
| No P0/P1 blocker | Pending | Operations lead |  |
| Production publishing | Not approved | Founder/Release owner | Separate approval required. |
