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
| Settlements page loads | Vendor sees read-only settlement summary and list | Fixed | Uses `/api/v1/vendor/settlements` |
| Settlement ownership | Vendor cannot see another vendor's settlement records | Fixed | Backend filters by authenticated vendor profile |
| Settlement filters work | All, Pending and Paid filters return safe data | Fixed | No admin payout controls |
| Notification formatting | Title, message and timestamp display separately | Fixed | Long references wrap cleanly |
| Notification read behavior | Read one and mark-all-read still work | Pending |  |
| Sensitive data hidden | No delivery OTP, rider earnings, customer secrets or payment tokens appear | Fixed |  |
