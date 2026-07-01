# Push Notification Sandbox Test Script

Run only after Expo approval, adapter review, secure staging configuration, and approved
physical test devices. Never record credentials, raw device tokens, tester details, or
unredacted device/provider screenshots.

## A. Customer Device Token Registration

1. Log in on an approved customer test build/device.
2. Grant notification permission and collect the Expo token without logging it.
3. Register it with `appSurface=CUSTOMER_APP`.
4. Confirm storage is linked to the authenticated customer.
5. Confirm list output contains metadata but no raw token or device identifier.
6. Attempt another user's record access and confirm rejection.

## B. Rider Device Token Registration

1. Repeat the permission and registration flow for an authenticated rider.
2. Use `appSurface=RIDER_APP` and confirm role/surface enforcement.
3. Confirm raw token values remain absent from responses and logs.

## C. Customer Order Status Push

1. Create an order and record its safe test reference externally.
2. Accept it through the vendor workflow.
3. Confirm customer push title/body and minimal order entity payload.
4. Confirm the independently created in-app activity remains available.

## D. Rider New Job Push

1. Assign/reassign the approved rider to a test order.
2. Confirm the rider receives a short operational message and safe order entity ID.
3. Confirm opening the app does not bypass authentication/ownership.

## E. Payment Successful Push

1. Complete mock or approved sandbox payment.
2. Confirm the customer message includes no amount, card, gateway payload, or secret.

## F. Support Ticket Update Push

1. Create a synthetic support ticket and add a customer-visible admin response.
2. Confirm the push contains only safe type/entity references, not ticket message content.

## G. Permission Denied

1. Deny OS permission.
2. Confirm the app remains usable and in-app notifications remain available.
3. Confirm guidance is non-blocking and does not repeatedly prompt.

## H. Invalid Token

1. Use an approved invalid-token receipt fixture.
2. Confirm the token is deactivated or queued for controlled cleanup.
3. Confirm no core workflow fails and no raw token is logged.

## I. Provider Failure

1. Use an approved timeout/failure fixture.
2. Confirm core order/payment/support/delivery workflows still succeed.
3. Confirm sanitized observability and restore `PUSH_PROVIDER=mock`.

## Exit Criteria

- Customer and rider token ownership/role controls pass.
- Foreground/background physical-device behavior is evidenced safely.
- Invalid-token cleanup and rollback are verified.
- No delivery is claimed from mock acceptance or provider request acceptance alone.
