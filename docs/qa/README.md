# KariGO QA Index

These documents support MVP verification, staging rehearsal, and launch decision
evidence. They do not authorize real-customer launch by themselves.

## MVP QA

- `mvp-qa-checklist.md`
- `mvp-end-to-end-test-script.md`
- `e2e-test-results.md`
- `known-issues.md`
- `soft-launch-blockers.md`

## Staging Smoke And Sandbox Tests

- `staging-smoke-test-script.md`
- `staging-known-issues-register.md`
- `payment-sandbox-test-script.md`
- `multi-provider-sandbox-payment-test-plan-task121.md`
- `results/paystack-sandbox-verification-record-task122.md`
- `results/monnify-sandbox-verification-record-task122.md`
- `results/squad-sandbox-verification-record-task122.md`
- `results/multi-provider-sandbox-payment-closeout-task122.md`
- `sms-otp-sandbox-test-script.md`
- `termii-resend-auth-activation-test-plan-task112.md`
- `results/termii-resend-live-pilot-verification-record-task114.md`
- `transactional-email-sandbox-test-script.md`
- `push-notification-sandbox-test-script.md`
- `whatsapp-sandbox-test-script.md`

## Full Staging Pilot Simulation

- `full-staging-pilot-simulation-plan.md`
- `full-staging-primary-scenario.md`
- `full-staging-negative-scenarios.md`
- `full-staging-simulation-evidence-register.md`
- `end-to-end-readiness-checklist.md`

## Private Staging Execution

- `private-staging-deployment-verification-script.md`
- `private-staging-health-verification.md`
- `private-staging-primary-simulation-execution-record.md`
- `private-staging-negative-simulation-execution-record.md`
- `private-staging-evidence-register.md`
- `private-staging-issue-register.md`

## Mobile Staging Tests

- `customer-app-staging-test-checklist.md`
- `rider-app-staging-test-checklist.md`
- `customer-app-staging-test-evidence.md`
- `rider-app-staging-test-evidence.md`

## Evidence Rules

- Do not store real credentials, OTP values, full phone numbers, device tokens, provider
  secrets, or sensitive screenshots in Git.
- Mark unexecuted tests as `Blocked` or `Not Run`.
- Link to masked evidence only.
- Any critical payment, OTP, access-control, dispatch, delivery, refund, or data-privacy
  failure blocks controlled soft launch until fixed and retested.
