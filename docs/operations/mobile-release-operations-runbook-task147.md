# Task 147 - Mobile Release Operations Runbook

Date: 2026-07-17

## Purpose

Define the operational process for preparing, distributing and monitoring KariGO mobile production release candidates.

This runbook does not publish apps or activate live payments.

## Release Roles

| Role | Responsibility | Assigned |
| --- | --- | --- |
| Release Lead | Owns mobile release timeline and final checklist |  |
| Technical Lead | Owns build profiles, app config, EAS builds and rollback |  |
| QA Lead | Owns release-candidate testing and evidence |  |
| Operations Lead | Owns vendor, captain and support readiness |  |
| Finance Lead | Owns payment-mode and reconciliation readiness |  |
| Legal/Data Protection | Owns privacy, terms and store declarations |  |
| Support Lead | Owns support scripts and escalation |  |
| Management | Final Go/No-Go approval |  |

## Release Freeze Rules

- Freeze unrelated product changes before release-candidate build.
- Do not change payment modes during RC testing.
- Do not enable live payment, utilities, rides, wallet funding, withdrawals or payouts.
- Do not rotate API URLs or EAS channels during active QA without restarting the RC process.
- Do not distribute APK/AAB/IPA links publicly before management approval.

## Release Candidate Preparation

1. Confirm release branch/commit.
2. Confirm backend/Admin/Vendor/Website deployment status.
3. Confirm production API base URL and CORS plan.
4. Confirm app-store metadata and assets are ready.
5. Confirm store review/test accounts are available through secure channel.
6. Confirm payment posture:
   - Mock fallback available.
   - Monnify primary.
   - Paystack secondary.
   - Squad deferred.
   - Live payments disabled.
7. Confirm support coverage window.
8. Confirm rollback/pause owner.

## Controlled Distribution Plan

| Stage | Audience | Gate |
| --- | --- | --- |
| Internal RC | Product, engineering, QA | Install, login and core flow pass |
| Operations RC | Admin, vendor ops, dispatch, support | Operational flow pass |
| Closed pilot | Approved Kano pilot users | No P0/P1 defects |
| Limited public rollout | Small controlled percentage or invite group | Management Go |
| Wider rollout | Public | Post-pilot review and legal/payment signoff |

## Monitoring Checklist

First hour:

- [ ] Crash reports checked.
- [ ] Login/OTP/account activation checked.
- [ ] Customer checkout checked.
- [ ] Vendor Dashboard order visibility checked.
- [ ] Admin Portal dispatch checked.
- [ ] Captain delivery flow checked.
- [ ] Payment provider status checked.
- [ ] Support queue checked.

First day:

- [ ] Failed order count reviewed.
- [ ] Payment initialization failures reviewed.
- [ ] Support tickets reviewed.
- [ ] Vendor fulfilment issues reviewed.
- [ ] Captain completion issues reviewed.
- [ ] App install/update issues reviewed.
- [ ] Daily release report sent.

## Pause Triggers

Pause distribution if:

- app cannot login or register users;
- OTP/auth SMS fails broadly;
- checkout creates incorrect totals;
- payment provider marks success but KariGO does not verify correctly;
- order state breaks between Customer, Vendor, Admin or Captain surfaces;
- delivery code is exposed to unauthorized roles;
- app crashes on launch for common devices;
- store review flags privacy, payment, safety or misleading copy issues;
- live payment appears without approval.

## Rollback Options

- Stop rollout in store/closed testing track.
- Pull distribution link or stop invitations.
- Use EAS Update for safe JS-only rollback if compatible with runtime.
- Submit new binary if native dependency/config changed.
- Keep Mock payment available as fallback.
- Restore previous backend/Admin/Vendor deployment if server-side issue caused release failure.

## Evidence Handling

Do not store in Git:

- app-store credentials;
- APK/AAB/IPA binaries;
- private install links;
- screenshots containing personal data;
- OTPs, payment references with sensitive context, tokens or passwords;
- provider dashboard secrets.

Store sensitive evidence in the approved private evidence location only.

## Current Operations Decision

```text
Mobile production RC operations: Ready to prepare
Production public launch: Not approved
Live payment activation: Not approved
Required next step: production EAS profile/configuration task
```
