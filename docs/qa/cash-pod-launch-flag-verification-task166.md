# Task 166 - Cash/POD Launch Flag Verification

## Objective

Verify Cash / Pay on Delivery visibility after setting the launch flag.

## Required Environment State

```text
CASH_ON_DELIVERY_ENABLED=true
WALLET_TOP_UP_ENABLED=false
WALLET_PAYMENTS_ENABLED=false
```

Do not add secrets to Git or screenshots.

## Verification Checklist

- Backend health responds at `/api/v1/health`.
- Admin Payment Readiness loads for Super Admin.
- Cash / Pay on Delivery shows as enabled.
- Launch cities show Kano and Abuja.
- Customer selectable shows Yes.
- Admin reconciliation available shows Yes.
- Captain cash collection confirmation available shows Yes.
- Vendor visibility available shows Yes.
- Wallet top-up shows disabled.
- Wallet payments show disabled.
- Customer App checkout shows Pay with Squad and Pay on Delivery.
- Customer App checkout does not show Pay from Wallet when wallet flags are false.
- Cash/POD order can be created without marking it electronically paid.
- Vendor Dashboard shows Cash/POD status only on Cash/POD orders.
- Captain App requires cash collection confirmation before OTP completion on Cash/POD jobs.
- Admin Orders detail shows reconciliation note field and reconciliation action for Cash/POD orders.
- Cash reconciliation does not trigger payout automation.

## Expected Customer Copy

```text
Pay on Delivery
Pay cash to the assigned KariGO Captain/vendor at delivery.
Please pay only the amount shown in the app.
```

## Evidence Fields

Record:

- Tester name:
- Date:
- Backend commit:
- Admin Portal commit:
- Customer update/build:
- Captain update/build:
- Cash/POD order number:
- Vendor Dashboard result:
- Captain completion result:
- Admin reconciliation result:
- Issues found:
- Go/Pause decision:
