# Task 145 - Sandbox Provider Initialization Verification

Date: 2026-07-16
Environment: KariGO staging / controlled sandbox payment verification

## Safety Position

- Default pilot payment mode: Mock payment.
- Live payment collection: Disabled.
- Wallet auto-credit, refunds, withdrawals and payouts: Disabled.
- Paystack, Monnify and Squad: Sandbox/test verification only.
- No provider secret values should appear in test evidence.

## Pre-Test Checklist

- Backend health responds at `/api/v1/health`.
- Admin Portal login works for Super Admin.
- Admin Payment Readiness page loads.
- `PAYMENTS_LIVE_ENABLED=false`.
- Provider credentials are stored only in Render environment variables.
- Customer App checkout can still complete with Mock payment.

## Admin Readiness Verification

1. Open Admin Portal.
2. Go to Payment Readiness.
3. Confirm providers are listed:
   - Mock payment
   - Monnify Sandbox
   - Paystack Test Mode
   - Squad Sandbox
4. Confirm missing keys are shown by name only.
5. Confirm no secret values are visible.
6. For each configured sandbox provider, click `Test sandbox initialization`.
7. Record:
   - provider;
   - mode;
   - success/failure;
   - stage;
   - provider HTTP status, if shown;
   - safe provider message;
   - timestamp.

## Expected Results

### Mock Payment

- Remains available as fallback.
- Does not require sandbox provider credentials.
- Customer checkout can complete through mock mode.

### Monnify Sandbox

Expected when configured correctly:

- initialization test succeeds;
- stage shows `initialize-transaction`;
- authorization URL present is `Yes`;
- no secret values are displayed.

If it fails:

- `config-read` means Render variables are missing/invalid.
- `auth-token` means Monnify authentication did not succeed.
- `initialize-transaction` means provider transaction creation failed after authentication.

### Paystack Test Mode

Expected when configured correctly:

- initialization test succeeds;
- stage shows `initialize-transaction`;
- authorization URL present is `Yes`;
- no secret values are displayed.

If it fails:

- review `PAYSTACK_MODE`, test secret key and callback URL setup.

### Squad Sandbox

Expected when configured correctly:

- initialization test succeeds;
- stage shows `initialize-transaction`;
- authorization URL present is `Yes`;
- no secret values are displayed.

If it fails:

- review `SQUAD_MODE`, sandbox secret key format and callback URL setup.

## Customer Checkout Verification

For each provider being tested:

1. Create a fresh customer order in staging.
2. Open checkout.
3. Confirm payment selector shows:
   - Mock payment
   - Monnify Sandbox
   - Paystack Test Mode
   - Squad Sandbox
4. Select the target sandbox provider.
5. Continue to payment.
6. Expected:
   - provider-hosted checkout starts when provider initialization succeeds;
   - safe failure message appears when provider initialization fails;
   - no order is marked paid until backend verification succeeds;
   - mock payment remains available.

## Evidence Template

| Field | Value |
| --- | --- |
| Test ID |  |
| Date/time |  |
| Tester |  |
| Provider |  |
| Mode |  |
| Admin readiness status |  |
| Initialization test result | Passed / Failed / Blocked |
| Failure stage | config-read / auth-token / initialize-transaction / provider-response / N/A |
| Safe provider message |  |
| Customer checkout result |  |
| Mock fallback confirmed | Yes / No |
| Secret values excluded from evidence | Yes / No |
| Reviewer approval |  |

## Closeout Criteria

- Admin Payment Readiness loads for Super Admin.
- Each configured sandbox provider either initializes successfully or shows a safe actionable failure stage.
- Customer App sends the selected provider and does not silently fall back to the wrong provider.
- Backend does not mark payment successful until verification.
- No secrets appear in logs, docs, screenshots or API responses.
- Mock payment remains the rollback option.
