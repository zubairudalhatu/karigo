# KariGO Soft Launch Fix Plan - Task 60

Date: 10 July 2026
Environment: Live staging
Related report: `docs/qa/results/karigo-credentialed-role-qa-report-task60.md`

This plan captures the next fix and verification sprint after Task 60. It does not introduce new business features and does not activate Taxi, Pharmacy, live Bills & Utilities or live providers.

## Open Issues and Follow-Up Tasks

| ID | Area | Severity | Status | Issue | Recommended action | Owner | Exit criteria |
|---|---|---|---|---|---|---|---|
| T60-001 | QA credentials | High | Open | The QA runner did not have secure access to `SEED_DEMO_PASSWORD`, `SUPER_ADMIN_PASSWORD` or `STAGING_DEMO_PASSWORD`. | Provide secure vault access or set a temporary local environment variable outside Git before the next QA run. Never place values in commands, docs or screenshots. | QA/Ops | Admin, Vendor, Customer and Rider login can be tested without exposing credentials. |
| T60-002 | Customer App QA | High | Open | Customer role checklist is not fully executed in Task 60. | Install or update the Customer staging app, log in with the demo customer, and run the full customer checklist. | QA/Mobile | Evidence recorded for login, address, vendor browse, cart, quote, promo, mock payment, order tracking, delivery OTP, support and notifications. |
| T60-003 | Rider App QA | High | Open | Rider role checklist is not fully executed in Task 60. | Install or update the Rider staging app, log in with the demo rider, and run the rider checklist against a staged order. | QA/Mobile/Ops | Evidence recorded for availability, assigned job, status progression, OTP completion, earnings and notifications. |
| T60-004 | End-to-end order evidence | High | Open | A fresh Task 60 end-to-end order journey has not been recorded across all roles. | Run one controlled staging order from customer checkout through mock payment, vendor acceptance, admin dispatch, rider delivery and customer OTP completion. | QA/Ops | One masked order reference is recorded with pass/fail results for each role handoff. |
| T60-005 | Admin full checklist | Medium | Open | Admin branded dashboard reachability is confirmed, but the full admin checklist is not recorded. | Execute Admin Portal checklist for dashboard, live orders, dispatch, users, vendors, riders, payments, settlements, support, reports, utilities and Taxi readiness views. | QA/Admin Ops | Full admin checklist has pass/fail evidence. |
| T60-006 | Vendor full checklist | Medium | Open | Vendor branded dashboard reachability is confirmed, but full vendor role checks are not recorded. | Execute Vendor Dashboard checklist for food, grocery and market vendors. | QA/Vendor Ops | Vendor-scoped order, product, settlement, payout and notification checks are recorded. |
| T60-007 | Admin DNS monitoring | Low | Monitor | One `admin.karigo.com.ng` lookup failed, then passed on retry. | Monitor DNS/Vercel custom-domain stability during the next staging window. | Deployment | No repeated DNS failures across repeated checks. |

## Fix Sprint Sequence

1. Secure credential preparation
   - Confirm demo account password values through an approved secret manager.
   - Export values locally for the QA runner or assign a human tester.
   - Do not commit or paste password values.

2. Web dashboard credentialed QA
   - Test Super Admin on `https://admin.karigo.com.ng`.
   - Test Operations Admin if available.
   - Test Demo Food Vendor, Demo Grocery Vendor and Demo Market Vendor on `https://vendor.karigo.com.ng`.
   - Confirm role mismatches are rejected cleanly.

3. Customer App QA
   - Confirm app points to `https://karigo-8htn.onrender.com/api/v1`.
   - Run login, browse, cart, checkout quote, promo, mock payment, order tracking, delivery OTP, support and notifications.

4. Rider App QA
   - Confirm app points to `https://karigo-8htn.onrender.com/api/v1`.
   - Run login, availability, assigned job, accept/reject, pickup, delivery statuses, OTP completion, earnings and notifications.

5. Cross-role end-to-end evidence
   - Use one fresh staging order.
   - Record masked order reference only.
   - Do not capture OTP values, passwords or bearer tokens.

6. Readiness decision update
   - Update the Task 60 go/no-go document with final pass/fail outcomes.
   - Convert any product defects into separate implementation tasks.

## Do Not Fix In This Sprint Unless Separately Approved

- Do not activate live payment, SMS, email, WhatsApp or push providers.
- Do not activate live Bills & Utilities fulfilment.
- Do not activate public Taxi.
- Do not activate Pharmacy.
- Do not change pricing, settlement, payout or provider architecture unless a tested defect explicitly requires a new task.

## Validation Required After Follow-Up Fixes

- Backend build/typecheck if backend code changes.
- Admin Portal typecheck/build if admin code changes.
- Vendor Dashboard typecheck/build if vendor code changes.
- Customer App typecheck/Expo validation if mobile customer code changes.
- Rider App typecheck/Expo validation if rider code changes.
- Secret scan on all changed files.
- `git diff --check`.
