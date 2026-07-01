# Admin Portal API Integration

The Next.js admin portal uses `NEXT_PUBLIC_API_BASE_URL`, the shared KariGO response client, browser-local JWT storage, automatic expired-session clearing, and strict `ADMIN` role enforcement.

## Integrated workflows

- Admin login and protected portal shell
- Dashboard operational and financial metrics
- Orders list/detail, filters, internal notes, payment/refund display
- Dispatch board, rider assignment, and confirmed reassignment
- Safe user, vendor, and rider operational lists
- Vendor settlements and rider earnings with confirmed mark-paid actions
- Support ticket listing, assignment, status/priority updates, customer-visible messages, and distinct internal notes
- Promo creation, listing, and confirmed deactivation
- Operations, finance, vendor, rider, and promo reports
- Personal and platform notification feeds

The backend remains authoritative for admin sub-role access. A page may show an API-backed feature that a limited admin role cannot execute; the backend returns the final authorization decision.

## Sensitive actions

Refund approval, settlement payout marking, rider reassignment, and promo deactivation require confirmation. These actions update KariGO records only; no real gateway refund or bank transfer API is connected.

## Known TODOs

- Add admin approval/suspension/status-change endpoints for users, vendors, and riders.
- Add richer search/filter controls and pagination.
- Add dedicated payment listing endpoint if required.
- Add production-grade secure session cookies/BFF pattern before public deployment.
- Connect real financial and notification providers only after approval.

## Run

```bash
npm run dev:admin
npm run typecheck --workspace @karigo/admin-portal
npm run build --workspace @karigo/admin-portal
```

Open `http://localhost:3001`; the backend must be available at `http://localhost:4000/api/v1`.
