# Taxi Readiness API

Base path: `/api/v1`

These endpoints are readiness-only. They do not create taxi rides, calculate fares, assign drivers, collect taxi payments or activate live taxi dispatch.

## Public Endpoints

### POST `/taxi/waitlist`

Creates a customer Taxi waitlist entry.

Required fields:

- `fullName`
- `phoneNumber`
- `city`
- `state`

Optional fields:

- `email`
- `pickupArea`
- `note`

Response includes:

- `id`
- `fullName`
- `phoneNumber`
- `city`
- `state`
- `pickupArea`
- `status`
- `message`
- `createdAt`

### POST `/taxi/driver-applications`

Creates a Taxi driver readiness application.

Required fields:

- `fullName`
- `phoneNumber`
- `city`
- `state`

Optional fields:

- `email`
- `address`
- `driverLicenceNumber`
- `driverLicenceExpiry`
- `vehicleMake`
- `vehicleModel`
- `vehicleYear`
- `vehicleColour`
- `vehiclePlateNumber`
- `vehicleType`
- `vehicleOwnership`
- `notes`

Response includes public status only:

- `applicationReference`
- `fullName`
- `phoneNumber`
- `status`
- `applicantVisibleNote`
- `message`
- `submittedAt`
- `reviewedAt`
- `readinessOnly`

### GET `/taxi/driver-applications/status?phoneNumber=...`

Returns the latest driver readiness application status for the supplied phone number.

Security notes:

- The phone number is normalized to Nigerian international format where valid.
- This is a lightweight readiness lookup, not an authenticated account portal.
- It does not expose admin notes.

## Admin Endpoints

Admin endpoints require JWT auth, `ADMIN` user role and permitted admin roles.

### GET `/admin/taxi/driver-applications`

Lists Taxi driver readiness applications.

Optional query:

- `status`
- `search`

### GET `/admin/taxi/driver-applications/:applicationId`

Returns one driver readiness application detail.

Does not activate taxi dispatch.

### PATCH `/admin/taxi/driver-applications/:applicationId/review`

Updates review status.

Body:

- `status`
- `applicantVisibleNote` optional
- `adminNote` optional

Audit action:

- `admin.taxi.driver_application_review`

### GET `/admin/taxi/waitlist`

Lists customer Taxi waitlist entries.

Optional query:

- `status`
- `search`

### GET `/admin/taxi/waitlist/:entryId`

Returns one waitlist entry.

### PATCH `/admin/taxi/waitlist/:entryId/status`

Updates waitlist follow-up status.

Body:

- `status`
- `note` optional

Audit action:

- `admin.taxi.waitlist_status_update`

## Status Values

Driver application statuses:

- `SUBMITTED`
- `UNDER_REVIEW`
- `CHANGES_REQUESTED`
- `PROVISIONALLY_APPROVED`
- `APPROVED`
- `REJECTED`

Waitlist statuses:

- `SUBMITTED`
- `CONTACTED`
- `INTERESTED`
- `NOT_INTERESTED`
- `CONVERTED`

## Data Protection Notes

- Do not store real credentials or provider secrets in Taxi readiness records.
- Do not expose admin notes publicly.
- Do not include payment tokens, delivery OTPs, private support notes or unrelated customer data in Taxi readiness responses.
- Treat phone numbers and vehicle/licence details as sensitive operational data.
