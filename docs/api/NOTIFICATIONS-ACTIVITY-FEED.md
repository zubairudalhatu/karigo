# KariGO Notification Foundation and Activity Feed

Notifications provide the initial in-app activity feed for customers, vendors, riders, and admins. Records are always scoped to the authenticated user and returned newest first.

## Endpoints

```http
GET   /api/v1/notifications
GET   /api/v1/notifications/unread-count
PATCH /api/v1/notifications/:id/read
PATCH /api/v1/notifications/read-all
GET   /api/v1/admin/notifications
```

The user feed supports pagination and read/unread filtering. Admin notification review supports channel, type, user, and date filters and returns safe user summaries.

## Channels and Providers

`IN_APP` is fully implemented using PostgreSQL records. `SMS`, `EMAIL`, `WHATSAPP`, and `PUSH` use placeholder providers that log mock requests and make no external calls.

```env
NOTIFICATION_PROVIDER=mock
SMS_PROVIDER=mock
SMS_API_KEY=
SMS_SENDER_ID=KariGO
EMAIL_PROVIDER=mock
EMAIL_FROM=
WHATSAPP_PROVIDER=mock
PUSH_PROVIDER=mock
```

External mock-provider failures are logged and do not fail the calling workflow.

## Connected Activity

The notification foundation currently connects order creation, payment success/failure, refund requests/approvals, vendor fulfilment statuses, rider assignment and delivery statuses, completion/earning records, support ticket creation/assignment/status updates, and settlement/earning payouts.

Promo creation does not bulk-notify customers. Future marketing automation, real push delivery, SMS, email, and WhatsApp providers remain deferred.
