# Vendor Payout Account Staging Checklist

Use this checklist in staging only. Do not record real bank details, real account numbers, real customer information or secrets in QA notes.

## Backend API

- [ ] Vendor can create payout account.
- [ ] Vendor can retrieve only its own masked payout account summary.
- [ ] Vendor cannot retrieve another vendor's payout account.
- [ ] Vendor update resets status to `PENDING_VERIFICATION`.
- [ ] Vendor update clears verified admin, verified date, rejection reason and internal note.
- [ ] Admin can list payout accounts with masked account numbers.
- [ ] Admin detail endpoint shows full account number only for explicit review.
- [ ] Admin can verify account.
- [ ] Admin can reject only with vendor-visible note.
- [ ] Admin can request update only with vendor-visible note.
- [ ] Non-admin cannot review payout account.
- [ ] Audit log is created on admin review.
- [ ] Audit log does not contain full account number.
- [ ] Vendor notification is created on relevant status changes.

## Vendor Dashboard

- [ ] Empty state says the vendor can add a payout account.
- [ ] Create form validates account name, bank name and matching 10-digit account numbers.
- [ ] Pending state shows `KariGO is reviewing your payout account details.`
- [ ] Verified state shows bank name, account name, masked account number, verified badge and verified date.
- [ ] Rejected/needs-update state shows vendor-visible reason.
- [ ] No `Transfer funds`, `Pay now`, withdrawal or cash-out control appears.
- [ ] Masked account number is shown, not full account number.

## Admin Portal

- [ ] Sidebar includes `Payout Accounts`.
- [ ] Summary cards show pending review, verified accounts, needs update and rejected accounts.
- [ ] Table shows vendor, bank, masked account number, account name, status, submitted date and last updated date.
- [ ] Full account number appears only after opening review detail.
- [ ] Review actions require confirmation.
- [ ] Verify does not transfer money.
- [ ] Request update and reject require vendor-visible explanation.
- [ ] Internal note is not visible to vendors.

## Seed Data

- [ ] Kano Kitchen Vendor has a fictional verified payout account:
  - Bank name: `KariGO Demo Bank`
  - Account name: `Kano Kitchen Vendor`
  - Account number: fictional staging sample only
  - Status: `VERIFIED`

## Regression

- [ ] Existing vendor settlement history still loads.
- [ ] Existing admin mark-paid settlement workflow remains Admin-only.
- [ ] Vendor settlement cards do not expose full account numbers.
- [ ] Notifications do not expose sensitive bank data.
