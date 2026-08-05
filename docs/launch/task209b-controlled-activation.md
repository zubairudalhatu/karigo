# Task 209B controlled production activation

## Scope and safety boundary

Task 209B adds audited controls for selected KariGO Captains, Partners, and Operations Customer accounts in Kano and Abuja. It does not grant unrestricted Customer access. Code deployment does not activate an account or change a launch stage.

The highest permitted stage is `OPERATIONS_ONLY`, and an authorised owner must select it through Admin after the city/service checklist is complete or validly waived. `INVITE_ONLY`, `LIMITED_PUBLIC`, and `CITY_WIDE` remain outside this task.

## Architecture

- `ControlledSupplyGroup` defines city, service, active window, capacity, state, and internal context.
- `ControlledSupplyMember` links an existing Captain user or Partner record to a group. It never recreates those identities.
- `ControlledOperationsCustomer` links an existing Customer profile, is disabled by default, and remains excluded from campaigns.
- `LaunchOperationsChecklistItem` stores the required Operations-only evidence or a reasoned, expiring waiver.
- `LaunchDrillStep` and `LaunchDrillEvent` provide predefined step results and an audit timeline.
- Existing `LaunchDrill` records link controlled participants, operational references, incidents, and support tickets.

Authenticated availability remains the enforcement point. During `OPERATIONS_ONLY`, only enabled controlled Customers and enabled members of an active, in-window, city/service-matched group are eligible. Admin access remains available for operations. Existing active work and historical records are not removed when new demand is paused.

## Safe defaults

- Groups start as `DRAFT`.
- Members and Operations Customers start disabled.
- Checklist items start `NOT_READY`.
- Drill steps start `PENDING`.
- Readiness never becomes invite or limited-public ready automatically.
- Automatic Ride matching and automatic payouts remain disabled.

## Deployment sequence

1. Deploy the backend and apply the additive migration.
2. Verify backend health and Prisma migration status.
3. Deploy Admin and Partner Workspace.
4. Release approved JavaScript-only mobile updates only after backend/Admin acceptance; do not publish automatically.
5. An authorised owner configures controlled records through Admin.
6. An authorised owner completes the Operations-only checklist.
7. An authorised owner changes one selected service to `OPERATIONS_ONLY` and runs its drill.

No credentials, OTPs, PINs, tokens, card data, private document URLs, or tester lists belong in Git or drill notes.

## Communication templates

Captain activation:

> Your KariGO Captain access has been selected for controlled production operations in [City]. Go online only during the communicated operating window.

Partner activation:

> Your KariGO Partner account has been selected for controlled production operations in [City]. Confirm your catalogue and availability before the operating window.

Operations Customer:

> KariGO operations testing is active for your approved account in [City]. This access is limited to scheduled operational exercises.

Service pause:

> KariGO has temporarily paused new [Service] activity in [City]. Existing active work remains supported.
