# Task 199 - Partner App Operations QA Checklist

## Scope

Verify the KariGO Partner App controlled operations foundation after deployment/update.

## Preconditions

- Partner account is approved and can log into KariGO Partner.
- Partner profile is linked to a valid vendor/partner record.
- Backend API is healthy.
- No production secrets, payout credentials or build artifacts are recorded in QA evidence.

## Test Cases

### 1. Session And Profile Load

- Log in with an approved partner account.
- Confirm Dashboard loads Partner profile, order summary, products and services.
- Confirm demo/test or closed profile warnings appear only for unsafe records.

Expected result: approved partner lands on Dashboard without read-only/missing-profile errors.

### 2. Go Online / Offline

- On Dashboard, tap `Go Offline`.
- Refresh Dashboard and confirm status shows `Offline`.
- Tap `Go Online`.
- Refresh Dashboard and confirm status shows `Online`.

Expected result: availability changes without logging out or changing account approval status.

### 3. Add Product

- Open Products.
- Tap `Add product`.
- Enter product name, description, category, product category, price and an approved HTTPS image URL.
- Save product.

Expected result: product is created and appears in Products list.

### 4. Edit Product

- Open an existing product from Products.
- Update name/description/price or category.
- Save product.

Expected result: product changes persist after refresh.

### 5. Product Availability

- From Products list, mark an available product unavailable.
- Mark it available again.

Expected result: product availability badge updates and backend state persists.

### 6. Edit Partner Profile

- Open Profile.
- Tap `Edit partner profile`.
- Update allowed business/contact/display fields.
- Save profile.

Expected result: updated profile details appear on Profile and Dashboard after refresh.

### 7. Earnings And Settlements

- Open Earnings.
- Confirm total settlements, pending payout and paid-out metrics load.
- Switch `All`, `Pending`, and `Paid` filters.

Expected result: settlement data displays safely and no payout action is triggered.

### 8. Payout Account

- Open Payout account from Profile or Earnings.
- Add or update account name, bank name, optional bank code, account number and confirmation.
- Submit details.

Expected result: payout account is submitted for verification and masked account details display after refresh. No money is sent.

## Guardrail Checks

- No automated payout button appears.
- No wallet withdrawal or cash-out action appears.
- No service dispatch action appears.
- Service catalogue remains read-only in mobile.
- Product image upload is not introduced in mobile; only HTTPS image URL entry is accepted.
- Partner App does not call Admin payout-account endpoints.

## Result

Status: Ready for staging QA after Partner EAS Update.
