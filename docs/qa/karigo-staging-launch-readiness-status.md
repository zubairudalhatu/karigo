# KariGO Staging Launch Readiness Status

Assessment date: 10 July 2026
Assessment type: Read-only staging QA plus local validation
Related files:

- `docs/qa/karigo-full-platform-staging-qa-report.md`
- `docs/qa/karigo-staging-issue-register.md`
- `docs/qa/full-platform-launch-readiness-checklist.md`
- `docs/operations/karigo-known-limitations-and-prelaunch-risks.md`

## Overall Status

Current recommendation: Not ready for controlled soft launch signoff yet.

KariGO is suitable for continued internal staging review using the Vercel fallback portals, but custom-domain portal readiness and full credentialed role QA must be completed before controlled soft launch approval.

## Readiness Matrix

| Category | Status | Reason |
|---|---|---|
| Backend runtime | Ready for staging QA | Health endpoint and Swagger are reachable; local backend typecheck passed. |
| Public website | Ready for public review | Primary website pages load and readiness-gated services are clearly marked. |
| Admin Portal fallback URL | Ready for credentialed QA | Fallback URL loads; credentialed login was not executed in this pass. |
| Vendor Dashboard fallback URL | Ready for credentialed QA | Fallback URL loads; credentialed login was not executed in this pass. |
| Admin custom domain | Partially ready | Page loads, but backend CORS must allow `https://admin.karigo.com.ng`. |
| Vendor custom domain | Not ready | Domain currently serves Admin Portal HTML instead of Vendor Dashboard HTML. |
| Customer App | Blocked pending device QA | Typecheck passed; live APK/customer account journey not executed in this pass. |
| Rider App | Blocked pending device QA | Typecheck passed; live APK/rider account journey not executed in this pass. |
| Demo accounts | Documented, pending secure credential confirmation | Account personas and phone numbers are documented without password values. |
| Food/Grocery/Market catalogue | Ready for staging QA | Active vendors/products are returned from public API. |
| Parcel/SME Errands | Pending credentialed app QA | Public website marks them live, but customer role flow was not executed here. |
| Bills & Utilities | Test-mode ready only | Demo providers are visible; live fulfilment remains intentionally inactive. |
| Taxi | Readiness/staging only | Public website marks Taxi coming soon; no live Taxi activation. |
| Pharmacy | Readiness only | Discovery API marks Pharmacy disabled; no public live Pharmacy flow. |
| Live providers | Not active by design | Mock/staging mode remains the required default until provider approvals. |

## Go/No-Go Decision

| Decision Area | Recommendation |
|---|---|
| Internal technical review | Go, using fallback portal URLs and public website/API evidence. |
| Management demo on custom domains | No-go until `vendor.karigo.com.ng` routing and custom-domain CORS are fixed. |
| Full role-based staging QA | No-go until secure demo credentials and mobile test devices are used. |
| Controlled soft launch | No-go until open high-severity deployment issues and blocked QA items are closed. |
| Public launch | No-go; live providers, legal/policy review and full role QA remain required. |

## Required Before Controlled Soft Launch

- Fix `vendor.karigo.com.ng` so it serves Vendor Dashboard, not Admin Portal.
- Add/confirm `https://admin.karigo.com.ng` and `https://vendor.karigo.com.ng` in backend staging CORS.
- Re-run admin/vendor login on both custom domains.
- Execute Customer App checklist with the current staging APK and secure demo customer.
- Execute Rider App checklist with the current staging APK and secure demo rider.
- Execute Vendor Dashboard role checklist for food, grocery and market vendors.
- Execute Admin Portal checklist including dispatch, settlements, support, utilities admin and Taxi readiness views.
- Record end-to-end order, mock payment, vendor acceptance, admin dispatch, rider completion and support evidence without exposing OTPs or credentials.

## Safe Paths For Continued Testing

- Backend API: `https://karigo-8htn.onrender.com/api/v1`
- Admin fallback portal: `https://karigo-admin-portal.vercel.app`
- Vendor fallback portal: `https://karigo-vendor-dashboard.vercel.app`
- Public website: `https://www.karigo.com.ng`

Do not store passwords, OTPs, access tokens, provider credentials or sensitive screenshots in Git.
