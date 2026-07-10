# KariGO Pilot Go/No-Go Checklist - Task 64

Date: 10 July 2026
Environment: Live staging

Use this checklist before starting the controlled internal pilot and again after the final pilot review. This checklist does not approve public launch.

## Pre-Pilot Go/No-Go

| Check | Status | Owner | Notes |
|---|---|---|---|
| No known P0 issue is open | Pending | Pilot lead |  |
| No known P1 issue is open | Pending | Pilot lead |  |
| Demo credentials shared securely outside Git | Pending | Staging admin |  |
| Customer App ready on `customer-staging` | Pending | Customer tester |  |
| Rider App ready on `rider-staging` | Pending | Rider tester |  |
| Admin portal loads at branded domain | Pending | Admin tester |  |
| Vendor dashboard loads at branded domain | Pending | Vendor tester |  |
| Backend health endpoint responds | Pending | Technical observer |  |
| Issue reporting workflow reviewed | Pending | Pilot lead |  |
| Evidence storage location approved | Pending | QA lead |  |

## Core Flow Go/No-Go

| Flow | Go criteria | Status | Notes |
|---|---|---|---|
| Customer order | Customer can create staged order | Pending |  |
| Mock payment | Payment completes without live provider | Pending |  |
| Vendor workflow | Vendor can accept and mark ready | Pending |  |
| Admin dispatch | Admin can assign rider | Pending |  |
| Rider delivery | Rider can complete delivery with customer-supplied code | Pending |  |
| Support | Customer ticket and admin response work | Pending |  |
| Settlements | Vendor settlement visibility works | Pending |  |
| Earnings | Rider earnings visibility works | Pending |  |

## Stop Conditions

Select `No-Go` immediately if any of these occur:

- customer payment/order status becomes inconsistent;
- delivery OTP is exposed to unauthorized roles;
- customer, vendor, rider or admin data crosses role boundaries;
- live providers or gated services appear active unexpectedly;
- backend becomes unavailable for repeated checks;
- a tester accidentally uses real private data.

## Final Decision

| Decision | Meaning | Selected? |
|---|---|---|
| Go: continue internal pilot | No P0/P1 issue and pilot can proceed | No |
| Conditional Go: continue with caution | P2/P3 issues exist but core flow works | No |
| No-Go: pause for fix sprint | P0/P1 issue or repeated operational failure | No |
| No-Go: stop pilot | Security, data integrity or major reliability concern | No |

## Approval

| Role | Name | Decision | Date | Notes |
|---|---|---|---|---|
| Pilot lead |  | Pending |  |  |
| Technical lead |  | Pending |  |  |
| Operations lead |  | Pending |  |  |
| Management reviewer |  | Pending |  |  |
