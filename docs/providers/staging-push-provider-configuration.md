# Staging Push Provider Configuration

These are blank deployment templates. Never place real provider or device tokens here.

## Expo Push Preparation

```dotenv
PUSH_PROVIDER=expo
EXPO_ACCESS_TOKEN=
EXPO_PROJECT_ID=
EXPO_PUSH_URL=
PUSH_NOTIFICATION_ENABLED=false
```

Keep `PUSH_NOTIFICATION_ENABLED=false` until the Expo adapter, mobile test builds,
credentials, physical devices, and activation decision are approved.

## Future Firebase Preparation

```dotenv
PUSH_PROVIDER=firebase
FCM_PROJECT_ID=
FCM_CLIENT_EMAIL=
FCM_PRIVATE_KEY=
FCM_SERVER_KEY=
PUSH_NOTIFICATION_ENABLED=false
```

Firebase is not selected for Task 35 and must not be activated automatically.

## Secret And Token Storage

Store provider credentials in the staging platform secret manager. Store device tokens
only in the backend `DeviceToken` table linked to the authenticated user. Restrict database
and provider-dashboard access, and never print tokens in deployment diagnostics.

## Activation Procedure

1. Close `MDR-014` with provider, test-device, Mobile, and Security owners.
2. Implement/review the Expo delivery and receipt adapter.
3. Configure separate staging mobile builds and backend/database.
4. Add provider variables through the staging secret manager.
5. Restart or redeploy the backend after provider changes.
6. Enable delivery only for the controlled test-device cohort.
7. Run the sandbox test script and store redacted evidence externally.

The current environment validator rejects Expo/Firebase selection, so variables alone
cannot activate push delivery.

## Rollback To Mock

Set `PUSH_PROVIDER=mock` and `PUSH_NOTIFICATION_ENABLED=false`, then restart/redeploy.
Deactivate staging device tokens and run in-app plus mock-push smoke tests.
