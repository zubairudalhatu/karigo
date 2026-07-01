# Vendor Dashboard API Integration

The Next.js vendor dashboard uses `NEXT_PUBLIC_API_BASE_URL` and the shared KariGO API client. Vendor JWTs are stored in browser local storage, invalid sessions are cleared automatically, and authenticated non-vendor accounts are rejected.

## Integrated pages and endpoints

- Login and auth state: `POST /auth/login`, `GET /auth/me`
- Overview: calculated from `GET /vendor-dashboard/orders` plus notification unread count
- Orders: owned-order list, detail, filters, accept, reject, preparing, and ready-for-pickup actions
- Business profile: `GET/PATCH /vendors/me`
- Notifications: list, unread count, mark read, and mark all read

The dashboard only renders actions returned in each order's `availableActions` field. The backend remains the source of truth for vendor ownership and valid transitions:

`PAID or VENDOR_CONFIRMING -> VENDOR_ACCEPTED -> PREPARING -> READY_FOR_PICKUP`

The rejection path is `PAID or VENDOR_CONFIRMING -> VENDOR_REJECTED`.

## Current backend limitations

- Product management: only public product listing exists. Vendor create, edit, availability, and delete endpoints are required.
- Settlements: current settlement endpoints are admin-only. A vendor-specific read-only settlement endpoint is required.
- Support: current support ticket endpoints are customer-only. Vendor-owned ticket routes are required.
- Dashboard metrics: basic metrics are calculated from the current order list. A dedicated vendor metrics endpoint can replace this later.

## Run and test

```bash
npm install
npm run dev:vendor
npm run typecheck --workspace @karigo/vendor-dashboard
npm run build --workspace @karigo/vendor-dashboard
```

Open `http://localhost:3000`, log in with an approved vendor account, and test the order workflow against the backend at `http://localhost:4000/api/v1`.
