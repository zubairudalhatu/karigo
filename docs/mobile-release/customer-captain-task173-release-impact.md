# Task 173 Customer/Captain Mobile Release Impact

Date: 18 July 2026

## Customer App

Fresh Customer Android AAB/APK is required because Task 173 adds the native Expo WebBrowser dependency for hosted Squad checkout.

Package name must remain:

```text
com.karigo.customer
```

Release-impact items:

- Squad order payment opens externally.
- Wallet top-up opens externally.
- Home city detection uses Expo Location and only shows a detected city when Kano or Abuja is matched.
- Profile adds `Become a KariGO Captain`.

Do not publish directly to production. Use Google Play internal testing first.

## Captain App

Fresh Captain AAB/APK is recommended for Play internal testing so the cleaned Home/Profile/GPS behavior is included.

Package name must remain:

```text
com.karigo.rider
```

Release-impact items:

- Home removes repeated Captain modes, Ride readiness, guardrails and tools.
- Home uses one availability/status control.
- Profile stores preferred Ride service areas for future review.
- GPS update wording remains live-ready and safe.

## Backend Dependency

Backend redeploy is required for:

- Squad checkout URL alias response fields.
- defensive Squad checkout URL parsing.
- Rider preferred service areas storage.
- Vendor Trash safety guard.
- live cleanup script availability.

Prisma migration required:

```text
20260718173000_task173_rider_preferred_service_areas
```

## EAS Update Note

Customer changes include a native dependency, so EAS Update alone is not enough for a final Play/internal-testing Customer build.

Captain changes do not add a new native dependency in this task, but a consolidated fresh Captain internal-testing build is recommended for QA consistency.
