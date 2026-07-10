# KariGO Controlled Internal Pilot Plan - Task 63

Date: 10 July 2026
Environment: Live staging

This plan prepares KariGO for a controlled internal pilot based on the project owner's report that almost all manual QA tests have passed and the platform loads correctly.

## Pilot Decision

Recommended decision: Proceed to controlled internal pilot preparation.

This is not approval for public launch or broad controlled external soft launch. The internal pilot should use only approved internal testers and synthetic/staging data.

## Pilot Goals

- Confirm the full Customer/Vendor/Admin/Rider lifecycle under realistic use.
- Capture masked evidence for at least one complete order.
- Confirm support, notifications, settlements and rider earnings visibility.
- Identify any remaining P2/P3 issues before inviting external users.
- Confirm operations readiness for dispatch, support and incident response.

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

## Pilot Entry Criteria

- No known P0/P1 issue remains open.
- Demo credentials are shared securely with internal testers.
- Customer and Rider staging apps are installed on approved devices.
- Admin and Vendor branded domains are accessible.
- QA evidence rules are understood.
- Support/dispatch/admin owners are available during pilot window.

## Pilot Test Flow

1. Customer logs in and creates a staged order.
2. Customer completes mock payment.
3. Vendor receives and accepts the paid order.
4. Vendor marks preparing and ready for pickup.
5. Admin assigns rider from dispatch board.
6. Rider accepts job and progresses delivery statuses.
7. Customer reveals delivery OTP only at eligible status.
8. Rider completes delivery using customer-supplied OTP.
9. Admin checks order/reporting/support views.
10. Vendor checks settlement visibility.
11. Rider checks earnings visibility.
12. Customer creates support ticket and admin responds.

## Evidence Rules

Record:

- masked order reference;
- status labels;
- timestamps;
- masked support ticket reference;
- masked settlement/earning reference;
- pass/fail notes.

Do not record:

- passwords;
- bearer tokens;
- raw delivery OTPs;
- live provider credentials;
- real private customer/vendor/rider data.

## Daily Internal Pilot Report

| Field | Notes |
|---|---|
| Date |  |
| Pilot lead |  |
| Orders tested |  |
| Completed orders |  |
| Failed orders |  |
| Support tickets |  |
| P0/P1 issues |  |
| P2/P3 issues |  |
| Operational notes |  |
| Decision for next day | Continue / Pause / Fix first |

## Exit Criteria

The internal pilot can move to controlled external soft-launch consideration when:

- at least one full order lifecycle passes end-to-end;
- no P0/P1 issues are open;
- P2/P3 issues are logged with owners;
- support and dispatch process is proven;
- evidence is captured without secrets;
- management accepts the pilot report.

## Go/No-Go After Internal Pilot

| Decision | Meaning |
|---|---|
| Go to controlled external soft launch | Internal pilot passes and operations are ready. |
| Continue internal pilot | More evidence or stability is needed. |
| Pause for fix sprint | P0/P1 or repeated operational issues appear. |

## Immediate Next Actions

1. Collect the project owner's list of any remaining failed or uncertain tests.
2. Assign internal pilot roles: customer tester, vendor tester, rider tester, admin/dispatch tester, support observer.
3. Run one complete masked order lifecycle.
4. Update the Task 62 evidence template outside Git with completed evidence.
5. Create follow-up tasks for any P2/P3 issues found.
