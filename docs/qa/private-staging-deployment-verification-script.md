# Private Staging Deployment Verification Script

Record Pass/Fail/Blocked, evidence ID, tester, and issue ID for every item.

## Backend

- [ ] `GET /api/v1/health` returns healthy response
- [ ] `/api/docs` opens or is intentionally restricted by staging policy
- [ ] Database connectivity confirmed through login/list endpoints
- [ ] Customer, vendor, rider, and admin authentication work
- [ ] `/api/v1/auth/me` returns the correct user and role
- [ ] Role guards block unauthorized access
- [ ] Mock provider selection is confirmed for payment, OTP/SMS, email, WhatsApp, and push
- [ ] Safe error handling confirmed with no stack traces or secrets

## Customer

- [ ] Customer login works
- [ ] Mock OTP flow works
- [ ] Address setup works
- [ ] Vendor browsing works
- [ ] Product/cart flow works
- [ ] `KARIGOFIRST` promo validates or fails according to eligibility
- [ ] Order creation works
- [ ] Mock payment initiation and verification work
- [ ] Order tracking loads

## Vendor

- [ ] Vendor login works
- [ ] Paid order is visible to the owning vendor
- [ ] Accept order works
- [ ] Mark preparing works
- [ ] Mark ready for pickup works

## Admin

- [ ] Admin login works
- [ ] Dashboard loads
- [ ] Live orders load
- [ ] Dispatch assignment works
- [ ] Support management works
- [ ] Refund review works
- [ ] Reports load

## Rider

- [ ] Rider login works
- [ ] Online/offline status updates
- [ ] Assigned job is visible
- [ ] Delivery status updates work
- [ ] Delivery OTP completion works
- [ ] Earnings visibility works

## Current Execution Status

Status: **Blocked**.

No private staging URLs or test accounts are available in this workspace.
