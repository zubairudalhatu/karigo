# Dedicated Google Play reviewer access — preparation and verification

Task 209B-S1-H11.2D; 27 September 2026.

## Audit finding

All three Console Sign in details entries contain a username/phone and password, declare restricted access, and claim full access. Customer has only three characters of extra instructions; Captain and Partner have no additional instructions. No current dedicated-account verification record was found. Existing credentials were not used because their non-personal ownership is unverified. Values are intentionally omitted.

The old staging demo pack is not a production reviewer account source. Do not reuse founder, administrator, personal or publicly seeded accounts. Do not disable production OTP/MFA or introduce a universal reviewer bypass.

## Prepare the three accounts

Use the approved account registration and operational review process with organization-controlled, non-personal phone numbers. A human account custodian must enter new passwords and any verification codes privately. Keep credentials in the approved vault; do not place them in this repository, chat, screenshots or logs.

| Label | Required state | Controlled data |
| --- | --- | --- |
| PLAY_REVIEW_CUSTOMER | Verified Customer; normal reusable password login | Fictional profile/address, safe order history, zero live wallet balance |
| PLAY_REVIEW_CAPTAIN | Verified, approved Captain; active Ride/Delivery eligibility as actually supported | No unpaid earnings or live assignment; access to a controlled demonstration assignment without dispatching to unrelated users |
| PLAY_REVIEW_PARTNER | Verified and approved Partner; actual supported selling/service capabilities enabled | Fictional business, approved sample product/service, no real settlement bank details |

Do not falsely mark a real applicant approved. Establish a documented review persona through authorized operations, using a supported non-live testing arrangement where available. If production has no way to isolate reviewer operations from real dispatch, purchases or payouts, resolve that capability before promising reviewers full access.

## Clean-device verification

1. Record the installed Play version/code and backend environment. Verify the account's label, role and ownership privately before attempting login.
2. Sign in using exactly the credentials intended for Console. No owner phone, personal Google account, expiring OTP or human intervention may be needed for repeat access.
3. Verify all relevant screens, active account state and server permissions. Check geographic restrictions from a reviewer-compatible environment. Do not claim location-independent access if a real geofence blocks it.
4. Confirm reviewer actions cannot cause uncontrolled dispatch, payments, payouts or exposure of real users. State any limits precisely; if a core feature is inaccessible, provide a supported controlled review path.
5. Test logout/login again and record PASS/FAIL, timestamp, app build and account custodian without credentials.
6. Enter the verified dedicated credentials directly into Play Console's secure fields. Update instructions only after they have been tested verbatim. Do not assert full access based solely on a saved password field.

## Instruction text to finalize after verification

These are drafts, not assertions that accounts already work. Replace bracketed items privately with tested navigation or instructions. Do not submit unresolved placeholders.

**Customer:** Sign in with the dedicated review phone and password supplied above. [Confirm whether repeat sign-in needs no OTP.] Use Home/Browse to inspect available services, then Profile for account settings and Account deletion. Use [verified controlled order/Ride review path] for transaction-dependent screens. Do not enter personal payment details or make a real purchase.

**Captain:** Sign in with the dedicated approved Captain account above. [Confirm whether repeat sign-in needs no OTP.] Open the dashboard and allow foreground location for the map. Use [verified controlled assignment instructions] to inspect accepting and completing work. Background location is requested only after acceptance, after an in-app disclosure. Review the attached current demonstration video for minimized tracking. [List actual operating-area constraints and supported reviewer access.] Do not accept a real customer assignment or pay a commission.

**Partner:** Sign in with the dedicated approved Partner account above. [Confirm whether repeat sign-in needs no OTP.] Review the controlled business profile, sample product/service and order history. Inspect [verified onboarding/payment status and review-safe workflow]. No personal bank details or real onboarding payment is needed for the prepared review account [retain only after verification].

## Secure handoff record

Record private vault item references, account custodian, roles, build IDs, verification date, expiry/review date, restrictions, and exact tested instructions. Keep passwords and phone numbers outside version control. The audit remains blocked on account ownership and clean-device validation until these steps are complete.
