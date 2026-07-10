# KariGO Internal Pilot Tester Onboarding Pack - Task 64

Date: 10 July 2026
Environment: Live staging

This onboarding pack prepares internal testers for the controlled KariGO pilot. It must not contain real passwords, bearer tokens, delivery OTP values, provider credentials or private user data.

## Pilot Posture

| Area | Status |
|---|---|
| Internal staging review | Go |
| Branded Admin/Vendor domains | Go |
| Manual QA | Passed with observation |
| Controlled internal pilot | Ready to prepare |
| Controlled public soft launch | Not yet approved |
| Public production launch | Not ready |

## Tester Roles

| Role | Responsibility | Surface |
|---|---|---|
| Customer tester | Place order, complete mock payment, track delivery, create support ticket | Customer App |
| Vendor tester | Accept order, mark preparing, mark ready, review settlement visibility | Vendor Dashboard |
| Admin/dispatch tester | Monitor dashboard, assign rider, review support, check reports | Admin Portal |
| Rider tester | Go online, accept job, progress delivery, complete with customer OTP | Rider App |
| Support observer | Track tickets, customer-safe replies and escalation notes | Admin Portal |
| Pilot lead | Coordinate timing, record decisions and approve next-day actions | Pilot tracker |

## Before Testing

- Confirm Customer App is installed or updated from the `customer-staging` channel.
- Confirm Rider App is installed or updated from the `rider-staging` channel.
- Confirm Admin Portal loads at `https://admin.karigo.com.ng`.
- Confirm Vendor Dashboard loads at `https://vendor.karigo.com.ng`.
- Confirm backend health at `https://karigo-8htn.onrender.com/api/v1/health`.
- Confirm demo credentials are provided through an approved private channel.
- Confirm no tester records passwords, tokens or OTP values.

## Tester Conduct Rules

- Use only demo/staging accounts.
- Do not invite public users.
- Do not use real customer/vendor/rider private data.
- Do not activate Taxi live booking, Pharmacy marketplace or live Bills & Utilities.
- Do not activate live payment, SMS, email, WhatsApp or push providers.
- Report issues immediately using the Task 64 issue workflow.
- Capture evidence with masked order, ticket, settlement and earning references only.

## Core Pilot Scenario

1. Customer creates an order from a seeded vendor.
2. Customer completes mock payment.
3. Vendor receives and accepts the order.
4. Vendor marks preparing and ready for pickup.
5. Admin assigns the demo rider.
6. Rider accepts the delivery job.
7. Rider progresses pickup and delivery statuses.
8. Customer reveals delivery code only after eligible status.
9. Rider completes delivery with customer-supplied code.
10. Admin, vendor and rider verify reporting, settlement and earning visibility.
11. Customer creates support ticket and admin responds.

## What To Record

- Masked order reference.
- Masked payment reference.
- Masked support ticket reference.
- Status names and timestamps.
- Pass/fail result.
- Short issue notes.
- Screenshot references stored outside Git when needed.

## What Not To Record

- Passwords.
- Bearer tokens.
- Raw delivery OTP values.
- Full real phone numbers.
- Provider dashboard secrets.
- Full private addresses or real user details.

## Tester Signoff

| Tester | Role | Ready? | Notes |
|---|---|---|---|
|  | Customer tester | Pending |  |
|  | Vendor tester | Pending |  |
|  | Admin/dispatch tester | Pending |  |
|  | Rider tester | Pending |  |
|  | Support observer | Pending |  |
|  | Pilot lead | Pending |  |
