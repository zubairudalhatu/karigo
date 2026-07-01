# Rider App API Integration

The Expo rider app uses `EXPO_PUBLIC_API_BASE_URL` and the shared KariGO API client. JWTs are stored with Expo SecureStore, expired sessions are cleared automatically, and the app rejects authenticated non-rider accounts.

## Integrated flows

- Auth: `POST /auth/login`, `GET /auth/me`
- Rider profile and manual location: `GET/PATCH /riders/me`, `PATCH /rider/location`
- Availability: `PATCH /rider/availability`
- Assigned jobs: list, detail, accept, reject, milestone status updates, and OTP completion under `/rider/jobs`
- Earnings: `GET /rider/earnings`
- Activity feed: notification list, unread count, mark read, and mark all read
- External maps: pickup and delivery addresses open using a Google Maps search link

The UI only presents the next valid delivery action. The backend remains the source of truth for access control and transitions:

`RIDER_ASSIGNED -> RIDER_ARRIVING_PICKUP -> PICKED_UP -> ON_THE_WAY -> ARRIVED_DESTINATION -> DELIVERED -> COMPLETED`

## Support limitation

Current support ticket endpoints are restricted to the `CUSTOMER` role. Rider support is intentionally not connected until the backend supports rider-owned tickets without changing the customer support workflow.

## Run and verify

```bash
npm install
npm run dev:rider
npm run typecheck --workspace @karigo/rider-app
```

Set `EXPO_PUBLIC_API_BASE_URL` in `apps/rider-app/.env` when testing on a physical device; `localhost` must be replaced with the development machine's LAN address.

## Known TODOs

- Connect approved live GPS/background location tracking.
- Add a rider-specific support ticket backend flow.
- Replace external map links with embedded navigation when required.
- Add push notifications after a real provider is selected.
