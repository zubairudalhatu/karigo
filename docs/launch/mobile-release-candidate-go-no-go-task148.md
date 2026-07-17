# Task 148 - Mobile Release-Candidate Go/No-Go Record

Date: 2026-07-17

## Purpose

Record the Go/No-Go decision for creating KariGO production mobile release-candidate builds.

This record does not approve public app-store submission. It only covers whether the team may run EAS release-candidate builds for controlled testing.

## Current Release Candidate Scope

| App | Profile | Decision |
| --- | --- | --- |
| Customer App | `customer-production` | Ready for build approval |
| KariGO Captain App | `captain-production` | Ready for build approval |

## Required Approval Before Running Builds

- [ ] Engineering confirms release commit.
- [ ] Operations confirms controlled launch scope.
- [ ] QA confirms no P0/P1 mobile blockers.
- [ ] Product confirms store-facing app names and identifiers.
- [ ] Backend owner confirms API base URL.
- [ ] Payment owner confirms live payments remain disabled.
- [ ] Security owner confirms no secrets are in mobile config.

## Build Authorization

```text
Customer Android release-candidate build: Not yet authorized
Customer iOS release-candidate build: Not yet authorized
Captain Android release-candidate build: Not yet authorized
Captain iOS release-candidate build: Not yet authorized
```

## Store Submission Status

```text
Google Play submission: Not approved
Apple App Store submission: Not approved
Public release: Not approved
```

## Payment Status

```text
Live payments: Disabled
Squad by GTBank: Primary launch candidate, pending live environment verification
Monnify: Pending approval / future secondary provider
Paystack: Pending approval / future secondary provider
Squad: Deferred from customer checkout
```

## Decision Log

| Date | Decision | Owner | Notes |
| --- | --- | --- | --- |
| 2026-07-17 | Profiles configured; builds not run | Engineering | Await explicit release-candidate build approval. |

## Current Decision

```text
Production release-candidate profiles: Go
Production release-candidate builds: Hold until explicitly approved
Store submission: No-Go
Live payment activation: No-Go
```
