# Task 209A Production Launch Readiness

## Launch boundary

KariGO production launch is controlled independently for Kano and Abuja and independently for Rides, Food, Groceries, Marketplace, Parcel Delivery and SME Services. This implementation does not activate either city. A missing or invalid database configuration resolves to `OFF`.

Launch order:

1. Operations readiness
2. Captain activation
3. Partner activation
4. Controlled production transaction drills
5. Invite-only Customer rollout
6. Limited public rollout
7. City-wide rollout after recorded approval

## Source of truth

`LaunchMarketConfig` is the server-enforced source of truth. Mobile environment flags remain emergency feature/kill switches and are not the daily operations control. Public clients consume `GET /api/v1/launch/availability`; authenticated apps consume `/availability/me`. Public responses contain no cohort names, user identities or supply counts.

Stages are `OFF`, `OPERATIONS_ONLY`, `INVITE_ONLY`, `LIMITED_PUBLIC`, `CITY_WIDE` and `PAUSED`. Existing records remain accessible in every stage. Only new activity is rejected by launch gates.

## Deployment order

1. Back up production PostgreSQL and record the migration baseline.
2. Deploy migration `20260805110000_task209a_launch_operations_control` with `prisma migrate deploy`.
3. Deploy the backend and verify `/api/v1/health`.
4. Sign in as an authorised Admin and open `/production-launch`.
5. Confirm all 12 city/service combinations initially show `OFF` and disabled.
6. Deploy the Admin Portal and Partner Workspace.
7. Do not publish mobile OTA updates until backend/Admin acceptance is signed.
8. Run operations drills in `OPERATIONS_ONLY` using approved accounts only.

## Emergency controls

- `LAUNCH_GLOBAL_KILL_SWITCH=true` is the global emergency stop for new activity. Default is `false`.
- Use Admin `PAUSED` for a city/service incident. Record an incident first when practical.
- A pause does not cancel active work and resolving an incident never resumes a service automatically.
- `CITY_WIDE` and `PAUSED` require reason, confirmation and second confirmation.

## Capacity policy

Each city/service can configure minimum online Captain/Partner supply, maximum concurrent activity, maximum unassigned activity, assignment timeout and Captain location freshness. A denial returns: “KariGO is currently at capacity in your area. Please try again shortly.” Internal supply counts are never returned to Customers.

## Go/no-go ownership

Operations owns the stage decision. Readiness scores are evidence, not automatic promotion. Finance owns payment/reconciliation signoff. Support owns duty coverage. Safety owns SEV1/SEV2 clearance. Engineering owns health, migration, errors and rollback evidence.

## Current safe recommendation

- Kano: remain `OFF` until the migration, Admin control, named duty roster and supply counts are verified; then move only selected services to `OPERATIONS_ONLY`.
- Abuja: remain `OFF` until its separate supply roster and drills are complete; then move only selected services to `OPERATIONS_ONLY`.
- Do not use `INVITE_ONLY` until city-specific end-to-end drills pass.

## Production communication templates

Replace bracketed fields with approved operational information. Do not include passwords, OTPs, access tokens, payment secrets, private document links or internal supply counts.

### Internal Operations

**Daily briefing**

> KariGO Operations briefing for [city], [date]. [service] is at [stage] from [opening time] to [closing time]. Duty leads: Operations [name/role], Support [name/role], Engineering [name/role]. Current priorities: [items]. Open incidents: [references or none]. Any stage change requires an Admin reason and confirmation.

**City go/no-go notice**

> [City] [service] decision: [GO/NO-GO] for [target stage] at [time]. Evidence reviewed: readiness [score], supply threshold [met/not met], required drills [passed/not passed], support coverage [confirmed/not confirmed], blocking incidents [references or none]. Decision owner: [Admin role].

**Service pause notice**

> [City] [service] is paused for new activity from [time] because [safe reason]. Existing active work remains manageable. Incident [reference] is assigned to [owner role]. Do not resume service until a separate audited decision is recorded.

**Incident escalation**

> Incident [reference], severity [SEV], affects [city/service]. Customer impact: [safe summary]. Current mitigation: [action]. Owner: [role]. Next update due [time]. Escalate immediately if safety, privacy, payment integrity or uncontrolled assignment risk increases.

**End-of-day report**

> [City] closeout for [date]: stages [summary], completed rides [count], completed orders [count], completed service requests [count], payment exceptions [count], open support cases [count], incidents [references or none]. Recommendation for next operating window: [continue/hold/pause] with reason [reason].

### Captains

**Activation confirmation**

> Your KariGO Captain operations access for [mode] in [city] is active. Go online only during the communicated operating window, keep location access enabled and accept only assignments shown in the Captain app.

**Operating hours / go-online request**

> KariGO [mode] operations in [city] run from [opening time] to [closing time] today. Approved Captains may go online in the Captain app from [time]. Availability does not guarantee an assignment.

**Capacity pause**

> New [mode] activity in [city] is temporarily paused. Complete any active assignment safely, then follow the status shown in the Captain app. Do not accept work outside KariGO.

**Assignment and support reminder**

> Accept, arrive, verify and complete assignments only through the Captain app. Never request a Customer password, OTP or payment secret. For safety or assignment help, contact [approved support channel] and quote the assignment reference.

### Partners

**Activation confirmation**

> Your KariGO Partner operations access for [capability] in [city] is active. Review your catalogue, availability and business hours before going online.

**Operating hours / go-online request**

> KariGO [service] operations in [city] run from [opening time] to [closing time] today. Please confirm available products or services and go online in the Partner app or Workspace from [time].

**Catalogue and order guidance**

> Keep prices, availability and preparation times current. Accept or reject each new request promptly and manage it only in the Partner app or Workspace. Never ask a Customer for a password, OTP or payment secret.

**Service pause**

> New [service] activity in [city] is temporarily paused. Existing active work remains manageable, and your catalogue and history remain available. Wait for a separate operations notice before expecting new requests.

### Customers

**Invite-only access**

> KariGO [service] is available to your account in [city] during the current operating window. Availability may vary by area and capacity. Open KariGO to check before starting a request.

**Limited availability**

> KariGO [service] is available in selected [city] areas and operating hours. Open KariGO to confirm availability for your location.

**At capacity**

> KariGO is currently at capacity in your area. Please try again shortly.

**Temporary pause**

> KariGO [service] is temporarily unavailable in [city]. Existing active requests remain visible in your account. Please check again later.

**Successful request or order**

> Your KariGO [request/order] [reference] has been received. Track its status in KariGO and contact [approved support channel] if you need help.

**Cancellation and support escalation**

> Your KariGO [request/order] [reference] was cancelled. Review the status and any payment information in KariGO. For urgent help, contact [approved support channel] and quote the reference. Never share your password, OTP or payment details.
