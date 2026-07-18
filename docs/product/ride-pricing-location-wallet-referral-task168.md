# Task 168 - Ride Pricing, Location, Wallet and Referral Notes

## Ride Pricing Foundation

Default launch pricing values:

- Passenger charge: NGN 400 per kilometer
- Waiting charge: NGN 5 per minute after the first 5 minutes
- KariGO commission from Captain: 10 percent of ride cost
- VAT/tax line: configured value only; default is zero
- Launch cities: Kano and Abuja

Backend fare estimates include:

- distance fare
- billable waiting minutes
- waiting charge
- estimated payable fare
- KariGO commission estimate
- Captain net estimate
- formula and pricing metadata for Admin visibility

KariGO Rides remains controlled by operations flags. This pricing foundation does not activate public ride dispatch or ride payment.

## Location Behavior

Customer App:

- Saved addresses can capture approximate foreground device location when the customer chooses `Use current location`.
- SME Services new service address flow can capture approximate foreground device location.
- Manual address entry remains required and supported if GPS permission is denied.

Captain App:

- Location is requested only when a Captain goes online or manually updates live location while online.
- Backend rejects Captain location updates unless the Captain is online or on delivery.
- No offline tracking is implemented.

## Wallet Behavior

- Customer Wallet balance and ledger remain backend-authoritative.
- Wallet top-up UI is shown only when backend public payment config reports `walletTopUpEnabled=true`.
- Squad wallet top-up opens externally and credits only after backend verification/webhook confirmation.
- Wallet order payment remains disabled unless `walletPaymentsEnabled=true`.
- Withdrawals, automatic refunds, referral rewards and subscription billing remain disabled.

## Referral Behavior

- Customers can view/share referral codes where backend referral APIs are available.
- Referral rewards remain approval-controlled.
- No wallet credit, airtime/data, promo code, subscription, SMS, email, WhatsApp or push reward is issued from the customer referral screen.

## Privacy and Security

Customer Profile now includes a Privacy and Security section with support-managed password/account actions, public Privacy/Terms links, security tips and a clear biometric-not-enabled note.
