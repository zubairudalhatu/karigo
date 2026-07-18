# Task 162 - Customer and Captain Internal Testing Update Plan

Date: 18 July 2026

Purpose: coordinate the internal-testing update for the fresh KariGO Customer and KariGO Captain Android release-candidate AABs.

## Launch Position

| Area | Status |
| --- | --- |
| Customer App production AAB | Built |
| Captain App production AAB | Built |
| Google Play track | Internal testing only |
| Production publishing | Not approved |
| Live payments | No new activation in this task |
| Backend/Admin/Website/Vendor redeploy | Not required |

## Internal Testing Builds

Customer:

- App name: KariGO
- Package: `com.karigo.customer`
- Version: `0.1.0`
- Version code: `2`
- EAS profile: `customer-production`
- Channel: `customer-production`
- EAS build ID: `229a04f0-1f1f-4fab-955a-3bd729321384`
- Artifact type: AAB

Captain:

- App name: KariGO Captain
- Package: `com.karigo.rider`
- Version: `0.1.0`
- Version code: `3`
- EAS profile: `captain-production`
- Channel: `captain-production`
- EAS build ID: `968eae26-7b1e-41da-942c-a27bcd39a01f`
- Artifact type: AAB

## Update Steps

1. Download each AAB from its Expo dashboard build record.
2. Upload Customer AAB to KariGO Google Play Internal testing.
3. Upload Captain AAB to KariGO Captain Google Play Internal testing.
4. Confirm package names and version codes before rollout.
5. Release to internal testers only.
6. Notify testers that a new internal-testing build is available.
7. Record install and smoke-test outcomes in the Task 162 QA verification record.

## Tester Focus

Customer testers should focus on:

- Icon and brand visibility.
- Live-mode checkout provider list.
- Squad by GTBank checkout start.
- Order flow sanity.
- Kano/Abuja launch copy.

Captain testers should focus on:

- Icon and brand visibility.
- Login/session persistence.
- Delivery Captain navigation and availability.
- Profile/application/referral/location readiness screens.

## Guardrails

- Do not promote to production.
- Do not upload APK files for this production release-candidate track.
- Do not commit AAB/APK artifacts.
- Do not commit direct artifact URLs.
- Do not change package names.
- Do not activate additional live services.
