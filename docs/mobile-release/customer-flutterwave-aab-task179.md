# Task 179 - Customer Flutterwave AAB Note

Date: 2026-07-19

## Reason

Task 179 changes Customer App checkout from Squad/POD fallback to Flutterwave/POD launch checkout. The Play internal testing build should be refreshed so testers see:

- `Pay with Flutterwave`
- `Pay on Delivery`
- no customer-facing Squad checkout
- wallet balance/ledger visible but wallet top-up disabled

## Build Impact

Fresh Customer AAB required: yes.

Customer EAS Update is useful for quick copy/config rollout, but internal testing should receive a fresh AAB after this change because this is a launch-critical checkout behavior change.

No new native dependency was introduced by Task 179.

## Build Command

Run from PowerShell after pulling the committed update:

```powershell
cd C:\Users\zubai\OneDrive\Documents\KariGO\karigo-platform\apps\customer-app
npx eas-cli build --platform android --profile customer-production --non-interactive
```

## Artifact Recording Rules

Record only:

- EAS build ID
- build status
- versionCode
- package name
- upload track/status

Do not commit:

- AAB/APK files
- direct artifact URLs
- screenshots
- keystores
- credentials
- `.env` files

## Post-Build Smoke

1. Install/upload the new Customer AAB through Google Play internal testing.
2. Confirm package remains `com.karigo.customer`.
3. Open checkout and confirm Squad is hidden.
4. Confirm Flutterwave checkout opens externally.
5. Confirm Pay on Delivery creates a cash/POD order without opening any provider URL.
6. Confirm wallet top-up remains unavailable.
