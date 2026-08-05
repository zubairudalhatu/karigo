# Task 209B controlled production acceptance

## Static acceptance

- [ ] Prisma format, validate, and generate pass without a Prisma upgrade.
- [ ] Additive migration is present and Task 209A migration history is unchanged.
- [ ] Backend typecheck, build, focused tests, and full tests pass.
- [ ] Admin typecheck, regression, and production build pass.
- [ ] Customer, Captain, Partner, and Partner Workspace typecheck/regression pass; Workspace build passes.
- [ ] Production-copy, legal-link, secret, private-data, and artifact-URL scans pass.
- [ ] Git diff checks pass.

## Backend acceptance

- [ ] Controlled membership, capacity, city/service mismatch, and Customer gating are tested.
- [ ] Captain/Partner safe blockers and active-work preservation are verified.
- [ ] Manual assignment, decline, expiry, pause, and lock release focused suites pass.
- [ ] Drill create/update/step/reopen and incident/support linkage are tested.

## Admin acceptance

- [ ] Groups, member activation/deactivation, Operations Customers, eligibility, and audit history render.
- [ ] Kano and Abuja remain separate and show `NOT_READY — SUPPLY_REQUIRED` without evidence.
- [ ] Monitor refresh is manual and has loading/error/empty feedback.
- [ ] Checklist blocks Operations-only until complete or validly waived.
- [ ] Drill console supports predefined steps and failure follow-up.
- [ ] Latest operational reference is not shown beneath Open incidents.

## Live owner acceptance (not performed by Codex)

Record separately per city: controlled participants, service stage, hours, drill results, failures, incident/support references, reconciliation, and final recommendation. A responsible owner must confirm every transition. Supply activation alone never marks readiness complete.

## Required owner sequence

1. Add controlled Kano Captain.
2. Add controlled Kano Partner.
3. Confirm eligibility.
4. Configure operating hours.
5. Set conservative capacity.
6. Set Kano Rides to `OPERATIONS_ONLY`.
7. Run the Ride drill.
8. Restore `OFF` if the drill fails.
9. Set one selected order/service type to `OPERATIONS_ONLY`.
10. Run the Partner/Delivery drill.
11. Restore `OFF` if it fails.
12. Record results and reconciliation.
13. Repeat independently for Abuja only when Abuja supply exists.

No live stage or account activation is part of code acceptance.
