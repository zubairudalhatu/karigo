# KariGO Launch Operations Index

## Current Decision

KariGO is in controlled soft launch readiness preparation. Internal staging review,
branded Admin/Vendor domains, Customer App, Vendor Dashboard, Admin Portal, KariGO Captain
App, Website, Backend, SME Services, Wallet foundation, Referrals foundation and Paystack
Test Mode readiness have supporting staging documentation.

Controlled external soft launch still requires management approval, current mobile
build/update installation, no open P0/P1 issues, support/dispatch/technical coverage and
signed go/no-go evidence. Public production launch is not approved.

## Task 103 Soft Launch Readiness Pack

- Executive readiness pack: `karigo-soft-launch-readiness-pack-task103.md`
- Go/no-go checklist: `karigo-soft-launch-go-no-go-checklist-task103.md`
- Release runbook: `karigo-soft-launch-release-runbook-task103.md`
- Daily monitoring tracker: `karigo-soft-launch-daily-monitoring-tracker-task103.md`
- Issue triage register: `karigo-soft-launch-issue-triage-register-task103.md`
- Communications and support pack:
  `karigo-soft-launch-communications-and-support-pack-task103.md`

These files prepare operations for a controlled soft launch decision. They do not activate
live Paystack, live Accelerate.ng utilities, live Termii SMS, live payouts, wallet
withdrawals, automatic refunds, live rides, Pharmacy marketplace, provider login or
production launch.

## Controlled Pilot Preparation

- Plan and scope: `controlled-soft-launch-plan.md`
- Zones and expansion: `soft-launch-zones.md`, `controlled-expansion-criteria.md`
- Vendor/rider/customer onboarding: `vendor-soft-launch-onboarding-checklist.md`,
  `rider-soft-launch-onboarding-checklist.md`, `customer-soft-launch-access-plan.md`
- Daily control: `daily-soft-launch-operations-report.md`,
  `soft-launch-kpi-dashboard-definition.md`, `pilot-governance.md`
- Escalation/incidents: `soft-launch-escalation-matrix.md`,
  `soft-launch-incident-log.md`, `incident-response-template.md`
- Feedback/communications: `soft-launch-feedback-form.md`,
  `soft-launch-communication-templates.md`
- Approval/readiness: `soft-launch-readiness-checklist.md`,
  `../handover/controlled-soft-launch-approval-checklist.md`

## Post-Pilot And Public-Launch Preparation

- Review plan/template: `post-soft-launch-review-plan.md`,
  `pilot-performance-review-template.md`
- Public readiness and risks: `public-launch-readiness-checklist.md`,
  `public-launch-risk-register.md`
- Communications/store/support: `public-launch-communication-plan.md`,
  `app-store-preparation-checklist.md`, `production-support-playbook.md`
- Decision and follow-through: `public-launch-go-no-go-meeting-template.md`,
  `post-launch-30-day-review-plan.md`, `public-launch-improvement-backlog.md`

These files define review and approval evidence. They do not authorize public launch.

Never include real credentials, OTPs, tokens, payment secrets, or unnecessary personal
data in these operational documents.

## Full Staging Go/No-Go Pack

- Simulation plan: `../qa/full-staging-pilot-simulation-plan.md`
- Primary scenario: `../qa/full-staging-primary-scenario.md`
- Negative scenarios: `../qa/full-staging-negative-scenarios.md`
- Evidence register: `../qa/full-staging-simulation-evidence-register.md`
- E2E readiness checklist: `../qa/end-to-end-readiness-checklist.md`
- Scoring matrix: `go-no-go-readiness-scoring-matrix.md`
- Final readiness report: `full-staging-go-no-go-readiness-report.md`
- Final blocker register: `final-launch-blocker-register.md`
- Controlled soft launch recommendation: `controlled-soft-launch-recommendation.md`

Current Task 37 decision: no-go for real-customer controlled soft launch until the full
staging simulation passes, critical blockers close, and management/legal/operations
sign-off is recorded.

Task 38 private staging execution records:

- `../deployment/private-staging-deployment-decision-record.md`
- `../deployment/private-staging-environment-validation.md`
- `../deployment/private-staging-demo-account-register.md`
- `../deployment/private-staging-seed-execution-record.md`
- `../qa/private-staging-deployment-verification-script.md`
- `../qa/private-staging-primary-simulation-execution-record.md`
- `../qa/private-staging-negative-simulation-execution-record.md`
- `../qa/private-staging-evidence-register.md`
- `../qa/private-staging-issue-register.md`

Current Task 38 decision: private staging execution is blocked until the staging
environment, secret manager, demo accounts, and evidence storage are supplied.
