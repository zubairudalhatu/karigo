# Task 140 - Payment Provider, Ad Billing and AdMob Verification

## Scope

Use this checklist after deploying the Task 140 backend and Customer App changes.

Do not activate live Paystack, live Monnify, live Squad, live wallet top-up,
automatic refunds, live ad billing, live rides, payouts, Accelerate.ng utilities,
Pharmacy marketplace or marketing/bulk messaging.

## Payment Verification

| Test ID | Scenario | Expected Result | Status | Evidence Reference |
| --- | --- | --- | --- | --- |
| `T140-PAY-001` | Select `Mock payment` and continue checkout | Order verifies through mock payment as before | `Pending / Pass / Fail` |  |
| `T140-PAY-002` | Select Paystack Test Mode for a phone-first customer with no email | Backend initializes with a generated sandbox email or returns a safe provider/configuration message | `Pending / Pass / Fail` |  |
| `T140-PAY-003` | Paystack variables missing or incomplete | Customer sees clear Paystack startup failure and can switch to mock payment | `Pending / Pass / Fail` |  |
| `T140-PAY-004` | Select Monnify Sandbox for a phone-first customer with no email | Backend initializes with a generated sandbox email or returns a safe provider/configuration message | `Pending / Pass / Fail` |  |
| `T140-PAY-005` | Select Squad Sandbox for a phone-first customer with no email | Backend initializes with a generated sandbox email or returns a safe provider/configuration message | `Pending / Pass / Fail` |  |
| `T140-PAY-006` | Provider authorization succeeds | Customer is sent to the backend-returned HTTPS checkout URL and must tap `Verify payment status` after returning | `Pending / Pass / Fail` |  |
| `T140-PAY-007` | Provider verification fails or is cancelled | Order remains unpaid; customer can retry safely | `Pending / Pass / Fail` |  |
| `T140-PAY-008` | Provider initialization fails while notification write is unavailable | Backend returns the safe provider error, not generic internal server error | `Pending / Pass / Fail` |  |

## Ad Billing Verification

| Test ID | Scenario | Expected Result | Status | Evidence Reference |
| --- | --- | --- | --- | --- |
| `T140-ADS-001` | Vendor submits ad request | Campaign appears as submitted; no real payment action appears | `Pending / Pass / Fail` |  |
| `T140-ADS-002` | Admin grants controlled ad credit | Vendor ad credit balance increases; no wallet/payment provider charge occurs | `Pending / Pass / Fail` |  |
| `T140-ADS-003` | Admin reserves ad credit on campaign | Reserved balance increases only within available controlled credit | `Pending / Pass / Fail` |  |
| `T140-ADS-004` | Admin rejects/cancels/expires campaign | Reserved credit is released | `Pending / Pass / Fail` |  |
| `T140-ADS-005` | Active approved ad appears on Customer home | Ad is labelled `Ad`; checkout pricing is unchanged | `Pending / Pass / Fail` |  |
| `T140-ADS-006` | No active managed ad is available | App shows safe fallback/no ad; AdMob is not called | `Pending / Pass / Fail` |  |

## AdMob Fallback Verification

Current expected result:

```text
AdMob inactive.
No AdMob SDK, ad unit ID, app ID, API key, native dependency or live ad request is required for this task.
```

Future AdMob testing requires a separately approved task and fresh APK.

## Evidence Rules

- Do not record provider secret keys, webhook secrets, card details, OTPs,
  passwords, bearer tokens or private API payloads.
- Mask customer phone numbers, private addresses and private ad contacts.
- Do not paste real AdMob IDs or private dashboard screenshots into Git.

## Closeout Decision

| Area | Decision |
| --- | --- |
| Mock payment fallback | `Pending / Pass / Fail` |
| Paystack Test Mode | `Pending / Pass / Fail / Blocked by credentials` |
| Monnify Sandbox | `Pending / Pass / Fail / Blocked by credentials` |
| Squad Sandbox | `Pending / Pass / Fail / Blocked by credentials` |
| Controlled ad credit flow | `Pending / Pass / Fail` |
| AdMob fallback plan | `Documented / Not documented` |
| Live provider activation | `Not activated` |
