# KariGO Soft Launch Go/No-Go Assessment - Task 60

Date: 10 July 2026
Environment: Live staging
Related files:

- `docs/qa/results/karigo-credentialed-role-qa-report-task60.md`
- `docs/qa/results/karigo-soft-launch-fix-plan-task60.md`
- `docs/qa/karigo-staging-launch-readiness-status.md`

## Decision Summary

Current decision: No-Go for controlled soft launch.

Reason: The domain/CORS deployment blockers are resolved, but full credentialed role QA and mobile app end-to-end evidence are still incomplete.

## Go/No-Go Matrix

| Category | Status | Decision note |
|---|---|---|
| Backend health | Go | `/api/v1/health` returns healthy JSON. `/api/v1` returning `NOT_FOUND` is expected. |
| Public website | Go | Public website is reachable and readiness-gated services are clearly marked. |
| Admin branded domain | Go | `https://admin.karigo.com.ng` loads and authenticated dashboard reachability is confirmed. |
| Vendor branded domain | Go | `https://vendor.karigo.com.ng` loads and authenticated dashboard reachability is confirmed. |
| Backend CORS for branded domains | Go | Admin and Vendor branded origins are allowed. |
| Admin full role QA | Conditional | Dashboard reachability is confirmed; full checklist still needs recorded evidence. |
| Vendor full role QA | Conditional | Dashboard reachability is confirmed; full checklist still needs recorded evidence. |
| Customer App role QA | No-Go | Requires secure demo password and staging app/device execution. |
| Rider App role QA | No-Go | Requires secure demo password and staging app/device execution. |
| End-to-end order journey | No-Go | Fresh Task 60 cross-role evidence is not yet recorded. |
| Mock payment | Conditional | Must be revalidated in the next end-to-end credentialed flow. |
| Delivery OTP completion | Conditional | Must be revalidated in the next customer/rider flow without recording OTP values. |
| Support workflow | Conditional | Must be revalidated with customer and admin roles. |
| Bills & Utilities | Go for test mode only | Demo catalogue is available; live fulfilment remains intentionally inactive. |
| Taxi | Go for readiness only | Taxi remains not live. |
| Pharmacy | Go for readiness only | Pharmacy remains gated/not live. |
| Live providers | Go for mock-only staging | Live providers remain inactive by design. |

## Approved For

- Continued internal staging review.
- Management demo of public website and branded Admin/Vendor domain reachability.
- Manual QA preparation using secure credential handling.
- Follow-up fix sprint planning.

## Not Approved For

- Controlled soft launch with real users.
- Public launch.
- Live payment, SMS, email, WhatsApp or push activation.
- Live Bills & Utilities fulfilment.
- Public Taxi or Pharmacy launch.

## Required To Move From No-Go To Go

1. Securely provide demo credentials to QA without committing or logging values.
2. Complete Admin Portal full role checklist.
3. Complete Vendor Dashboard full role checklist for at least the demo food vendor.
4. Complete Customer App checklist on the current staging APK/EAS update.
5. Complete Rider App checklist on the current staging APK/EAS update.
6. Record one fresh end-to-end order lifecycle:
   - customer order;
   - mock payment;
   - vendor acceptance;
   - admin dispatch;
   - rider delivery status progression;
   - customer delivery OTP handoff;
   - completed order;
   - settlement/earning visibility;
   - support/notification evidence.
7. Record all evidence with masked references only.
8. Convert any failed product checks into separate implementation tasks.

## Final Task 60 Recommendation

Proceed with a focused soft-launch readiness sprint, not a live pilot. The next sprint should complete credentialed role QA and only then update this decision to controlled soft-launch Go if no critical or high-severity product defects remain.
