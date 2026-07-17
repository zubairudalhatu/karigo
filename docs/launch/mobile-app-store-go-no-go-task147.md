# Task 147 - Mobile App Store Go/No-Go Record

Date: 2026-07-17

## Purpose

Record the decision status for preparing KariGO Customer App and KariGO Captain App for controlled app-store release.

This record does not approve store submission, public launch or live payments.

## Decision Summary

| Decision Area | Current Status |
| --- | --- |
| Customer App production build planning | Ready to prepare |
| KariGO Captain production build planning | Ready to prepare |
| Google Play submission | No-Go until production profiles/assets/legal approval |
| Apple App Store/TestFlight submission | No-Go until production profiles/assets/legal approval |
| Controlled closed testing | Conditional Go after production RC build |
| Live payments | No-Go |
| Monnify | Primary sandbox-ready provider |
| Paystack | Secondary sandbox-ready provider |
| Squad | Deferred |
| Mock payment fallback | Required |

## Go Criteria

- [ ] Production EAS profiles approved and committed in a future task.
- [ ] Production API base URL approved.
- [ ] Customer App store build passes QA.
- [ ] Captain App store build passes QA.
- [ ] Store metadata/assets approved.
- [ ] Privacy Policy and Terms approved.
- [ ] App privacy labels prepared.
- [ ] Store review/test credentials distributed through secure channel.
- [ ] Backend/Admin/Vendor/Website production readiness confirmed.
- [ ] Payment posture documented and approved.
- [ ] No P0/P1 defects open.

## No-Go Criteria

Any of these keeps app-store submission blocked:

- production build profile missing;
- app points to unapproved API base URL;
- app-store screenshots/assets missing;
- privacy/legal not approved;
- live payment accidentally enabled;
- Squad shown to customers before deferral is lifted;
- order/payment/delivery flow fails;
- support or incident process not staffed;
- secret or private user evidence appears in Git.

## App Store Submission Decision

| App | Android Store Build | iOS/TestFlight Build | Decision |
| --- | --- | --- | --- |
| Customer App | Not built | Not built | No-Go |
| KariGO Captain App | Not built | Not built | No-Go |

## Controlled Launch Build Decision

```text
Controlled launch build planning: Go
Production EAS profile task: Required
Store submission: Not approved
Public launch: Not approved
Live payments: Not approved
```

## Signoff

| Role | Name | Decision | Date |
| --- | --- | --- | --- |
| Product Lead |  |  |  |
| Technical Lead |  |  |  |
| QA Lead |  |  |  |
| Operations Lead |  |  |  |
| Finance Lead |  |  |  |
| Legal/Data Protection |  |  |  |
| Management |  |  |  |
