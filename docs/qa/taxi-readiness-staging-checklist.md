# Taxi Readiness Staging Checklist

Use this checklist to verify Taxi readiness without activating live Taxi operations.

## Backend

- [ ] Prisma migration applied for Taxi readiness tables and enums.
- [ ] Backend starts successfully.
- [ ] Swagger shows Taxi readiness endpoints.
- [ ] `POST /api/v1/taxi/waitlist` creates a waitlist entry.
- [ ] `POST /api/v1/taxi/driver-applications` creates a driver readiness application.
- [ ] `GET /api/v1/taxi/driver-applications/status?phoneNumber=...` returns public status only.
- [ ] Invalid Nigerian phone numbers are rejected.
- [ ] Admin can list driver applications.
- [ ] Admin can review driver applications.
- [ ] Admin can list customer waitlist entries.
- [ ] Admin can update waitlist status.
- [ ] Admin review/status actions create audit logs.
- [ ] Non-admin users cannot access admin Taxi endpoints.

## Customer App

- [ ] Taxi tile opens the readiness screen.
- [ ] Taxi screen says Taxi is coming soon.
- [ ] `Join Taxi Waitlist` opens the waitlist form.
- [ ] Waitlist form validates required fields.
- [ ] Successful submission shows a customer-friendly success message.
- [ ] No ride booking, fare estimate, driver matching or taxi payment UI appears.

## Rider App

- [ ] Dashboard shows Taxi Driver Readiness card.
- [ ] Taxi readiness screen says Taxi is not live yet.
- [ ] Driver application form submits successfully.
- [ ] Application status displays where available.
- [ ] No Taxi Mode toggle appears.
- [ ] No taxi jobs or taxi earnings appear.

## Admin Portal

- [ ] Sidebar shows Taxi.
- [ ] Taxi page shows Driver Applications.
- [ ] Taxi page shows Customer Waitlist.
- [ ] Admin can filter by status.
- [ ] Admin can review a driver application.
- [ ] Admin can update a waitlist entry status.
- [ ] Page does not show taxi dispatch, ride assignment, fare, map or live driver controls.

## Public Website

- [ ] Taxi service card remains marked Coming soon.
- [ ] Website shows `Join Taxi Waitlist`.
- [ ] Riders page shows Taxi driver readiness application form.
- [ ] Services page lists Taxi under Preparing Launch.
- [ ] Website copy does not promise live Taxi availability.

## Security

- [ ] No secrets or credentials added.
- [ ] No payment tokens or delivery OTPs appear in Taxi responses.
- [ ] Admin notes are not exposed publicly.
- [ ] Phone numbers and driver details are treated as sensitive operational data.

## Decision

- [ ] Ready for staging readiness demo.
- [ ] Ready for management review.
- [ ] Not ready: blockers remain.
