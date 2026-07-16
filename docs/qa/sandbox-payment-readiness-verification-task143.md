# Task 143 - Sandbox Payment Readiness Verification

## Purpose

Use this checklist after Render sandbox payment variables are configured and the
backend is redeployed.

## Environment

| Item | Value |
| --- | --- |
| Backend base | `https://karigo-8htn.onrender.com` |
| API base | `https://karigo-8htn.onrender.com/api/v1` |
| Admin Portal | `https://admin.karigo.com.ng` |
| Default safe fallback | `Mock payment` |
| Live payments | `Disabled` |

## Verification Sequence

1. Confirm backend health:

```text
GET /api/v1/health
```

2. Open Admin Portal Payment Readiness:

```text
/payment-readiness
```

3. Confirm the selected sandbox provider shows `READY` or clearly lists missing
   variables.

4. Confirm mock payment remains available.

5. Run Customer App checkout with one provider at a time:

- Mock payment works.
- Monnify Sandbox starts if configured.
- Paystack Test Mode starts if configured.
- Squad Sandbox is optional and may remain blocked.

6. Confirm server-side verification:

- no order is marked paid until backend verification or verified webhook succeeds;
- amount, currency and reference mismatch are rejected;
- duplicate verification/webhook does not duplicate payment transitions.

## Readiness Checks

| Test ID | Check | Expected Result | Status | Evidence |
| --- | --- | --- | --- | --- |
| `T143-HEALTH-001` | Backend health | `/api/v1/health` returns healthy | `Pending / Pass / Fail` |  |
| `T143-ADMIN-001` | Admin page access | Payment Readiness page loads for Admin | `Pending / Pass / Fail` |  |
| `T143-ADMIN-002` | Secret safety | Page shows only configured/missing status, no values | `Pending / Pass / Fail` |  |
| `T143-MOCK-001` | Mock checkout | Mock payment starts and verifies successfully | `Pending / Pass / Fail` |  |
| `T143-MONNIFY-001` | Monnify readiness | Monnify shows ready after required variables are set | `Pending / Pass / Fail / Blocked` |  |
| `T143-MONNIFY-002` | Monnify checkout | Hosted checkout starts and backend verification controls paid status | `Pending / Pass / Fail / Blocked` |  |
| `T143-PAYSTACK-001` | Paystack readiness | Paystack shows ready after required variables are set | `Pending / Pass / Fail / Blocked` |  |
| `T143-PAYSTACK-002` | Paystack checkout | Hosted checkout starts and backend verification controls paid status | `Pending / Pass / Fail / Blocked` |  |
| `T143-SQUAD-001` | Squad readiness | Squad shows ready or remains intentionally deferred | `Pending / Pass / Fail / Deferred` |  |
| `T143-ROLLBACK-001` | Mock rollback | Setting provider back to mock restores safe checkout | `Pending / Pass / Fail` |  |

## Evidence Rules

Record only:

- provider name;
- readiness status;
- safe missing variable names;
- masked order/payment references;
- generic provider dashboard status without secrets.

Do not record:

- secret keys;
- webhook secrets;
- test card numbers;
- provider tokens;
- customer full personal details;
- screenshots that display sensitive provider dashboard data.

## Launch Priority

```text
1. Monnify
2. Paystack
3. Squad later
```

Squad may remain disabled for launch if Monnify and/or Paystack are ready.

## Current Result

```text
Pending operator configuration. Payment readiness UI and verification checklist
are ready for controlled sandbox testing.
```
