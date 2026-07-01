# Frontend Integration Plan

## Current Scaffold Review

### Customer App

- Framework: Expo 53, React Native 0.79, Expo Router.
- Screens: branded welcome/splash-style landing, customer login placeholder, service-category home.
- Navigation: root Expo Router stack; no authenticated tab layout or route guard.
- Components/data: screen-local React Native components and static service labels; no API client or persistent state.
- Missing: registration, OTP, addresses, vendor/product lists, cart, checkout, payment, order history/tracking, support, notifications, loading/error/empty states.

### Rider App

- Framework: Expo 53, React Native 0.79, Expo Router.
- Screens: branded welcome, rider login placeholder, dashboard with online button and zero-value metrics.
- Navigation: root Expo Router stack; no authenticated tab layout or route guard.
- Components/data: screen-local components and placeholder metrics; no API client or persistent state.
- Missing: working login, availability state, jobs list/detail, reject/status/OTP flows, earnings, notifications, support decision.

### Vendor Dashboard

- Framework: Next.js 15 App Router, React 19.
- Pages/layout: login and single dashboard page with sidebar/topbar shell.
- Components/data: shared `StatusBadge`; static navigation and zero metrics.
- Missing: authentication/session guard, real routes, orders/detail/actions, products, settlements, support, notifications, loading/error states.

### Admin Portal

- Framework: Next.js 15 App Router, React 19.
- Pages/layout: login and single operational dashboard page with sidebar/topbar shell.
- Components/data: shared `StatusBadge`; static navigation and zero metrics.
- Missing: authentication/session guard, dashboard data, orders/dispatch, users/vendors/riders, payments, settlements, support, promotions, reports, notifications.

## Phase A: Shared Frontend Foundation

1. Use `createApiClient` from `@karigo/config`.
2. Add platform token adapters and auth/session providers.
3. Add mobile protected route groups and web middleware/server guards.
4. Use `@karigo/shared-types` contracts and standard error normalization.
5. Establish reusable loading, empty, error, retry, confirmation, and unauthorized states.
6. Add query/cache tooling only when integration begins; avoid introducing it speculatively.

## Phase B: Customer App

Integrate auth, OTP, profile, addresses, vendor/product discovery, cart/order creation, mock payment, order history/tracking, support, and notifications in that order.

## Phase C: Rider App

Integrate login/profile, availability, jobs list/detail, accept/reject, valid delivery statuses, OTP completion, earnings, and notifications.

## Phase D: Vendor Dashboard

Integrate login/session guard, vendor profile, orders/detail/actions, notifications, then product/settlement/support pages after their vendor-owned backend endpoints exist.

## Phase E: Admin Portal

Integrate login/session guard, dashboard, orders, dispatch, support, reports, settlements, promotions, people/merchant listings, refunds, and notifications.

## Foundation Decisions

- One API envelope and error type across all surfaces.
- Environment-specific base URL; do not hard-code production URLs.
- No token values in source control, logs, or URLs.
- Expo production token storage should use SecureStore.
- Web production authentication should use secure, HTTP-only cookies when the backend/session design supports it.
- Keep KariGO red, charcoal, white, and light-grey tokens from `@karigo/config`.
