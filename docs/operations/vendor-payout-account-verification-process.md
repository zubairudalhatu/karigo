# Vendor Payout Account Verification Process

This process prepares KariGO for future vendor settlement payments. It does not send money and does not connect to a live bank-transfer provider.

## 1. Vendor Submits Details

The vendor opens the Vendor Dashboard and selects `Payout account`.

The vendor enters:

- Account name
- Bank name
- Optional bank code
- Account number
- Confirm account number

After submission, the payout account status becomes `PENDING_VERIFICATION`.

## 2. Admin Reviews Details

An authorised admin opens Admin Portal > `Payout Accounts`.

The list page shows masked account numbers. The full account number appears only after the admin opens the individual review detail.

The admin may:

- Verify the account
- Request update
- Reject the account

`REJECTED` and `NEEDS_UPDATE` require a vendor-visible explanation.

## 3. Vendor Receives Status Update

The vendor receives an in-app notification for:

- Payout account submitted
- Payout account updated and awaiting verification
- Payout account verified
- Payout account needs update
- Payout account rejected

Notifications must never include account number, bank account name or sensitive financial details.

## 4. Meaning of Verified

`VERIFIED` means the payout account is ready for future manual or automated settlement processing.

It does not:

- Send money
- Trigger a bank transfer
- Mark any settlement paid
- Activate Paystack, Flutterwave or any other payout provider
- Give vendors a cash-out button

Payout execution remains Admin-controlled through the existing settlement workflow.

## 5. Admin Audit Requirements

Every admin review action creates an audit log entry containing:

- Admin user ID
- Entity type: `VendorPayoutAccount`
- Payout account ID
- Previous status
- New status
- Vendor ID

Audit logs must not contain full account numbers.

## 6. Future Provider Integration

Live payout-provider integration is a later phase. Before go-live, KariGO must add:

- Provider selection and sandbox testing
- Server-side bank validation
- Secure transfer recipient creation
- Transfer authorization and approval controls
- Webhook verification
- Reconciliation
- Rollback and incident process

Until then, payout-account verification is readiness only.
