# Full Platform Launch Readiness Checklist

This checklist combines product, role, operations and deployment checks before controlled public launch.

## Product Surfaces

- [ ] Customer App opens, logs in and completes Food/Grocery/Market order flow.
- [ ] Rider App opens, logs in and completes delivery lifecycle.
- [ ] Vendor Dashboard opens, logs in and manages paid orders.
- [ ] Admin Portal opens, logs in and controls dispatch/support/settlements.
- [ ] Public Website loads on custom domains and fallback Vercel URL.
- [ ] Backend API health endpoint responds.
- [ ] Swagger/API docs are available or intentionally hidden.

## Role-Based QA

- [ ] Customer checklist completed.
- [ ] Rider checklist completed.
- [ ] Vendor checklist completed for Food Vendor.
- [ ] Vendor checklist completed for Grocery Vendor.
- [ ] Vendor checklist completed for Market Vendor.
- [ ] Admin checklist completed.
- [ ] Public website checklist completed.
- [ ] Backend smoke test completed.

## Readiness and Test-Mode Controls

- [ ] Taxi public booking remains disabled unless staging flags are explicitly enabled.
- [ ] Taxi Test Mode is clearly labelled and does not imply a real ride.
- [ ] Pharmacy remains readiness-gated unless approved.
- [ ] Bills and Utilities clearly say test mode.
- [ ] SME Services provider directory and manual assignment remain admin-only and do not expose live provider dispatch, payment, payout, provider login or medical booking.
- [ ] No live utility merchant API is enabled.
- [ ] No live payout/bank transfer provider is enabled.
- [ ] No live WhatsApp/push/email/SMS provider is unintentionally enabled.
- [ ] Mock providers remain active where expected.

## Security and Access Control

- [ ] No secrets or `.env` files are committed.
- [ ] Admin routes reject non-admin users.
- [ ] Vendor routes are vendor-scoped.
- [ ] Rider routes are rider-scoped.
- [ ] Customer routes are customer-scoped.
- [ ] Delivery OTP is not exposed to rider/vendor/admin lists.
- [ ] Payout account full details are restricted.
- [ ] Support internal notes are hidden from customers.
- [ ] Logs do not expose passwords, tokens or OTP values.

## Operations

- [ ] Initial vendors confirmed.
- [ ] Initial riders confirmed.
- [ ] Support officer assigned.
- [ ] Dispatch officer assigned.
- [ ] Finance officer assigned.
- [ ] Incident escalation matrix reviewed.
- [ ] Daily report template ready.
- [ ] Known issues register reviewed.
- [ ] Pilot zones approved.

## Legal and Policy

- [ ] Terms reviewed.
- [ ] Privacy Policy reviewed.
- [ ] Refund Policy reviewed.
- [ ] Vendor Agreement reviewed.
- [ ] Rider Agreement reviewed.
- [ ] Data protection review completed.
- [ ] Taxi regulatory requirements reviewed before Taxi public launch.
- [ ] Pharmacy compliance requirements reviewed before Pharmacy activation.

## Deployment

- [ ] Render backend redeployed.
- [ ] Prisma migrations deployed.
- [ ] Staging seed run safely.
- [ ] Admin Portal redeployed.
- [ ] Vendor Dashboard redeployed.
- [ ] Website redeployed.
- [ ] Customer App EAS build/update completed where needed.
- [ ] Rider App EAS build/update completed where needed.
- [ ] DNS and SSL verified.
- [ ] CORS verified.

## Decision

- [ ] Ready for internal demo.
- [ ] Ready for controlled soft launch.
- [ ] Ready for public launch after approvals.
- [ ] Not ready: blockers remain.

Decision owner:

Date:

Conditions:
