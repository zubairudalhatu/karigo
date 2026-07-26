# Partner App Foundation QA Checklist - Task 197

Use this checklist before moving KariGO Partner into a production build task.

## Configuration

- [ ] App name is `KariGO Partner`.
- [ ] Production Android package is `com.karigo.partner`.
- [ ] Staging Android package is `com.karigo.partner.staging`.
- [ ] Production scheme is `karigo-partner`.
- [ ] Production API base is `https://karigo-8htn.onrender.com/api/v1`.
- [ ] Linked Expo/EAS project metadata is present and correct.
- [ ] No secrets or environment values are committed.

## Authentication

- [ ] Partner login accepts approved Partner/Vendor accounts.
- [ ] Non-partner roles are rejected.
- [ ] Token storage uses partner-specific SecureStore keys.
- [ ] Logout clears partner access and refresh tokens.
- [ ] Session refresh uses the existing backend refresh endpoint.

## Navigation

- [ ] Bottom navigation shows Home, Orders, Products, Services and Profile.
- [ ] Bottom navigation is hidden on auth screens.
- [ ] Dashboard loads after sign-in.
- [ ] Missing active Partner profile shows a safe support/onboarding state.

## Partner Views

- [ ] Orders screen loads vendor order summaries.
- [ ] Products screen loads product seller catalogue visibility.
- [ ] Services screen loads service-provider catalogue visibility.
- [ ] Documents screen loads onboarding document status visibility.
- [ ] Profile screen loads account and business profile details.

## Guardrails

- [ ] Product/service create/edit remains deferred.
- [ ] Document upload from mobile remains deferred.
- [ ] Payout automation remains disabled.
- [ ] Provider private contact exposure is not added.
- [ ] No mobile build artifact, APK/AAB URL or keystore is committed.
