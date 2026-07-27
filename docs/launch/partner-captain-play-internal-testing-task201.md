# Partner and Captain Play Internal Testing Readiness - Task 201

Date: 2026-07-27

## Current Decision

KariGO Partner and KariGO Captain are ready for fresh Android AAB generation for Google Play Internal Testing after backend deployment and mobile validation.

Production publishing remains not approved.

## Partner App Readiness

| Item | Status |
| --- | --- |
| App name | KariGO Partner |
| Package | `com.karigo.partner` |
| Production profile | `partner-production` |
| VersionCode | `2` |
| Target API | `36` |
| Native upload modules | Included |
| Internal testing upload | Ready after fresh AAB build |

Partner App includes in-app onboarding, password recovery, document upload, product image upload, profile logo upload and cover upload from Task 200.

## Captain App Readiness

| Item | Status |
| --- | --- |
| App name | KariGO Captain |
| Package | `com.karigo.rider` |
| Production profile | `captain-production` |
| VersionCode | `7` |
| Target API | `36` |
| Delivery Captain mode | Pilot-ready |
| Ride Captain mode | Readiness-only |
| Internal testing upload | Ready after fresh AAB build |

## Known Limitations

- Partner service catalogue editing is still a follow-up task.
- Ride dispatch remains disabled/readiness-only.
- Payout automation and wallet withdrawals remain disabled.
- Production publishing is not approved.
- If an API 36 EAS build fails on Expo SDK 53, plan an Expo SDK 54+ migration before Play enforcement.

## Operator Steps

1. Build Partner AAB with `partner-production`.
2. Build Captain AAB with `captain-production`.
3. Upload both AABs to Google Play Internal Testing only.
4. Confirm target API 36 is accepted.
5. Confirm package names and signing keys are accepted.
6. Invite only approved internal testers.
7. Record install and smoke-test evidence in the mobile QA tracker.
