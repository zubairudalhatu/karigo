# KariGO Soft Launch Issue Triage - Task 63

Date: 10 July 2026
Environment: Live staging

This triage document records remaining known issues and blockers after the project owner's manual QA update.

## Severity Definitions

| Severity | Definition | Launch impact |
|---|---|---|
| P0 | Security, payment, auth, data-loss or end-to-end order failure | Blocks all pilot activity |
| P1 | Core flow failure for customer, vendor, rider or admin | Blocks controlled soft launch |
| P2 | Important usability or operational issue with workaround | May allow internal pilot only |
| P3 | Minor copy, layout or documentation issue | Does not block internal pilot |

## Current Triage Summary

| Issue ID | Area | Severity | Status | Description | Action |
|---|---|---|---|---|---|
| T63-001 | Manual QA detail | P2 | Open | Owner reports almost all tests passed, but exact failed or untested items are not yet enumerated. | Collect final issue list from owner/testers before external soft launch. |
| T63-002 | Evidence completeness | P2 | Open | Masked end-to-end evidence references are not yet recorded in Git-safe QA docs. | Store completed evidence outside Git and update summary with masked references only. |
| T63-003 | Internal pilot monitoring | P2 | Open | A structured internal pilot monitoring process is required before inviting broader users. | Use the Task 63 internal pilot plan and daily report process. |

## Resolved Items From Prior Tasks

| Prior issue | Status |
|---|---|
| Vendor branded-domain routing | Resolved |
| Admin/Vendor branded-domain CORS | Resolved |
| Backend `/api/v1` health confusion | Resolved in docs: use `/api/v1/health`; `/api/v1` `NOT_FOUND` is expected |

## No Reported P0/P1 Issues

As of this Task 63 update, the project owner has not reported any P0 or P1 issue. This means KariGO can move to a controlled internal pilot preparation state, not a broad public soft launch.

## Required Before External Soft Launch

- Close or accept all P2 issues.
- Confirm no P0/P1 issues exist after internal pilot.
- Complete masked evidence summary for one full order lifecycle.
- Confirm operations team is ready for support, dispatch and incident response.
- Confirm legal/policy readiness remains acceptable.
- Confirm live providers remain disabled until separately approved.

## Follow-Up Task Candidates

| Task candidate | Purpose |
|---|---|
| Task 64: Internal Pilot Execution and Daily Monitoring | Run a controlled internal pilot with daily issue logs and masked order evidence. |
| Task 65: P2/P3 Polish Sprint | Fix any non-blocking usability or documentation issues found during internal pilot. |
| Task 66: Controlled External Soft Launch Decision | Decide whether to invite limited real users after internal pilot signoff. |
