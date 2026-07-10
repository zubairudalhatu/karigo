# KariGO Pilot Support Escalation Guide - Task 64

Date: 10 July 2026
Environment: Live staging

Use this guide during the controlled internal pilot. Do not include passwords, bearer tokens, raw delivery OTP values or provider credentials in support notes.

## Escalation Levels

| Level | Owner | Example issue | Target response |
|---|---|---|---|
| Level 1 | Support observer | Customer question, support ticket wording, minor clarification | Same pilot session |
| Level 2 | Dispatch/Admin tester | Rider assignment, vendor delay, delivery status issue | Same pilot session |
| Level 3 | Technical observer | App/API error, login issue, dashboard failure | Same pilot session for P1/P0 |
| Level 4 | Pilot lead | Cross-role issue, repeated failure, go/no-go decision | Immediate for P0/P1 |
| Level 5 | Management reviewer | Security, data integrity, payment integrity, launch decision | Immediate for P0 |

## Escalation Rules

- P0 issues stop the pilot until reviewed.
- P1 issues pause the affected flow until fixed or accepted by the pilot lead.
- P2 issues can continue with caution if a workaround exists.
- P3 issues are logged for later polish.
- Escalation notes must use masked references.

## Common Pilot Issues

| Issue type | First responder | Escalation path |
|---|---|---|
| Customer cannot log in | Support observer | Technical observer |
| Vendor cannot see paid order | Vendor tester | Technical observer and pilot lead |
| Admin cannot assign rider | Admin tester | Technical observer and pilot lead |
| Rider cannot complete delivery | Rider tester | Dispatch/Admin tester and technical observer |
| Support ticket missing | Support observer | Technical observer |
| Settlement/earning mismatch | Admin tester | Pilot lead and finance reviewer |
| Unauthorized data visible | Any tester | Stop pilot and escalate to management reviewer |

## Safe Communication Rules

- Do not paste passwords into chat, Git, issue logs or screenshots.
- Do not paste raw delivery OTP values into evidence.
- Do not expose full phone numbers, private addresses or provider credentials.
- Use masked references for orders, tickets, settlements and earnings.
- Keep customer-facing wording calm, clear and non-technical.

## Closure Requirements

| Severity | Closure requirement |
|---|---|
| P0 | Management and technical signoff after retest |
| P1 | Pilot lead signoff after retest |
| P2 | Owner signoff or management acceptance as non-blocking |
| P3 | Logged in backlog with owner |
