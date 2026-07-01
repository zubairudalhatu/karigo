# End-to-End Readiness Checklist

Status legend: `[x]` verified by repository automated tests or existing docs, `[ ]`
not yet verified in true staging.

## Customer

- [ ] Registration works in deployed staging
- [ ] OTP works in deployed staging
- [ ] Login works in deployed staging
- [ ] Address management works in deployed staging
- [ ] Vendor browsing works in deployed staging
- [ ] Cart works in deployed staging
- [ ] Promo validation works in deployed staging
- [ ] Order creation works in deployed staging
- [ ] Payment flow works in deployed staging
- [ ] Tracking works in deployed staging
- [ ] Support works in deployed staging

## Vendor

- [ ] Login works in deployed staging
- [ ] New paid order appears
- [ ] Accept/reject works
- [ ] Preparation status works
- [ ] Ready-for-pickup works
- [ ] Settlement visibility works

## Rider

- [ ] Login works in deployed staging
- [ ] Online/offline works
- [ ] Assigned job appears
- [ ] Accept/reject works
- [ ] Status updates work
- [ ] Delivery OTP works
- [ ] Earnings visibility works

## Admin

- [ ] Dashboard works in deployed staging
- [ ] Live orders work
- [ ] Dispatch works
- [ ] Rider assignment works
- [ ] Support works
- [ ] Refund review works
- [ ] Promotions work
- [ ] Reports work
- [ ] Settlement views work
- [ ] Audit logs work

## Platform

- [x] Backend API health module exists
- [x] Swagger setup exists at `/api/docs`
- [x] Role guards and admin guards have automated tests
- [x] Mock payment remains available
- [x] Mock OTP/SMS remains available
- [x] Mock email remains available
- [x] Mock WhatsApp remains available
- [x] Mock push remains available
- [x] Notification service has automated coverage
- [x] Device-token ownership restrictions have automated coverage
- [x] Paystack sandbox backend path is prepared but not activated
- [x] Termii OTP path is prepared but not activated
- [x] Email, push, and WhatsApp provider paths remain mock/fail-closed
- [ ] Deployed staging health endpoint verified
- [ ] Deployed staging Swagger verified
- [ ] Full customer/vendor/admin/rider E2E verified
- [ ] Provider sandbox E2E verified where configured
- [ ] Physical customer/rider mobile-device checks completed
- [ ] No critical blocker remains

## Current Readiness Summary

The codebase is ready for a mock-provider internal rehearsal and staging deployment
preparation. It is not yet ready for real-customer controlled soft launch because true
staging E2E evidence, physical-device evidence, provider sandbox evidence, operational
sign-off, and legal/security approval are still missing.
