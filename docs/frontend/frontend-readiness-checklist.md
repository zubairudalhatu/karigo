# Frontend Readiness Checklist

## Shared Foundation

- [x] Shared brand tokens and approved logo exist.
- [x] Shared API client and response/error types exist.
- [x] Per-app API base URL examples exist.
- [ ] Expo SecureStore token adapters exist.
- [ ] Web cookie/session adapters exist.
- [ ] Route guards and auth providers exist.
- [ ] Shared loading, empty, error, and retry components exist.

## Customer App

- [x] App opens, branded welcome/splash assets exist, login placeholder exists.
- [x] Service-category home placeholder exists.
- [ ] Onboarding, signup, OTP, and working login exist.
- [ ] Authenticated navigation exists.
- [ ] Address management, vendor/product lists, cart/checkout, order tracking, support, and notifications exist.

## Rider App

- [x] App opens, branded welcome/login placeholders exist.
- [x] Dashboard and availability-toggle placeholder exist.
- [ ] Working login and authenticated navigation exist.
- [ ] Jobs list/detail, status flow, OTP completion, earnings, and notifications exist.

## Vendor Dashboard

- [x] App opens; login, sidebar/topbar dashboard shell, orders/products/settlements navigation labels exist.
- [ ] Working login and protected routes exist.
- [ ] Orders/detail/actions pages exist.
- [ ] Product management, settlements, support, and notifications pages exist.
- [ ] Vendor-owned product/settlement/support backend endpoints exist.

## Admin Portal

- [x] App opens; login and sidebar/topbar dashboard shell exist.
- [x] Navigation labels cover orders, dispatch, people, payments, settlements, support, promotions, and reports.
- [ ] Working login and protected routes exist.
- [ ] Dashboard, orders, dispatch, people, reports, support, settlements, promotions, and notifications pages exist.

## Brand Review

- [x] Primary red, charcoal/black, white, and light-grey background tokens are shared.
- [x] Logo is present in both mobile assets, both web public folders, and shared config assets.
- [x] Logo is used by mobile splash/icon placeholders, login screens, app headers, and dashboard branding.
- [ ] Replace the rectangular source logo with production-sized adaptive/mobile icon variants before release.
