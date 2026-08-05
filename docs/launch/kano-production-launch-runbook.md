# Kano Production Launch Runbook

## Before opening Operations-only activity

- Duty Operations lead, Dispatch lead, Support lead, Finance reviewer and Engineering on-call are named for the launch window.
- Backend health, migration status, Admin access and configuration history are verified.
- Minimum Ride/Delivery Captain and Partner thresholds are entered in Admin, not hardcoded.
- Captain GPS freshness, exclusive work lock and assignment handoff have passed.
- Active catalogues are reviewed by category and unavailable items are removed from public view.
- Support channel and SEV escalation contacts are tested.

## Stage sequence

1. Keep every Kano service `OFF` after deployment.
2. Set operating hours, zones, capacity and customer copy while still `OFF`.
3. Move one service to `OPERATIONS_ONLY` with a reason and controlled account cohort.
4. Run the relevant drill and reconcile records.
5. Record readiness evidence and an Operations decision.
6. Move to `INVITE_ONLY` only after the drill passes and no blocking SEV1/SEV2 exists.
7. Review assignment, completion, cancellation, payment and support metrics daily.
8. Move to `LIMITED_PUBLIC` only after the invite cohort acceptance window.

## Shift checks

- Opening: API health, online supply, stale locations, active Partners, open/unassigned demand, incidents and support backlog.
- Every 30 minutes: capacity headroom, oldest unassigned request and assignment failures.
- Closing: no stranded active work, settlement exceptions recorded, report exported, next-day hours confirmed.

## Pause

Open an incident, select the affected Kano service, choose “Pause affected service”, enter the operational reason and confirm twice. Notify Customers/Captains/Partners using approved production copy. Never cancel active assignments automatically. Resume only through a separate audited configuration change.
