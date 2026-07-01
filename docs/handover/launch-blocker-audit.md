# Launch Blocker Audit

## A. Critical Launch Blockers

These block a real-customer controlled soft launch. They do not block an internal demo.

| Issue title | Area | Severity | Status | Recommended fix | Owner/team | Launch impact |
| --- | --- | --- | --- | --- | --- | --- |
| Real payment/refund provider unavailable | Payments/finance | Critical | Open | Implement and certify Paystack sandbox/live flow, signed webhooks, refund reconciliation | Backend + Finance | Customers cannot make real payments safely |
| Real SMS OTP unavailable | Auth | Critical | Open | Integrate approved SMS provider, rate-limit OTP issue/resend, remove production OTP exposure | Backend + Operations | Production customer verification unavailable |
| Production infrastructure not configured | Platform/database | Critical | Open | Provision PostgreSQL, HTTPS/API hosting, secrets, CORS, backups, monitoring, restore rehearsal | DevOps | No resilient or secure production runtime |
| Dashboard session handling not hardened | Vendor/Admin web | High | Open | Replace browser-local JWT storage with secure cookie/BFF session design | Web + Backend | Public dashboard sessions are insufficiently hardened |
| Physical-device validation incomplete | Customer/Rider mobile | High | Open | Test supported devices, network loss, token expiry, keyboard/safe areas, crash monitoring | Mobile + QA | Mobile pilot reliability is unproven |
| Operational runbooks not approved/rehearsed | Operations | High | Open | Rehearse refund, dispatch escalation, support, payout, downtime, and recovery procedures | Operations + Finance + Support | Incidents may not be handled consistently |
| Security/privacy/legal review incomplete | Platform/business | High | Open | Complete access-control/security review and approve terms, privacy, refund, vendor/rider agreements | Security + Legal | Compliance and customer-risk exposure |

No critical technical blockers exist for the **internal mock-provider demo**: backend,
database, auth, mock payment, vendor workflow, dispatch, OTP completion, support, admin
dashboard, and access-control smoke checks pass.

## B. Important But Not Blocking

| Issue title | Area | Severity | Status | Recommended fix | Owner/team | Launch impact |
| --- | --- | --- | --- | --- | --- | --- |
| Vendor product management missing | Vendor | Medium | Open | Add scoped create/edit/availability endpoints and UI | Backend + Web | Operational catalogue changes require manual DB/admin work |
| Vendor/rider support missing | Support | Medium | Open | Generalize support ownership/routes | Backend + Frontend | Support must use offline/manual process |
| Vendor settlement view missing | Vendor | Medium | Open | Add read-only vendor settlement endpoint | Backend + Web | Vendor payout visibility is limited |
| Approval/suspension mutations missing | Admin | Medium | Open | Add audited admin account-status endpoints | Backend + Admin Web | Onboarding/status changes require manual process |
| Some report metrics are placeholders | Reports | Low | Open | Persist milestone timestamps and commission rules | Backend + Product | Reports are useful but not final finance analytics |
| Advanced filters/pagination limited | Admin/Vendor | Low | Open | Add pagination and richer query controls | Backend + Web | Manageability degrades at larger volume |
| Final visual/device QA incomplete | UI | Medium | Open | Perform human visual walkthrough on target browsers/devices | QA + Design | Minor usability defects may remain |

## C. Future Improvements

| Issue title | Area | Severity | Status | Recommended fix | Owner/team | Launch impact |
| --- | --- | --- | --- | --- | --- | --- |
| Real email/WhatsApp/push providers | Communications | Future | Planned | Follow `docs/providers/` roadmap | Backend + Operations | No launch block if operational fallback exists |
| Live/background GPS | Rider/dispatch | Future | Planned | Add consent-aware device tracking and maps | Mobile + Backend | Milestone-based dispatch remains usable |
| Loyalty/wallet/advanced campaigns | Customer retention | Future | Excluded | Reassess after pilot evidence | Product | Intentionally outside MVP |
| Advanced analytics/charts | Admin | Future | Planned | Add after stable data volume | Data + Web | Not required for pilot |
| App-store build automation | Mobile delivery | Future | Planned | Add EAS/CI signing pipeline | Mobile + DevOps | Required before store distribution |

## Decision

- **Internal demo:** Ready.
- **Controlled soft launch with real customers:** Not ready; critical blockers remain.
- **Public launch:** Not ready.
