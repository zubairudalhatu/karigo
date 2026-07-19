# Customer Android Version Code Retry - Task 174

Date: 2026-07-19

## Reason

Google Play Internal Testing rejected the latest Customer App AAB because Android `versionCode` 4 had already been used for package `com.karigo.customer`.

## Change

- Customer App package remains `com.karigo.customer`.
- Customer App name remains `KariGO`.
- Production EAS profile remains `customer-production`.
- Android production `versionCode` was increased from `4` to `5`.
- Backend API URL and EAS configuration remain unchanged.

## Build Record

- Platform: Android
- Profile: `customer-production`
- Artifact type: AAB
- Version code: `5`
- EAS build ID: `77a22bf5-8591-4066-b90a-852185c92039`
- Build status: Finished

## Google Play Upload Note

Upload the new Customer AAB to Google Play Internal Testing only. Production publishing is not approved by this task.
