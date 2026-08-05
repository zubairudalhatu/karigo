# Abuja Production Launch Runbook

Abuja is a separate market. Kano readiness or supply must not be used as Abuja evidence.

## Entry requirements

- Abuja duty roster and escalation contacts are named.
- At least the configured minimum approved and online supply is present during the intended hours.
- Partner catalogues and service areas are Abuja-specific.
- Map/GPS and assignment drills use Abuja pickup/destination data.
- Support and reconciliation owners can identify Abuja records.

## Controlled sequence

1. Leave all Abuja services `OFF` after migration.
2. Configure service hours, zones, customer copy and capacity while `OFF`.
3. Create only approved private cohorts; store user UUIDs, never lists in source control.
4. Advance a selected service to `OPERATIONS_ONLY` after two-person Operations review.
5. Run and record Abuja-specific Ride/order/service drills.
6. Advance to `INVITE_ONLY` only after drill, supply, support and incident gates pass.
7. Review one full operating window before considering `LIMITED_PUBLIC`.

## Stop conditions

Pause for safety events, major outage, repeated assignment failure, capacity below configured floor, uncontrolled payment exceptions or a launch-blocking SEV2. Existing work remains manageable. Resolution does not auto-resume the service.
