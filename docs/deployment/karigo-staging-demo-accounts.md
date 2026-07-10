# KariGO Staging Demo Accounts

This document describes synthetic demo accounts created by `services/backend-api/prisma/seed.ts`.

Do not place real production credentials in this file. Password values must be shared through the staging secret manager, a secure password vault, or an approved internal channel only.

## Password Behavior

The seed script uses these environment variables:

- `SUPER_ADMIN_PASSWORD`: Super Admin password.
- `SEED_DEMO_PASSWORD`: Operations Admin, Vendor, Rider and Customer demo password.
- `APP_ENV=staging` plus `STAGING_RESET_DEMO_CREDENTIALS=true`: one-time reset mode for existing demo account password hashes.

If reset mode is off, rerunning the seed preserves existing password hashes. If reset mode is on in staging, only the known synthetic demo accounts are reset. Turn reset mode off immediately after the seed run.

## Demo Account Matrix

| Persona | Login surface | Login phone | Email in seed | Password source | Role | Used for |
|---|---|---:|---|---|---|---|
| Super Admin | Admin Portal | `SUPER_ADMIN_PHONE`, default `+2348000000000` | `SUPER_ADMIN_EMAIL`, default `admin@karigo.local` | `SUPER_ADMIN_PASSWORD`; falls back to `SEED_DEMO_PASSWORD` if unset | `ADMIN`, `SUPER_ADMIN` | Full management review, admin dashboard, dispatch, payouts, support, utilities and taxi admin checks |
| Operations Admin | Admin Portal | `+2348000000001` | `operations@karigo.local` | `SEED_DEMO_PASSWORD` | `ADMIN`, `OPERATIONS_ADMIN` | Day-to-day operations checks, dispatch, support and reports |
| Demo Customer | Customer App | `+2348000000201` | `customer@karigo.local` | `SEED_DEMO_PASSWORD` | `CUSTOMER` | Browse vendors/products, cart, checkout, mock payment, support, utilities test mode, Taxi waitlist |
| Demo Rider | Rider App | `+2348000000401` | `rider@karigo.local` | `SEED_DEMO_PASSWORD` | `RIDER` | Delivery jobs, status progression, delivery OTP completion, earnings, Taxi Driver Readiness |
| Demo Food Vendor | Vendor Dashboard | `+2348000000101` | `vendor@karigo.local` | `SEED_DEMO_PASSWORD` | `VENDOR` | Kano Kitchen orders, products, settlements, payout account and notifications |
| Demo Grocery Vendor | Vendor Dashboard | `+2348000000102` | `grocery-vendor@karigo.local` | `SEED_DEMO_PASSWORD` | `VENDOR` | Kano Fresh Mart grocery catalogue and vendor order testing |
| Demo Market Vendor | Vendor Dashboard | `+2348000000103` | `market-vendor@karigo.local` | `SEED_DEMO_PASSWORD` | `VENDOR` | Kano Everyday Market catalogue and market-items testing |

## Login URLs and Apps

- Admin Portal domain: `https://admin.karigo.com.ng`
- Admin Portal Vercel fallback: `https://karigo-admin-portal.vercel.app`
- Vendor Dashboard domain: `https://vendor.karigo.com.ng`
- Vendor Dashboard Vercel fallback: `https://karigo-vendor-dashboard.vercel.app`
- Customer App: internal Android APK or approved EAS update channel.
- Rider App: internal Android APK or approved EAS update channel.
- Backend API: `https://karigo-8htn.onrender.com/api/v1`

## Seeded Data Included

- Promo code `KARIGOFIRST`.
- Demo customer home address.
- Demo food, grocery and market vendors.
- Demo products for Food Delivery, Groceries and Market Items.
- Verified demo food-vendor payout account.
- Demo rider marked active and online.
- Demo Bills and Utilities catalogue.
- Demo parcel order.

## Important Limitations

- Demo accounts are synthetic and staging-only.
- Do not use demo passwords in production.
- Do not store password values in Git, screenshots or test reports.
- Existing staging accounts may keep old password hashes unless reset mode is explicitly enabled.
- Demo phone numbers are not real customer/vendor/rider phone numbers.
