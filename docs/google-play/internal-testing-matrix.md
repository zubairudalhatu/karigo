# Internal testing matrix

Tester email addresses must be Google or Google Workspace accounts and live in an approved private list, never this repository.

## Device coverage

| Tier | Android | Example capability | Required apps |
| --- | --- | --- | --- |
| Low | Supported minimum through Android 11 | Limited memory/storage, slow network | All three |
| Mid | Android 12-14 | Typical Kano/Abuja device | All three |
| High | Android 15-16 | Modern biometric/GPS hardware | All three |

## Customer coverage

- Kano and Abuja accounts; registration, login and session persistence.
- Home, Ride location search/map, route/fare, cancellation and active Ride state.
- Marketplace/order history, notifications, profile, legal/support and deletion request.
- Test on slow network and denied/re-enabled location permission.

## Captain coverage

- Delivery-only, Ride-only and dual-mode approved accounts.
- Login/session, location permission, map/GPS stability, online/offline and current work.
- Assignment, Ride PIN lifecycle, Deliveries, earnings, notifications, profile and deletion request.

## Partner coverage

- Product Seller, Service Provider and Both account types.
- Login/session, online/offline, product/service CRUD, orders, settlements and profile.
- Upload permissions, legal/support, deletion request and Partner Workspace login consistency.

## Tester instructions

1. Open the private opt-in link while signed into the approved Google account.
2. Accept the test, install from Google Play and confirm app/versionCode before testing.
3. Grant only permissions required by the scenario; record denied-permission behaviour too.
4. Report app, versionCode, device model, Android version, time, network and reproducible steps.
5. Redact phone numbers, emails, OTPs, addresses, payment details and credentials from evidence.
6. Never share reviewer credentials or opt-in links outside the approved group.
7. Remain opted in until the test owner closes the cycle. Moving tracks requires documented opt-out/opt-in.

Feedback channel: **OWNER CONFIRMATION REQUIRED** before tester invitation.
