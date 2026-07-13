# Task 112 Termii OTP And Resend Account Activation Test Plan

## Purpose

Use this plan to verify controlled real OTP and account activation notifications before
the Kano pilot. Evidence must be redacted and stored without secrets, OTP values, full
phone numbers, access tokens or private customer data.

## Preconditions

- Staging/pilot backend is separate from production.
- Payment mode remains mock payment.
- `EMAIL_PROVIDER=mock` remains configured.
- Termii credentials are stored only in the secret manager.
- Resend credentials are stored only in the secret manager.
- Approved test phone numbers and test email inboxes are controlled by the KariGO team.

## Test Cases

### A. Local Phone Registration

1. Register with a valid `080...` test number.
2. Confirm backend stores and uses the normalized `+234...` format.
3. Repeat with approved `081...`, `070...`, `090...`, `091...`, `234...`, and `+234...`
   fixtures.
4. Confirm invalid prefixes and malformed numbers are rejected.

### B. Termii OTP Delivery

1. Set `OTP_PROVIDER=termii` and `SMS_PROVIDER=termii`.
2. Register a new test customer.
3. Confirm no OTP is returned in the API response.
4. Confirm Termii accepts the OTP request.
5. Confirm logs do not contain OTP values or API keys.

### C. Resend OTP

1. Request resend before cooldown and confirm the cooldown response.
2. Request resend after cooldown.
3. Confirm the old OTP is invalidated.
4. Confirm the replacement OTP is sent through Termii.
5. Verify only the new OTP, without recording the code in evidence.

### D. Account Activation Email

1. Configure `ACCOUNT_ACTIVATION_EMAIL_ENABLED=true`.
2. Configure `ACCOUNT_ACTIVATION_EMAIL_PROVIDER=resend`.
3. Keep `EMAIL_PROVIDER=mock`.
4. Verify a valid OTP.
5. Confirm the account becomes active.
6. Confirm Resend receives only the account activation email.
7. Confirm no order, support, marketing or promotional email is sent.

### E. Provider Failure Safety

1. Simulate Termii failure and confirm the OTP is invalidated.
2. Confirm account activation does not occur after failed OTP delivery.
3. Simulate Resend failure after successful OTP verification.
4. Confirm the account remains active and the user can log in.
5. Confirm the failure is logged without recipient exposure beyond masking.

## Evidence Fields

| Field | Record |
| --- | --- |
| Test ID | `[AUTH-112-###]` |
| Date/time |  |
| Environment | `Staging / Pilot` |
| Phone fixture | `Masked only` |
| Email fixture | `Masked only` |
| Provider state | `Termii / Resend / Mock rollback` |
| Expected result |  |
| Actual result |  |
| Status | `Passed / Failed / Blocked` |
| Evidence reference | `Redacted external evidence only` |
| Reviewer |  |

## Do Not Record

- OTP values.
- Termii API keys or sender secrets.
- Resend API keys or sender-domain verification details.
- Full phone numbers.
- Private customer addresses.
- Authorization or session tokens.
- Provider dashboard screenshots containing sensitive data.
