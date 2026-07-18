# Cash/POD and Wallet Verification - Task 165

Use this checklist after backend, Admin Portal, Vendor Dashboard, Customer App and KariGO Captain deployments.

## Customer Checkout

- Confirm `/api/v1/payments/public-config` returns launch flags for Squad, Cash/POD and wallet.
- Confirm checkout shows:
  - Pay with Squad
  - Pay on Delivery / Cash
  - Pay from Wallet only when balance is sufficient
- Confirm Cash/POD order creates without opening Squad checkout.
- Confirm Cash/POD order detail shows `CASH_PENDING` and the "Please pay only the amount shown in the app" warning.
- Confirm wallet order payment fails safely with insufficient balance.
- Confirm wallet-paid order is paid only after server-side debit.

## Wallet Top-Up

- Open Customer App wallet screen.
- Initiate Squad wallet top-up.
- Confirm pending ledger entry exists.
- Complete provider checkout and run backend verification.
- Confirm wallet balance changes only after backend verification or webhook.
- Confirm failed/cancelled top-up does not credit wallet.

## Vendor Dashboard

- Confirm Cash/POD orders show payment method and amount to collect.
- Confirm Cash/POD orders are not labelled electronically paid.
- Confirm wallet-paid and Squad-paid orders remain clear.

## KariGO Captain

- Confirm Cash/POD job shows amount to collect.
- Confirm complete delivery is blocked until cash collected is confirmed.
- Confirm OTP is still required.
- Confirm cash collected timestamp and Captain ID are recorded after completion.

## Admin Portal

- Confirm orders list/detail show payment method and cash status.
- Confirm Admin can mark cash reconciled only with a note.
- Confirm reconciliation does not trigger payout automation.
- Confirm Admin wallet ledger shows top-ups, wallet payments and manual refund credits.

## Safety

- No secrets, payment keys, customer OTPs, screenshots, APKs or `.env` files should be committed.
- Marketing and bulk messaging controls are readiness flags only.
- Passwordless login remains disabled unless the explicit readiness flag is enabled and app support is separately approved.
