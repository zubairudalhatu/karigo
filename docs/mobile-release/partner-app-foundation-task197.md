# KariGO Partner App Foundation - Task 197

Task 197 creates the first mobile foundation for **KariGO Partner**.

## App Identity

| Item | Value |
| --- | --- |
| App name | KariGO Partner |
| Workspace | `@karigo/partner-app` |
| App path | `apps/partner-app` |
| Expo slug | `karigo-partner` |
| Production package | `com.karigo.partner` |
| Staging package | `com.karigo.partner.staging` |
| Production scheme | `karigo-partner` |
| Staging scheme | `karigo-partner-staging` |

## Supported Partner Types

- Product Seller
- Service Provider
- Both Product Seller and Service Provider

## Foundation Scope

The app currently includes:

- Expo Router app shell.
- KariGO Partner branding and assets.
- Secure token storage.
- Partner login using existing approved Partner/Vendor accounts.
- Partner dashboard.
- Read-only mobile visibility for orders, products, services, onboarding documents and profile.
- Partner-specific staging and production EAS profiles.
- Regression check for identity, routing, auth boundaries and launch guardrails.

## Not Included Yet

- EAS project link/project ID.
- Google Play or App Store submission.
- Native production build.
- Product or service create/edit workflows.
- Document upload from mobile.
- Push notifications.
- Partner payout automation.
- Provider public contact exposure.

## Build Notes

Before building store artifacts:

1. Link the app to a dedicated Expo/EAS project.
2. Confirm production package remains `com.karigo.partner`.
3. Confirm API base remains `https://karigo-8htn.onrender.com/api/v1` unless production backend changes.
4. Run Partner typecheck, regression check, Expo config validation and Expo Doctor.
5. Build only after launch approval.
