# Task 147 - Production App Store Readiness

Date: 2026-07-17

## Purpose

Prepare KariGO for production mobile app release readiness and controlled public launch build planning.

This document does not publish any app, activate live payments, configure production secrets, or approve public launch.

## Current Readiness Snapshot

| Area | Status | Release Position |
| --- | --- | --- |
| Customer App | Staging APK tested; main flows working | Candidate for production-release planning |
| KariGO Captain App | Delivery Captain foundation ready | Candidate for production-release planning |
| Admin Portal | Working | Required for launch operations |
| Vendor Dashboard | Working | Required for vendor operations |
| Public Website | Working | Required for support, policy and onboarding links |
| Mock payment | Working | Required fallback |
| Monnify Sandbox | Working | Primary launch payment candidate |
| Paystack Test Mode | Working | Secondary launch payment candidate |
| Squad Sandbox | Fails initialization | Deferred |
| Live payments | Disabled | Not approved in this task |

## External Store Requirements To Reconfirm Before Submission

These requirements should be rechecked immediately before store upload because store policies change.

- Google Play target API: Google Play currently states that starting August 31, 2026, new apps and updates must target Android 16 / API level 36 or higher, with limited platform exceptions. Source checked: `https://developer.android.com/google/play/requirements/target-sdk`.
- Android store artifact: Google Play submission should use an Android App Bundle (`.aab`), not the internal-distribution APK used for staging. Expo notes that production app-store builds are store-distributed binaries and Android App Bundle is the recommended/default store format. Source checked: `https://docs.expo.dev/deploy/build-project/`.
- Apple privacy details: App Store Connect requires app privacy details for new apps and updates, including data practices of integrated third-party SDKs. Source checked: `https://developer.apple.com/app-store/app-privacy-details/`.
- Apple screenshots: App Store Connect requires valid screenshots/app previews for supported device classes. Source checked: `https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/`.

## Current Expo App Identity Review

### Customer App

| Item | Current Value |
| --- | --- |
| Expo slug | `karigo-customer` |
| Staging app name | `KariGO Customer Staging` |
| Production app name path | `KariGO Customer` |
| Staging Android package | `com.karigo.customer.staging` |
| Production Android package path | `com.karigo.customer` |
| Staging iOS bundle ID | `com.karigo.customer.staging` |
| Production iOS bundle ID path | `com.karigo.customer` |
| EAS project ID | `467aa2f6-22b1-4a81-a9d6-c38f3ebe191d` |
| Current EAS profile | `customer-staging` internal APK only |
| Production EAS profile | Not yet configured |

### KariGO Captain App

| Item | Current Value |
| --- | --- |
| Expo slug | `karigo-rider` |
| Staging app name | `KariGO Captain Staging` |
| Production app name path | `KariGO Captain` |
| Staging Android package | `com.karigo.rider.staging` |
| Production Android package path | `com.karigo.rider` |
| Staging iOS bundle ID | `com.karigo.rider.staging` |
| Production iOS bundle ID path | `com.karigo.rider` |
| EAS project ID | `344a78dc-69d9-4daa-9616-f100b67f0910` |
| Current EAS profile | `rider-staging` internal APK only |
| Production EAS profile | Not yet configured |

## Release Readiness Gaps

- Production EAS build profiles are not currently present for Customer or Captain.
- Store-ready Android `.aab` profiles are not configured yet.
- iOS production/TestFlight profiles are not configured yet.
- Production API base URL must be approved before production mobile builds.
- Store listings, screenshots, privacy labels and support URLs require final review.
- Legal must approve Privacy Policy, Terms, refund/cancellation wording and data-retention language.
- App Store / Play Console developer accounts and access roles must be confirmed.
- Payment live mode remains disabled; Monnify and Paystack are sandbox-ready only.

## Store Metadata Checklist

For each app:

- [ ] App display name approved.
- [ ] Subtitle/short description approved.
- [ ] Long description approved.
- [ ] Category selected.
- [ ] Age/content rating completed.
- [ ] Support URL points to public KariGO support/contact page.
- [ ] Privacy Policy URL points to public KariGO Privacy Policy.
- [ ] Terms URL points to public KariGO Terms.
- [ ] Screenshots approved.
- [ ] App icon approved.
- [ ] Feature graphic / promotional art approved where required.
- [ ] Test account and review notes prepared without exposing passwords in Git.
- [ ] Permission usage wording matches actual app behavior.
- [ ] Store copy does not claim live rides, live wallet funding, payout automation, Pharmacy marketplace or live utilities.

## Permission And Privacy Notes

Customer App currently includes:

- Photo library access for optional customer profile photo selection.
- Location access only when the customer chooses to detect a delivery or service address.
- Network/API access for authenticated platform usage.

Captain App currently includes:

- Delivery workflow access for approved Delivery Captains.
- No live ride dispatch or payout automation.

Privacy labels must account for:

- Account identifiers.
- Phone number and email where collected.
- Location when used.
- Order and support activity.
- Payment status metadata.
- Uploaded profile/document images where supported.
- Third-party SDK/provider practices for Expo, payment providers and notification providers.

## Current Go/No-Go

```text
Production app-store submission: No-Go
Production build configuration: Ready to prepare
Controlled release-candidate planning: Go
Live payment activation: No-Go
Squad customer checkout: Deferred
```

## Required Next Engineering Task

Create explicit production EAS profiles for Customer and Captain after management approves:

- production API base URL;
- app-store package/bundle identifiers;
- Android `.aab` build settings;
- iOS TestFlight settings;
- release channels/runtime version strategy;
- no live payment activation unless separately approved.
