# KariGO Domain And Service Health Check - Task 107

Date prepared: 2026-07-13

Use this checklist before approving any release-candidate distribution.

## Website

| Check | Expected result | Status | Notes |
| --- | --- | --- | --- |
| `https://www.karigo.com.ng` opens | Website loads successfully | Pending |  |
| `https://karigo.com.ng` redirects/works | Root domain works or redirects cleanly | Pending |  |
| Vendor application works | Application page loads and form behaviour is safe | Pending |  |
| Captain/Ride readiness copy is correct | Ride readiness only; no live rides claim | Pending |  |
| Contact/legal pages work | Contact, Privacy and Terms pages load | Pending |  |

## Admin Portal

| Check | Expected result | Status | Notes |
| --- | --- | --- | --- |
| `https://admin.karigo.com.ng` opens | Admin Portal loads | Pending |  |
| Admin login works | Approved admin can sign in | Pending |  |
| Orders visible | Orders list/detail available | Pending |  |
| Dispatch visible | Dispatch/assignment controls available | Pending |  |
| Captains visible | Delivery Captain management visible where expected | Pending |  |
| Wallet/referrals/SME sections visible | Admin readiness sections load | Pending |  |

## Vendor Dashboard

| Check | Expected result | Status | Notes |
| --- | --- | --- | --- |
| `https://vendor.karigo.com.ng` opens | Vendor Dashboard loads | Pending |  |
| Vendor login works | Approved vendor can sign in | Pending |  |
| Products visible | Vendor products load | Pending |  |
| Orders visible | Vendor orders load | Pending |  |
| Settlement visibility works | Read-only settlement area loads | Pending |  |

## Backend

| Check | Expected result | Status | Notes |
| --- | --- | --- | --- |
| `https://karigo-8htn.onrender.com/api/v1/health` returns OK | Health endpoint passes | Pending |  |
| Login endpoints respond | Customer/vendor/admin/Captain auth paths work | Pending |  |
| Order endpoints respond | Quote/create/detail paths work for staging users | Pending |  |
| Payment provider remains safe | Mock default or approved Paystack Test Mode only | Pending |  |
| No disabled live feature is active | Rides/utilities/SMS/payouts/Pharmacy remain disabled | Pending |  |

## Payment

| Check | Expected result | Status | Notes |
| --- | --- | --- | --- |
| Mock payment works | Customer can complete mock payment | Pending |  |
| Paystack Test Mode | Used only if explicitly configured and approved | Pending |  |
| Live Paystack disabled | No live payment collection | Pending |  |

## External Providers

| Provider | Required state | Status | Notes |
| --- | --- | --- | --- |
| Accelerate.ng | Live utility fulfilment disabled | Pending | Future integration only |
| Termii | Live SMS sending disabled | Pending | Future integration only |

## Signoff

| Field | Value |
| --- | --- |
| Checked by |  |
| Date/time |  |
| Result | Passed / Failed / Blocked |
| Issues |  |
| Approval note |  |

