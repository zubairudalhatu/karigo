# Vendor Dashboard Staging Test Checklist

Use approved staging accounts only. Do not record passwords, bearer tokens, customer
secrets, delivery OTPs, payout account numbers, or private financial notes in Git.

## Environment

- App: Vendor Dashboard
- API: `https://karigo-8htn.onrender.com/api/v1`
- Providers: mock only unless staging explicitly changes them.

## Checklist

| Check | Expected result | Status | Notes |
| --- | --- | --- | --- |
| Login works | Demo vendor owner can sign in | Pending | Use secure credential handover |
| Vendor session isolation | Vendor token does not open admin/customer/rider surfaces | Pending |  |
| Dashboard loads | Metrics and recent orders load | Pending |  |
| Orders load | Vendor sees only its own orders | Pending |  |
| Order actions work | Accept, preparing and ready actions follow valid workflow | Pending |  |
| Products page hierarchy | Products page shows `Vendor catalogue`, `Products`, supporting copy and prominent Add product action | Fixed | Task 51 header polish |
| Product option groups can be entered | Vendor can add option groups with required/optional state and min/max selections | Fixed | Stored as backend-managed product option groups |
| Product options can be entered | Vendor can add option names, integer kobo price adjustments and availability | Fixed | No client-side floating point price adjustments |
| Product options are ownership-scoped | Vendor can only create/update options through products owned by that vendor | Fixed | Backend checks authenticated vendor ownership before mutation |
| Existing products without options still work | Products with no option groups remain listed, editable and orderable | Pending | Options do not affect checkout yet |
| Settlements page loads | Vendor sees read-only settlement summary and list | Fixed | Uses `/api/v1/vendor/settlements` |
| Settlement ownership | Vendor cannot see another vendor's settlement records | Fixed | Backend filters by authenticated vendor profile |
| Settlement filters work | All, Pending and Paid filters return safe data | Fixed | No admin payout controls |
| Notification formatting | Title, message and timestamp display separately | Fixed | Long references wrap cleanly |
| Notification read behavior | Read one and mark-all-read still work | Pending |  |
| Sensitive data hidden | No delivery OTP, rider earnings, customer secrets or payment tokens appear | Fixed |  |

## Task 51 Product Options Notes

- Demo seed data includes example options for Jollof Rice, Chicken Suya and Household Cleaning Pack.
- Product option price adjustments are stored as integer kobo values.
- Current customer checkout/order totals are unchanged; option selections are a future checkout enhancement.
- Vendor Dashboard must not expose product options from another vendor account.
