# Task 150 - Android Closed Testing Operations Runbook

Date: 2026-07-17

## Purpose

Provide the operational process for uploading KariGO Android release candidates to Google Play internal or closed testing and coordinating tester QA.

This runbook does not authorize production publishing or live payment activation.

## Roles

| Role | Responsibility |
| --- | --- |
| Release operator | Retrieve AAB artifacts and upload to Play testing tracks |
| QA lead | Assign testers, collect evidence and triage defects |
| Backend owner | Monitor health, auth, payment and order APIs |
| Operations lead | Confirm pilot scope and pause/continue decisions |
| Security/privacy reviewer | Confirm no sensitive evidence or credentials are exposed |

## Upload Process

1. Confirm the release commit and Task 149 build IDs.
2. Retrieve Customer and Captain AAB files from authenticated Expo build pages or approved release storage.
3. Open Google Play Console with the approved release operator account.
4. Select KariGO Customer.
5. Select internal testing or closed testing.
6. Upload the Customer AAB.
7. Save the testing release without promoting to production.
8. Select KariGO Captain.
9. Select internal testing or closed testing.
10. Upload the Captain AAB.
11. Save the testing release without promoting to production.
12. Add approved tester group or tester emails.
13. Share testing links through approved operational channels only.

## Tester Communication Template

```text
You have been invited to test KariGO on Android.

Please install only from the official Google Play testing link shared by KariGO Operations.
This is a controlled test build. Live payments are not enabled.

Report any issue with:
- app tested;
- device model;
- Android version;
- time of issue;
- steps taken;
- safe screenshot or video reference, if available.
```

Do not include passwords, OTPs, payment references, private phone numbers or direct artifact links in tester messages.

## Monitoring During Closed Testing

- Backend health: `/api/v1/health`
- Customer registration/login issues
- Captain login and job assignment issues
- Checkout quote and payment-provider selection
- Mock payment fallback
- Monnify Sandbox and Paystack Test Mode behavior
- Order status sync across Customer, Vendor, Admin and Captain surfaces
- Crash reports or tester-reported fatal errors

## Pause Rules

Pause testing if:

- testers cannot install the app;
- login fails for most testers;
- backend health is down;
- checkout cannot proceed through any approved path;
- Customer App crashes during checkout;
- Captain App cannot complete delivery;
- privacy/legal links are missing;
- live payment is accidentally enabled;
- sensitive data appears in screenshots, logs or tester evidence.

## Evidence Handling

- Store tester names and contact details outside Git.
- Store screenshots/video references in approved private storage.
- Mask OTPs, phone numbers, private addresses and payment references.
- Do not commit downloaded AAB files.
- Do not commit Google Play testing links if they expose private access.
- Do not commit direct Expo artifact URLs.

## Current Operations Status

```text
Upload process: Prepared
Tester QA: Pending
Production publish: Not approved
Live payments: Disabled
```
