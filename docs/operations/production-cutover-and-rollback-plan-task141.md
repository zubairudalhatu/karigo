# Task 141 - Production Cutover And Rollback Plan

## Purpose

This plan defines how KariGO should move from staging/controlled pilot posture to
a controlled production go-live window. It is operational guidance only and does
not activate live payments or any disabled service.

## Cutover Roles

| Role | Name | Responsibility |
| --- | --- | --- |
| Cutover Lead |  | Owns go/no-go timeline and final call |
| Technical Lead |  | Deployments, env review, rollback |
| Finance Lead |  | Payment/reconciliation verification |
| Operations Lead |  | Vendor, Captain and dispatch readiness |
| Support Lead |  | Customer issue handling |
| QA Lead |  | Smoke testing and evidence recording |
| Communications Lead |  | Internal/customer/vendor messaging |

## Pre-Cutover Freeze

- [ ] Confirm target cutover date/time.
- [ ] Freeze unrelated feature work.
- [ ] Confirm commit/release candidate.
- [ ] Confirm database migration plan and rollback limitation.
- [ ] Confirm production environment variables are reviewed.
- [ ] Confirm secrets are stored only in platform secret manager.
- [ ] Confirm no `.env` files, keys, tokens, cards or private screenshots are in Git.
- [ ] Confirm rollback deployment version.
- [ ] Confirm support/escalation channel is active.

## Cutover Sequence

| Step | Owner | Expected Result | Status |
| --- | --- | --- | --- |
| Confirm go/no-go signoff | Cutover Lead | Signed approval recorded | `Pending / Pass / Fail` |
| Confirm maintenance/quiet window | Operations | Low-risk cutover window active | `Pending / Pass / Fail` |
| Deploy backend release | Technical | Health endpoint passes | `Pending / Pass / Fail` |
| Run migrations if required | Technical | Migration status clean | `Pending / Pass / Fail / N/A` |
| Deploy Admin Portal | Technical | Login/dashboard loads | `Pending / Pass / Fail` |
| Deploy Vendor Dashboard | Technical | Login/dashboard loads | `Pending / Pass / Fail` |
| Publish/update Customer App if required | Technical | Correct build/update available | `Pending / Pass / Fail / N/A` |
| Publish/update Captain App if required | Technical | Correct build/update available | `Pending / Pass / Fail / N/A` |
| Verify public website | QA | Key pages load | `Pending / Pass / Fail` |
| Verify production CORS | QA | Approved origins work only | `Pending / Pass / Fail` |
| Verify payment mode | Finance + QA | Approved provider or mock fallback only | `Pending / Pass / Fail` |
| Execute controlled checkout test | Finance + QA | Payment/order state correct | `Pending / Pass / Fail / Deferred` |
| Verify vendor/admin visibility | QA | Order/payment status consistent | `Pending / Pass / Fail` |
| Monitor logs | Technical | No P0/P1 errors | `Pending / Pass / Fail` |

## Rollback Triggers

Rollback or pause immediately if:

- live payment appears without approval;
- payment succeeds in provider dashboard but KariGO order state is wrong;
- customer is charged twice;
- provider secret, token, OTP or delivery code appears in logs/UI/evidence;
- customer, vendor or Captain cannot authenticate;
- order creation, dispatch or delivery completion is blocked;
- production database migration causes data integrity errors;
- Admin or Vendor Dashboard becomes unavailable during active operations.

## Rollback Sequence

1. Announce pause in internal operations channel.
2. Stop inviting or onboarding new users.
3. Disable live payment provider or return provider to mock fallback according to
   the approved payment rollback decision.
4. Redeploy backend or previous stable deployment.
5. Confirm backend health and payment mode.
6. Confirm Admin/Vendor dashboards load.
7. Preserve provider and application evidence outside Git.
8. Finance reconciles any real payment attempt.
9. Record incident and management decision.

## Post-Cutover Monitoring

- First 30 minutes: health, logs, login, checkout and order status.
- First 2 hours: support queue, payment dashboard, failed orders, webhook logs.
- First day: vendor fulfilment, Delivery Captain completion, refunds/issues.
- First week: daily operations report and defect triage.

## Current Cutover Decision

```text
Production cutover: Not approved by this plan.
Live payments: Not approved.
Next required action: complete go-live readiness checklist, selected-provider
sandbox certification, production secret review and management signoff.
```
