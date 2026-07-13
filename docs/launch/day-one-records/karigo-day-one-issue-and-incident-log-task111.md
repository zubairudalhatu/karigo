# KariGO Day-One Issue And Incident Log - Task 111

## Purpose

Use this log for all Day-One pilot issues, incidents, blockers and follow-up actions.
It is the source of truth for deciding whether KariGO continues, pauses or stops the
first controlled Kano pilot window.

Do not include passwords, OTPs, access tokens, API keys, full private phone numbers,
private addresses, payment secrets or screenshots containing sensitive data.

## Severity Guide

| Severity | Meaning | Required action |
| --- | --- | --- |
| P0 | Safety, security, payment integrity, data exposure or platform-wide outage | Pause affected flow immediately and escalate to management and technical lead |
| P1 | Major order, dispatch, login, payment-mode or support issue affecting pilot success | Escalate immediately and decide whether to pause new orders |
| P2 | Operational issue with workaround available | Track, assign owner and resolve during pilot window if possible |
| P3 | Minor polish, wording, training or documentation issue | Record for follow-up after Day One |

## Incident Intake

| Incident ID | Time opened | Reported by | Role affected | Severity | Category | Summary | Immediate action | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `D1-001` | `[HH:MM]` | `[Name/role]` | `Customer / Vendor / Captain / Admin / Website / Backend` | `P0/P1/P2/P3` |  |  |  |  | `Open / Watching / Resolved / Deferred` |
| `D1-002` |  |  |  |  |  |  |  |  |  |
| `D1-003` |  |  |  |  |  |  |  |  |  |

## Incident Detail Template

Use this section for P0/P1 incidents or any issue that needs a clear timeline.

### Incident `[D1-XXX]`

| Field | Record |
| --- | --- |
| Severity | `P0 / P1 / P2 / P3` |
| Category | `Safety / Security / Order / Payment mode / Dispatch / Vendor / Captain / Support / Technical / Data` |
| First reported at | `[HH:MM]` |
| Detected by | `[Name/role]` |
| Affected surfaces | `[Customer App / Vendor Dashboard / Admin Portal / KariGO Captain App / Backend / Website]` |
| Customer impact | `[None / Low / Medium / High]` |
| Data or credential exposure suspected | `Yes / No / Unknown` |
| Pilot pause required | `Yes / No / Under review` |
| Owner | `[Name]` |
| Current status | `[Open / Watching / Resolved / Deferred]` |

Timeline:

| Time | Update | Owner |
| --- | --- | --- |
| `[HH:MM]` |  |  |
| `[HH:MM]` |  |  |

Resolution:

| Item | Record |
| --- | --- |
| Root cause, if known |  |
| Mitigation applied |  |
| Verification completed | `Yes / No` |
| Follow-up task required | `Yes / No` |
| Follow-up owner |  |

## Pause/Resume Decisions

| Time | Decision | Reason | Approved by | Participant message sent | Notes |
| --- | --- | --- | --- | --- | --- |
| `[HH:MM]` | `Continue / Pause new orders / Resume / Stop Day-One pilot` |  |  | `Yes / No` |  |
|  |  |  |  |  |  |

## Follow-Up Issue Register

| Follow-up ID | Source incident | Required fix or action | Owner | Priority | Target date | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `FU-001` | `D1-XXX` |  |  | `P0/P1/P2/P3` |  | `Open / In progress / Done` |
|  |  |  |  |  |  |  |

