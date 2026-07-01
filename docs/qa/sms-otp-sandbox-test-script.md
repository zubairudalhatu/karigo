# SMS OTP Sandbox Test Script

Run only in approved staging with sandbox credentials held outside Git. Never record an
OTP, API key, sender detail, full phone number, or sensitive provider screenshot.

## Preconditions

- `MDR-009` and Security/Operations/Engineering approval are recorded.
- Staging is separate from development and production.
- An approved Termii sandbox account, sender ID, and masked test phone are available.
- Mock rollback has been tested before activation.
- Backend build and focused OTP tests pass.

## A. Successful Registration OTP

1. Submit valid customer registration details using an approved test number.
2. Confirm the backend normalizes the number to international Nigerian format.
3. Confirm an active hashed OTP record is created with expiry and zero attempts.
4. Confirm the sandbox provider accepts the send request without logging the OTP.
5. Confirm delivery using provider evidence stored outside Git.
6. Submit the received OTP without recording it.
7. Confirm verification succeeds and the OTP record is consumed.
8. Confirm the customer becomes verified/active and can log in.

## B. Invalid OTP

1. Submit an intentionally incorrect code.
2. Confirm the request is rejected with a friendly error.
3. Confirm the failed-attempt counter increments.
4. Confirm the account remains unverified and login remains blocked.

## C. Expired OTP

1. Create an OTP in an isolated staging test.
2. Wait for expiry or use an approved test fixture that changes time/state safely.
3. Submit the expired code.
4. Confirm rejection and clear resend guidance.
5. Confirm the account remains unverified.

## D. Maximum Attempt Limit

1. Submit invalid codes up to the configured limit.
2. Confirm each failed attempt increments the counter.
3. Confirm subsequent verification is blocked at the limit.
4. Confirm the response provides safe next-step guidance without revealing code details.

## E. Resend OTP

1. Request resend immediately and confirm HTTP 429/cooldown behavior.
2. Wait for the configured cooldown and request again.
3. Confirm the previous active OTP is invalidated.
4. Confirm the replacement is sent through the selected sandbox provider.
5. Confirm the old code fails and the new code verifies successfully.

## F. Phone Number Normalization

Use approved test fixtures, never real phone data in committed evidence. Verify supported
shapes beginning `080`, `070`, `081`, `090`, `+234`, and `234` normalize consistently to
`+234XXXXXXXXXX`. Confirm malformed, short, and unsupported-prefix values are rejected.

## G. Provider Failure

1. Use an approved timeout/failure fixture; do not disable unrelated security controls.
2. Confirm a friendly service-unavailable response.
3. Confirm the newly generated OTP is invalidated and not falsely marked delivered.
4. Confirm the account remains unverified.
5. Restore `OTP_PROVIDER=mock` and `SMS_PROVIDER=mock`, restart, and run mock verification.

## Security Assertions

- Registration and resend responses contain no OTP in staging/Termii mode.
- Normal application and provider logs contain no OTP, API key, sender detail, or token.
- Provider failure cannot activate an account.
- Expired, replaced, or attempt-limited OTPs cannot verify an account.
- No test evidence contains a full phone number.
