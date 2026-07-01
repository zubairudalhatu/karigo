# KariGO Rider Dispatch and Delivery Workflow

## Access Control

- `/api/v1/rider/*` routes require an authenticated primary `RIDER` role and are scoped to that rider's profile and assigned orders.
- `/api/v1/admin/riders/available` and admin order assignment routes require an authenticated `ADMIN` with `SUPER_ADMIN`, `OPERATIONS_ADMIN` or `DISPATCH_OFFICER` sub-role.
- Customers and vendors cannot access rider or dispatch routes.

## Rider Availability

```http
PATCH /api/v1/rider/availability
PATCH /api/v1/rider/location
```

Only riders with active user accounts and `ACTIVE` verification status may go online. Location updates store the last known coordinates and `currentLocationUpdatedAt`; no real-time GPS integration is included.

## Admin Dispatch

```http
GET  /api/v1/admin/riders/available
POST /api/v1/admin/orders/:orderId/assign-rider
POST /api/v1/admin/orders/:orderId/reassign-rider
```

Assignment requires a `READY_FOR_PICKUP` order and an active online rider. Assignment marks the rider `BUSY`, generates a six-digit delivery OTP, moves the order to `RIDER_ASSIGNED`, and records status history. Reassignment releases the old rider and assigns an active online replacement.

## Rider Jobs

```http
GET  /api/v1/rider/jobs
GET  /api/v1/rider/jobs/:orderId
POST /api/v1/rider/jobs/:orderId/accept
POST /api/v1/rider/jobs/:orderId/reject
POST /api/v1/rider/jobs/:orderId/status
POST /api/v1/rider/jobs/:orderId/complete
GET  /api/v1/rider/earnings
```

A rejection requires `TOO_FAR`, `VEHICLE_ISSUE`, `EMERGENCY`, `UNABLE_TO_CONTACT` or `OTHER`. The order returns to `READY_FOR_PICKUP`, the rider returns online, and admin reassignment is required.

## Valid Status Flow

```text
READY_FOR_PICKUP
  -> RIDER_ASSIGNED
  -> RIDER_ARRIVING_PICKUP
  -> PICKED_UP
  -> ON_THE_WAY
  -> ARRIVED_DESTINATION
  -> DELIVERED
  -> COMPLETED
```

Every movement creates an `OrderStatusHistory` entry. Invalid jumps and updates to closed orders are rejected.

## Completion and Earnings

Completion requires a matching delivery OTP from a `DELIVERED` order. Successful completion:

- Marks the order `COMPLETED`.
- Creates a pending rider earning using the order delivery fee.
- Creates a pending vendor settlement for vendor orders.
- Returns the rider to `ONLINE`.
- Clears the stored delivery OTP.

The earnings endpoint returns total, pending and paid earnings plus completed-job records. Settlement payout processing is not implemented.

## Placeholder Events

Dispatch and delivery actions currently emit application log placeholders only. No notification infrastructure or real GPS tracking is included.
