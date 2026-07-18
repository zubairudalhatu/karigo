# Task 162 - Customer and Captain Play Upload Verification

Date: 18 July 2026

Purpose: provide the Google Play internal-testing upload verification checklist for the fresh KariGO Customer and KariGO Captain Android AABs.

Production publishing status: not approved.

## Build Artifacts

| App | Package | Version code | EAS build ID | Artifact type | Internal testing upload ready |
| --- | --- | --- | --- | --- | --- |
| KariGO | `com.karigo.customer` | `2` | `229a04f0-1f1f-4fab-955a-3bd729321384` | AAB | Yes |
| KariGO Captain | `com.karigo.rider` | `3` | `968eae26-7b1e-41da-942c-a27bcd39a01f` | AAB | Yes |

Artifact download links are available from the Expo dashboard build records and are intentionally not stored in this repository.

## Google Play Upload Instructions

Customer:

1. Open Google Play Console.
2. Select KariGO.
3. Open Internal testing.
4. Create a new release or edit the current draft.
5. Upload the new Customer AAB from EAS build `229a04f0-1f1f-4fab-955a-3bd729321384`.
6. Confirm package `com.karigo.customer`.
7. Confirm versionCode `2`.
8. Release to internal testers only.

Captain:

1. Open Google Play Console.
2. Select KariGO Captain.
3. Open Internal testing.
4. Create a new release or edit the current draft.
5. Upload the new Captain AAB from EAS build `968eae26-7b1e-41da-942c-a27bcd39a01f`.
6. Confirm package `com.karigo.rider`.
7. Confirm versionCode `3`.
8. Release to internal testers only.

Do not promote either app to production from this task.

## Customer QA After Internal Testing Upload

Confirm:

- New launcher icon displays the complete KariGO logo.
- Home/top logo is visible and readable.
- Checkout shows Squad by GTBank only in live mode.
- Mock Payment, Monnify Sandbox and Paystack Test Mode are not shown in live mode.
- Squad payment starts through the backend-authoritative payment flow.
- Orders still progress through the tested customer flow.
- Kano and Abuja launch copy appears correctly.

## Captain QA After Internal Testing Upload

Confirm:

- New launcher icon displays the complete KariGO logo.
- Login and session persistence still work.
- Bottom navigation icons still work.
- Home screen and polished cards render correctly.
- Online/Offline card layout remains fixed.
- Profile tools still work.
- Application, referral and location readiness screens behave correctly.

## Verification Outcome

Current status: ready for Google Play internal-testing upload.

Remaining guardrail: production publishing remains not approved.
