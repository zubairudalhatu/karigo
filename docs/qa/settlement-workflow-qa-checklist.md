# Settlement Workflow QA Checklist

Use staging data only. Do not record real bank details, payout references, customer
secrets, delivery OTPs, bearer tokens, or production financial information in Git.

## Admin Flow

| Check | Expected result | Status | Notes |
| --- | --- | --- | --- |
| Vendor settlement record exists | Completed eligible vendor order creates settlement | Pending |  |
| Admin settlement list loads | Admin can view vendor settlements | Pending | Existing admin route preserved |
| Admin mark-paid works | Authorized admin can mark pending vendor settlement paid | Pending | Existing admin action preserved |
| Settlement notification created | Vendor receives settlement-paid notification | Pending |  |
| Repeat mark-paid is safe | Already-paid settlement is not duplicated | Pending |  |

## Vendor Read-Only Flow

| Check | Expected result | Status | Notes |
| --- | --- | --- | --- |
| Vendor settlement page loads | Summary cards and settlement list render | Fixed |  |
| Pending filter works | Only pending settlements show | Fixed |  |
| Paid filter works | Only paid settlements show | Fixed |  |
| Empty state is friendly | "No settlements yet. Completed and eligible orders will appear here." | Fixed |  |
| No admin controls | Vendor cannot mark paid or edit payouts | Fixed |  |
| Ownership enforced | Vendor A cannot retrieve Vendor B settlement records | Fixed | Backend `vendorId` scoped |
| Sensitive data hidden | No rider earnings, customer secrets, OTPs, payment tokens or admin notes | Fixed |  |
