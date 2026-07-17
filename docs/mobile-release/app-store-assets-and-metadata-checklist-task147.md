# Task 147 - App Store Assets And Metadata Checklist

Date: 2026-07-17

## Purpose

Track the app-store assets and metadata required before KariGO Customer App and KariGO Captain App can be submitted to store review.

Do not store private screenshots, test credentials, app-store credentials or unpublished binary links in Git.

## Shared Store Assets

- [ ] Final app icon approved.
- [ ] Splash/launch screen approved.
- [ ] Brand colors reviewed.
- [ ] App screenshots captured from store-distributed release candidate.
- [ ] Screenshot devices/sizes verified against current Google Play and App Store requirements.
- [ ] Feature graphic / promotional graphic prepared for Google Play if required.
- [ ] Privacy Policy URL approved.
- [ ] Terms URL approved.
- [ ] Support/contact URL approved.
- [ ] Public website links verified.
- [ ] Store review notes prepared without real passwords in Git.
- [ ] Demo/review account delivery process approved outside Git.

## Customer App Metadata

Suggested app name:

```text
KariGO Customer
```

Store description must accurately describe:

- food, grocery, market, parcel and SME Services request workflows;
- order tracking;
- controlled payment mode;
- Kano-first availability if launch remains geographically limited.

Store description must not claim:

- live ride booking;
- live Pharmacy marketplace;
- live Accelerate.ng utilities;
- automatic wallet refunds;
- wallet top-up;
- payout automation;
- Squad availability;
- guaranteed delivery times or earnings;
- medical/health booking availability.

Customer screenshots should cover:

- welcome/guest home;
- vendor discovery;
- cart/checkout with safe payment selection;
- order tracking;
- support;
- profile/wallet/referral placeholders where appropriate;
- SME Services as request/review workflow.

## KariGO Captain App Metadata

Suggested app name:

```text
KariGO Captain
```

Store description must accurately describe:

- Delivery Captain login;
- assigned delivery jobs;
- pickup and delivery workflow;
- delivery-code completion;
- earnings visibility where available;
- Ride Captain readiness-only positioning.

Store description must not claim:

- live ride dispatch;
- live payout or withdrawal;
- guaranteed earnings;
- provider login for SME service providers;
- public taxi/ride availability.

Captain screenshots should cover:

- login;
- home/dashboard;
- assigned jobs;
- job detail;
- pickup/delivery status progression;
- delivery code completion;
- profile/help.

## Privacy Label Preparation

Prepare store privacy declarations for data categories that may apply:

- Contact information: name, phone, email.
- Location: delivery/service address and optional location detection.
- User content: support messages and uploaded images/documents where supported.
- Purchases/payment metadata: order/payment status and references, not card details.
- Identifiers: account/session identifiers.
- Diagnostics: crash/error information if collected by hosting/SDK tooling.

Confirm third-party provider disclosures for:

- Expo/EAS and React Native SDK behavior.
- Payment providers used for checkout verification or live release.
- Termii OTP/auth SMS.
- Resend transactional email.
- Hosting, analytics or monitoring providers if enabled.

## Permission Copy Checklist

Customer App:

- [ ] Photo library permission says it is used only when the customer chooses a profile photo.
- [ ] Location permission says it is used only when the customer chooses to detect a delivery/service address.
- [ ] No permission copy implies background tracking.

Captain App:

- [ ] Permission copy accurately matches delivery workflow.
- [ ] No copy implies live ride dispatch or payouts.

## Review Account Handling

- [ ] Store review account exists or approved review flow exists.
- [ ] Password shared through a secure channel outside Git.
- [ ] Review notes explain pilot geography and disabled services.
- [ ] No OTP, password, private phone number, API key or secret is committed.

## Approval Owners

| Area | Owner | Status |
| --- | --- | --- |
| Product copy |  | Pending |
| Brand assets |  | Pending |
| Privacy/legal |  | Pending |
| Payment claims |  | Pending |
| Operations readiness |  | Pending |
| Store account access |  | Pending |
| Final submission approval |  | Pending |
