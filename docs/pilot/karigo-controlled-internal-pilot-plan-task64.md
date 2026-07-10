# KariGO Controlled Internal Pilot Plan - Task 64

Date: 10 July 2026
Environment: Live staging

This is the official pilot operations copy for Task 64. It consolidates the Task 63 controlled internal pilot plan and the Task 64 pilot operations pack.

## Pilot Decision

Recommended decision: proceed to controlled internal pilot execution with approved internal testers only.

This is not approval for public soft launch or production launch. The pilot must use staging systems, demo accounts and masked evidence only.

## Current Posture

| Area | Status |
|---|---|
| Internal staging review | Go |
| Branded Admin/Vendor domains | Go |
| Manual QA | Passed with observation |
| Controlled internal pilot | Ready to prepare |
| Controlled public soft launch | Not yet approved |
| Public production launch | Not ready |

## Pilot Goals

- Confirm the full Customer, Vendor, Admin and Rider lifecycle under realistic internal testing.
- Capture masked evidence for at least one completed order.
- Confirm support, notifications, settlements and rider earnings visibility.
- Identify remaining P2/P3 issues before inviting external users.
- Confirm operations readiness for dispatch, support, monitoring and escalation.

## Pilot Scope

| Area | Scope |
|---|---|
| Users | Internal team and approved testers only |
| Geography | Kano staging context |
| Customer App | `customer-staging` |
| Rider App | `rider-staging` |
| Vendor Dashboard | `https://vendor.karigo.com.ng` |
| Admin Portal | `https://admin.karigo.com.ng` |
| Backend | `https://karigo-8htn.onrender.com/api/v1` |
| Payments | Mock payment only |
| Notifications | Mock/staging providers only |
| Bills & Utilities | Test mode only |
| Taxi | Readiness only; no live booking |
| Pharmacy | Readiness only; no marketplace launch |

## Entry Criteria

- No known P0/P1 issue remains open.
- Demo credentials are shared only through an approved private channel.
- Customer and Rider staging apps are installed on approved devices.
- Admin and Vendor branded domains are accessible.
- Evidence rules are understood by every tester.
- Support, dispatch, admin and technical owners are available during the pilot window.

## Core Pilot Flow

1. Customer logs in and creates a staged order.
2. Customer completes mock payment.
3. Vendor receives and accepts the paid order.
4. Vendor marks preparing and ready for pickup.
5. Admin assigns rider from dispatch board.
6. Rider accepts the job and progresses delivery statuses.
7. Customer reveals delivery code only at eligible status.
8. Rider completes delivery using the customer-supplied code.
9. Admin checks order, report and support views.
10. Vendor checks settlement visibility.
11. Rider checks earnings visibility.
12. Customer creates support ticket and admin responds.

## Evidence Rules

Record:

- masked order reference;
- status labels;
- timestamps;
- masked support ticket reference;
- masked settlement or earning reference;
- pass/fail notes.

Do not record:

- passwords;
- bearer tokens;
- raw delivery OTP values;
- live provider credentials;
- real private customer, vendor or rider data.

## Exit Criteria

The internal pilot can move to controlled external soft-launch consideration only when:

- at least one full order lifecycle passes end-to-end;
- no P0/P1 issues are open;
- P2/P3 issues are logged with owners;
- support and dispatch processes are proven;
- evidence is captured without secrets;
- management accepts the pilot report.

## Decision Options

| Decision | Meaning |
|---|---|
| Go to controlled external soft launch consideration | Internal pilot passes and operations are ready. |
| Continue internal pilot | More evidence or stability is needed. |
| Pause for fix sprint | P0/P1 or repeated operational issues appear. |
| Stop pilot | Security, data integrity or major reliability concern appears. |
