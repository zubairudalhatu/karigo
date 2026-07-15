# Task 132 Governance and Vendor Operations Issue Register

Use this register for issues found while verifying Task 131 after deployment.

Do not paste activation links, passwords, OTPs, API keys, full phone numbers, full email
addresses, uploaded documents, screenshots containing private records or private staging
evidence into this file.

## Severity Guide

| Severity | Meaning | Launch impact |
| --- | --- | --- |
| `P0` | Security, data isolation or account access failure | Stop pilot expansion |
| `P1` | Core admin/vendor governance flow blocked | Fix before expansion |
| `P2` | Important workflow issue with workaround | May proceed conditionally |
| `P3` | Cosmetic, copy or minor usability issue | Backlog unless repeated |

## Issue Register

| Issue ID | Severity | Area | Description | Reproduction summary | Evidence reference | Owner | Status | Required before expansion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GOV132-ISS-001` | `P0/P1/P2/P3` | `Admin / Vendor / Backend / Migration / Security` |  |  | `[External evidence ref]` |  | `Open / Resolved / Deferred / Accepted risk` | `Yes / No` |
| `GOV132-ISS-002` |  |  |  |  |  |  |  |  |
| `GOV132-ISS-003` |  |  |  |  |  |  |  |  |
| `GOV132-ISS-004` |  |  |  |  |  |  |  |  |
| `GOV132-ISS-005` |  |  |  |  |  |  |  |  |

## Security And Data Isolation Watchlist

Record any of the following immediately as `P0` or `P1`:

- Vendor can see another vendor's team, branch, branding or audit data.
- Vendor can activate or reset another vendor account.
- Admin/vendor audit logs reveal passwords, activation tokens, OTPs, provider secrets,
  private document values or full personal data.
- Developer settings page exposes secret values instead of safe mode/configuration status.
- Activation link can be reused after successful password setup.
- Expired or revoked activation link still works.
- Document metadata appears on a public or customer-facing surface.
- Any live provider mode is enabled unexpectedly.

## Fix Triage

| Issue ID | Recommended fix task | Fix owner | Target date | Retest owner | Retest status |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  | `Pending / Passed / Failed / Blocked` |
|  |  |  |  |  |  |

## Closeout Summary

| Item | Record |
| --- | --- |
| Total issues logged |  |
| Open P0/P1 issues |  |
| Open P2 issues |  |
| Deferred issues accepted by | `[Name]` |
| Deferred issue rationale |  |
| Issue register reviewer | `[Name]` |
| Review date/time | `[DD Month YYYY, HH:MM]` |
