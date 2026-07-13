# KariGO Soft Launch Readiness Pack - Task 103

Date prepared: 2026-07-13
Environment: Live staging and controlled pilot preparation

## Purpose

This pack moves KariGO into controlled soft launch readiness planning after successful
staging validation across the core platform surfaces.

It is a documentation, QA and operations-readiness pack only. It does not activate live
Paystack, live Accelerate.ng utilities, live Termii SMS, live payouts, wallet withdrawals,
automatic refunds, live rides, Pharmacy marketplace, provider login or any new live
provider integration.

## Current Platform Readiness

| Surface | Current readiness | Launch note |
| --- | --- | --- |
| Customer App | Staging flows validated across browsing, checkout, payment-state polish, wallet/referral foundations and SME Services visibility | Customer APK or EAS update must be current before pilot |
| Vendor Dashboard | Staging order, settlement visibility and notification polish validated | Vendor access remains vendor-scoped |
| Admin Portal | Operations controls, dispatch, wallets, referrals and SME Services admin tools are available | Admin remains the control point for pilot decisions |
| KariGO Captain App | Delivery Captain workflow and QA pack prepared | Live rides remain disabled |
| Website | Public website, vendor application and safe contact surfaces are live-ready | Non-live services must remain accurately gated |
| Backend API | Health endpoint and staging workflows are available | Mock providers remain default unless approved test mode is used |
| SME Services | Request, admin review, provider directory, assignment foundation and pilot controls exist | Manual coordination only; no provider login or live dispatch |
| Wallet foundation | Customer view and admin adjustment foundation exist | No live top-up, withdrawal or automatic refund |
| Referrals foundation | Customer sharing and admin review/reporting exist | No automatic reward issuing |
| Paystack Test Mode | Readiness and Customer App payment-status polish are prepared | Test Mode only; no live collection |

## Launch Readiness Position

Recommended posture:

| Decision area | Status |
| --- | --- |
| Internal staging review | Go |
| Controlled internal pilot | Go when current mobile builds/updates are installed |
| Controlled external soft launch | Conditional go after management approval and no open P0/P1 issues |
| Public production launch | Not ready |
| Live providers | Not approved |

## Controlled Soft Launch Scope

Recommended first pilot scope:

- Kano only.
- Small invite-only customer group.
- Selected verified vendors only.
- Selected active Delivery Captains only.
- Admin-led dispatch and support oversight.
- Mock payment by default, or Paystack Test Mode only if separately approved for a controlled test.
- Bills & Utilities remains test mode.
- SME Services remains request/review/manual coordination only.
- KariGO Rides remains readiness only.
- Pharmacy remains readiness/compliance gated.

## Required Approvals Before External Pilot

| Approval | Owner | Status |
| --- | --- | --- |
| Management approval for controlled external pilot | Management | Pending |
| Operations staffing and daily monitoring approval | Operations Lead | Pending |
| Support escalation coverage approval | Support Lead | Pending |
| Dispatch coverage approval | Dispatch Lead | Pending |
| Vendor pilot list approval | Operations/Commercial | Pending |
| Delivery Captain pilot list approval | Operations | Pending |
| Demo/test credential handover approval | Technical/Ops | Pending |
| Legal/privacy review for external users | Legal/Management | Pending |
| Payment mode decision: mock or Paystack Test Mode | Management/Finance/Technical | Pending |
| Evidence handling and issue triage agreement | QA/Operations | Pending |

## Non-Negotiable Guardrails

- Do not enable live Paystack.
- Do not enable live Accelerate.ng utility fulfilment.
- Do not enable live Termii SMS.
- Do not enable live payouts, wallet withdrawals or automatic refunds.
- Do not activate live rides or Pharmacy marketplace.
- Do not expose provider private data, OTPs, passwords, API keys, device tokens or bearer tokens.
- Do not use production customer data in staging evidence.
- Keep all pilot evidence masked and stored outside Git when it contains screenshots or private details.

## Entry Criteria

KariGO can enter controlled soft launch execution only when:

- Current Customer and KariGO Captain builds or EAS updates are installed by pilot testers.
- Admin and Vendor branded domains are reachable.
- Backend health is green at `/api/v1/health`.
- Demo/pilot accounts are confirmed through secure channels.
- No open P0/P1 issue remains.
- Pilot vendor, customer and Delivery Captain lists are approved.
- Support, dispatch, admin and technical owners are assigned.
- Daily monitoring and issue triage records are ready.
- Go/no-go checklist is signed by management.

## Exit Criteria

The pilot can be considered successful when:

- Multiple end-to-end orders complete without P0/P1 issues.
- Vendor acceptance and preparation are reliable.
- Delivery Captain assignment and OTP completion work reliably.
- Support issues are resolved within agreed response targets.
- Settlement and earning visibility remains accurate.
- No private data, provider secret or delivery code exposure occurs.
- Management accepts the final pilot report.

## Source Documents

- `karigo-soft-launch-go-no-go-checklist-task103.md`
- `karigo-soft-launch-release-runbook-task103.md`
- `karigo-soft-launch-daily-monitoring-tracker-task103.md`
- `karigo-soft-launch-issue-triage-register-task103.md`
- `karigo-soft-launch-communications-and-support-pack-task103.md`
- `../qa/karigo-captain-delivery-e2e-qa-task100.md`
- `../qa/paystack-test-mode-payment-status-qa-task102.md`
- `../pilot/karigo-controlled-internal-pilot-plan-task64.md`

