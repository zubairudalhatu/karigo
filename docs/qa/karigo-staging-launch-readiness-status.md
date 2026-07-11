# KariGO Staging Launch Readiness Status

Assessment date: 10 July 2026
Assessment type: Read-only staging QA plus local validation
Related files:

- `docs/qa/karigo-full-platform-staging-qa-report.md`
- `docs/qa/karigo-staging-issue-register.md`
- `docs/qa/full-platform-launch-readiness-checklist.md`
- `docs/operations/karigo-known-limitations-and-prelaunch-risks.md`

## Overall Status

Current recommendation: Not ready for controlled soft launch signoff yet, but branded Admin/Vendor domain blockers are resolved.

KariGO is suitable for continued internal staging review using the branded Admin and Vendor domains. Full mobile QA and credentialed role-flow evidence must still be completed before controlled soft launch approval.

## Readiness Matrix

| Category | Status | Reason |
|---|---|---|
| Backend runtime | Ready for staging QA | Health endpoint and Swagger are reachable; local backend typecheck passed. |
| Public website | Ready for public review | Primary website pages load and readiness-gated services are clearly marked. |
| Admin Portal fallback URL | Ready for credentialed QA | Fallback URL loads; credentialed login was not executed in this pass. |
| Vendor Dashboard fallback URL | Ready for credentialed QA | Fallback URL loads; credentialed login was not executed in this pass. |
| Admin custom domain | Ready for branded-domain QA | Admin Portal loads correctly, backend CORS allows the origin, and authenticated dashboard reachability is confirmed. |
| Vendor custom domain | Ready for branded-domain QA | Vendor Dashboard loads correctly, backend CORS allows the origin, and authenticated dashboard reachability is confirmed. |
| Customer App | Blocked pending device QA | Typecheck passed; live APK/customer account journey not executed in this pass. |
| Rider App | Blocked pending device QA | Typecheck passed; live APK/rider account journey not executed in this pass. |
| Demo accounts | Documented, pending secure credential confirmation | Account personas and phone numbers are documented without password values. |
| Food/Grocery/Market catalogue | Ready for staging QA | Active vendors/products are returned from public API. |
| Parcel Delivery | Pending credentialed app QA | Public website marks parcel delivery live, but customer parcel flow still requires credentialed app evidence. |
| SME Services | Pending credentialed app QA | Service-provider request foundation is available in staging; health professional booking remains readiness-only. |
| Bills & Utilities | Test-mode ready only | Demo providers are visible; live fulfilment remains intentionally inactive. |
| Taxi | Readiness/staging only | Public website marks Taxi coming soon; no live Taxi activation. |
| Pharmacy | Readiness only | Discovery API marks Pharmacy disabled; no public live Pharmacy flow. |
| Live providers | Not active by design | Mock/staging mode remains the required default until provider approvals. |

## Go/No-Go Decision

| Decision Area | Recommendation |
|---|---|
| Internal technical review | Go, using fallback portal URLs and public website/API evidence. |
| Management demo on custom domains | Go for Admin/Vendor branded-domain review; full checklist evidence should still be recorded. |
| Full role-based staging QA | No-go until secure demo credentials and mobile test devices are used. |
| Controlled soft launch | No-go until mobile QA and full credentialed role-flow evidence are completed. |
| Public launch | No-go; live providers, legal/policy review and full role QA remain required. |

## Required Before Controlled Soft Launch

- Execute Customer App checklist with the current staging APK and secure demo customer.
- Execute Rider App checklist with the current staging APK and secure demo rider.
- Execute Vendor Dashboard role checklist for food, grocery and market vendors.
- Execute Admin Portal checklist including dispatch, settlements, support, utilities admin and Taxi readiness views.
- Record end-to-end order, mock payment, vendor acceptance, admin dispatch, rider completion and support evidence without exposing OTPs or credentials.

## Safe Paths For Continued Testing

- Backend API: `https://karigo-8htn.onrender.com/api/v1`
- Backend health check: `https://karigo-8htn.onrender.com/api/v1/health`
- Admin branded portal: `https://admin.karigo.com.ng`
- Vendor branded portal: `https://vendor.karigo.com.ng`
- Admin fallback portal: `https://karigo-admin-portal.vercel.app`
- Vendor fallback portal: `https://karigo-vendor-dashboard.vercel.app`
- Public website: `https://www.karigo.com.ng`

Do not store passwords, OTPs, access tokens, provider credentials or sensitive screenshots in Git.
