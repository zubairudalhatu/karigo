# Task 132 Governance and Vendor Operations Signoff Checklist

This checklist is used after completing the Task 132 verification record and issue
register.

## Required Inputs

| Input | Expected location/reference | Status | Notes |
| --- | --- | --- | --- |
| Main verification record | `docs/qa/results/karigo-governance-vendor-operations-verification-task132.md` | `Complete / Incomplete` |  |
| Issue register | `docs/qa/results/karigo-governance-vendor-operations-issue-register-task132.md` | `Complete / Incomplete` |  |
| Deployment evidence | External secure evidence location | `Available / Missing` |  |
| Migration evidence | External secure evidence location | `Available / Missing` |  |
| Admin Portal evidence | External secure evidence location | `Available / Missing` |  |
| Vendor Dashboard evidence | External secure evidence location | `Available / Missing` |  |

## Final Gate Checklist

| Gate | Required result | Status | Evidence reference | Signoff owner |
| --- | --- | --- | --- | --- |
| Backend deployed | Task 131 backend commit is live | `Pass / Fail / Blocked` |  |  |
| Migration applied | No pending Prisma migrations | `Pass / Fail / Blocked` |  |  |
| Admin Portal deployed | Audit, login activity and settings pages load | `Pass / Fail / Blocked` |  |  |
| Vendor Dashboard deployed | Activation, branches, team and audit pages load | `Pass / Fail / Blocked` |  |  |
| Admin audit visibility | Admin audit list works without exposing secrets | `Pass / Fail / Blocked` |  |  |
| Login activity visibility | Login activity list works without exposing passwords/tokens | `Pass / Fail / Blocked` |  |  |
| Vendor activation | One-time activation and password setup verified | `Pass / Fail / Blocked` |  |  |
| Vendor team records | Team invitation records verified | `Pass / Fail / Blocked` |  |  |
| Vendor branches | Branch create/update/list verified | `Pass / Fail / Blocked` |  |  |
| Vendor branding | Logo and cover URL fields verified | `Pass / Fail / Blocked` |  |  |
| Vendor audit logs | Vendor-scoped audit logs verified | `Pass / Fail / Blocked` |  |  |
| Application documents | Vendor/Delivery Captain document metadata visible to Admin only | `Pass / Fail / Blocked` |  |  |
| Developer settings | Read-only, no secrets, no live toggles | `Pass / Fail / Blocked` |  |  |
| Biometric readiness | Data model ready but login feature inactive | `Pass / Fail / Blocked` |  |  |
| Cross-vendor isolation | No vendor can access another vendor's operational records | `Pass / Fail / Blocked` |  |  |
| Live provider guardrails | Live payments, rides, payouts and bulk messaging remain disabled | `Pass / Fail / Blocked` |  |  |

## Go/No-Go Decision

| Decision item | Record |
| --- | --- |
| Open P0 issues | `Yes / No` |
| Open P1 issues | `Yes / No` |
| P2/P3 issues accepted for backlog | `Yes / No / N/A` |
| Governance features accepted for pilot expansion | `Go / Conditional Go / No-Go` |
| Conditions before expansion |  |
| Decision owner | `[Name]` |
| Decision date/time | `[DD Month YYYY, HH:MM]` |

## Signoff

| Role | Name | Signoff | Date/time | Notes |
| --- | --- | --- | --- | --- |
| Technical lead |  | `Approved / Not approved` |  |  |
| Operations lead |  | `Approved / Not approved` |  |  |
| Vendor operations lead |  | `Approved / Not approved` |  |  |
| Security reviewer |  | `Approved / Not approved` |  |  |
| Management reviewer |  | `Approved / Not approved` |  |  |
