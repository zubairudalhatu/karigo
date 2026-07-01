# Push Sandbox Activation Readiness Check

## Decision Summary

| Item | Current state |
| --- | --- |
| Selected preparation path | Expo Push sandbox/staging assessment |
| Formal management approval | Not recorded; `MDR-014` is Open |
| Sandbox/test account | Required; not evidenced in the repository |
| Provider credentials | Required in staging secret storage; unavailable to this review |
| Internal test devices | Required for customer and rider; availability not evidenced |
| Device-token registration | Backend endpoints implemented; raw token/device ID omitted from responses |
| Customer app | Authenticated token API client ready; permission/collection SDK absent |
| Rider app | Authenticated token API client ready; permission/collection SDK absent |
| Backend build | Passing at Task 35 verification |
| Mock fallback | Ready and remains the configured provider |
| Deployed staging | Designed in documentation; deployment evidence not present |

## Required Staging Variables

- `PUSH_PROVIDER=expo`
- `PUSH_NOTIFICATION_ENABLED=false` until the activation gate is approved
- `EXPO_ACCESS_TOKEN`
- `EXPO_PROJECT_ID`
- `EXPO_PUSH_URL`

Store credentials and provider-controlled values only in the staging secret manager.
Device tokens are sensitive operational data and must not enter source control, normal
logs, analytics, screenshots, tickets, or committed evidence.

## Guardrail Readiness

- [x] Mock push is the default.
- [x] Expo and Firebase providers are hard-disabled placeholders.
- [x] Non-mock environment selection fails startup.
- [x] Device-token endpoints require JWT authentication.
- [x] Token registration is bound to the authenticated user's role/app surface.
- [x] Another user cannot claim or deactivate a token.
- [x] Raw tokens and optional device identifiers are omitted from API responses.
- [x] Mock logs mask tokens and omit message body/data.
- [x] External push failures are caught by notification orchestration.
- [ ] Expo provider delivery/receipt adapter is implemented.
- [ ] Invalid-token receipts automatically deactivate tokens.
- [ ] Mobile permission, token collection/refresh, and logout cleanup are implemented.
- [ ] Dedicated event-level push deduplication is implemented.
- [ ] An external push attempt automatically guarantees a companion in-app record.

In-app notifications remain the product source of truth. Current workflows create in-app
records independently; a direct PUSH-channel call does not itself persist an in-app copy.

## Approval Owner

Product/Mobile, Security, and Engineering must jointly approve the Expo staging
assessment. Record the decision and test-device owners against `MDR-014`.

## Activation Decision

- [ ] Ready for sandbox activation
- [x] Waiting for credentials
- [x] Waiting for test devices
- [x] Waiting for mobile build configuration
- [x] Blocked by technical issue
- [x] Blocked by management approval

Do not change `PUSH_PROVIDER=mock` until all applicable gates are closed.
