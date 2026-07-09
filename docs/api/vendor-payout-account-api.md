# Vendor Payout Account API

Task 52 adds payout-account readiness endpoints under `/api/v1`. These endpoints do not initiate bank transfers, withdrawals or automated payout-provider actions.

## Vendor Endpoints

All vendor routes require a vendor JWT.

### GET `/api/v1/vendor/payout-account`

Returns the authenticated vendor's current payout account summary, or `null` if none exists.

Returned data is masked and safe for the Vendor Dashboard:

- Payout account ID
- Account name
- Bank name
- Optional bank code
- Masked account number, for example `**** **** 0201`
- Status
- Submitted date
- Verified date, when available
- Vendor-visible note

The full account number is not returned.

### POST `/api/v1/vendor/payout-account`

Creates the vendor's payout account if one does not already exist.

Required body:

```json
{
  "accountName": "Kano Kitchen Vendor",
  "bankName": "KariGO Demo Bank",
  "bankCode": "KGO",
  "accountNumber": "0000000201",
  "confirmAccountNumber": "0000000201"
}
```

Rules:

- Account name and bank name are required.
- Account number must be numeric and use a Nigerian 10-digit format.
- Account number and confirmation must match.
- New payout accounts are set to `PENDING_VERIFICATION`.

### PATCH `/api/v1/vendor/payout-account`

Updates the vendor's existing payout account.

Rules:

- Only the authenticated vendor's account can be updated.
- Updating details resets status to `PENDING_VERIFICATION`.
- `verifiedAt`, `verifiedByAdminId`, `rejectionReason` and `internalNote` are cleared.
- A vendor notification is created without account-number details.

## Admin Endpoints

All admin routes require an admin JWT with one of:

- `SUPER_ADMIN`
- `OPERATIONS_ADMIN`
- `FINANCE_OFFICER`
- `VENDOR_MANAGER`

### GET `/api/v1/admin/vendor-payout-accounts`

Lists payout accounts for review. The list never returns full account numbers.

Supported filters:

- `status=PENDING_VERIFICATION`
- `status=VERIFIED`
- `status=REJECTED`
- `status=NEEDS_UPDATE`
- `vendorId=<uuid>`
- `search=<text>`

Returned data includes summary counts and list items with masked account numbers only.

### GET `/api/v1/admin/vendor-payout-accounts/:payoutAccountId`

Returns one payout account for explicit admin review.

This is the only endpoint that returns the full account number. It also returns vendor identity, current status, timestamps, admin review history and admin-only note fields.

### PATCH `/api/v1/admin/vendor-payout-accounts/:payoutAccountId/review`

Reviews a payout account.

Body:

```json
{
  "status": "VERIFIED",
  "vendorVisibleNote": "Your payout account has been verified.",
  "internalNote": "Reviewed against submitted vendor documentation."
}
```

Rules:

- Allowed review statuses: `VERIFIED`, `REJECTED`, `NEEDS_UPDATE`.
- `REJECTED` and `NEEDS_UPDATE` require a vendor-visible note.
- `VERIFIED` sets `verifiedAt` and `verifiedByAdminId`.
- Review creates an admin audit log without full account numbers.
- Review creates a vendor notification without sensitive bank data.
- Review does not send money or mark settlements paid.

## Privacy Rules

- Vendor and broad admin list responses return only masked account numbers.
- Full account number is available only on the admin detail review endpoint.
- Account numbers must not appear in notifications, audit metadata, logs or screenshots.
- Settlement mark-paid remains a separate Admin-only workflow.
