# Task 139 SME Marketplace, Location, Ads and Fresh Customer APK Signoff

This checklist should be completed after the Task 139 QA closeout record and
issue register are updated with actual deployment and device evidence.

## Required Evidence

| Evidence item | Required before signoff | Status | Evidence reference |
| --- | --- | --- | --- |
| Backend redeploy completed | Yes | `Pending / Pass / Fail` |  |
| Prisma migration applied | Yes | `Pending / Pass / Fail` |  |
| Admin Portal redeployed | Yes | `Pending / Pass / Fail` |  |
| Vendor Dashboard redeployed | Yes | `Pending / Pass / Fail` |  |
| Fresh Customer APK built from `bc3af7a` or later | Yes | `Pending / Pass / Fail` |  |
| Fresh Customer APK installed on approved Android device | Yes | `Pending / Pass / Fail` |  |
| Customer App SME marketplace tests completed | Yes | `Pending / Pass / Fail` |  |
| Native location permission granted/denied paths tested | Yes | `Pending / Pass / Fail` |  |
| Admin Ads tests completed | Yes | `Pending / Pass / Fail` |  |
| Vendor Ads tests completed | Yes | `Pending / Pass / Fail` |  |
| Task 137 payment selector visible in checkout/retry | Yes | `Pending / Pass / Fail` |  |
| Privacy/access-control checks completed | Yes | `Pending / Pass / Fail` |  |
| Issue register reviewed | Yes | `Pending / Pass / Fail` |  |

## Go / No-Go Criteria

| Criterion | Go condition | Decision |
| --- | --- | --- |
| SME marketplace | Category provider listing, provider preference, saved/new address and request submission pass | `Go / No-Go / Conditional` |
| Location detection | Permission granted and denied flows are safe; manual address entry remains available | `Go / No-Go / Conditional` |
| Reviews | Customer can review only own completed assigned request, once | `Go / No-Go / Conditional` |
| Ads | Admin/Vendor ad flows work without live billing or payment activation | `Go / No-Go / Conditional` |
| Payment selector | Mock remains available/default; sandbox providers remain test-only | `Go / No-Go / Conditional` |
| Privacy | No private provider/customer/payment data exposed in app or evidence | `Go / No-Go / Conditional` |
| Deployment | Backend, migration, Admin Portal, Vendor Dashboard and fresh Customer APK are live/current | `Go / No-Go / Conditional` |

## Final Signoff

| Role | Name | Decision | Date/time | Notes |
| --- | --- | --- | --- | --- |
| QA tester |  | `Approved / Not approved` |  |  |
| Technical lead |  | `Approved / Not approved` |  |  |
| Operations lead |  | `Approved / Not approved` |  |  |
| Product owner |  | `Approved / Not approved` |  |  |

## Final Decision Record

| Item | Result |
| --- | --- |
| Task 139 closeout decision | `Pending / Closed - Passed / Closed - Passed with observation / Not closed - Fix required / Paused` |
| Remaining P0/P1 issues | `None / See issue register` |
| Fresh Customer APK distribution | `Approved / Not approved / Conditional` |
| Public launch implication | This record does not approve public production launch |
| Live provider implication | This record does not activate live payments, utilities, rides, payouts, Pharmacy, provider login or marketing messaging |
