# Customer Web Portal and Partner Workspace Launch Polish QA - Task 193

## Scope

Task 193 is a launch-polish pass for the Task 192 Customer Web Portal and unified Partner Workspace onboarding flow.

Routes checked:

- `https://www.karigo.com.ng/app`
- `https://www.karigo.com.ng/sme-services/apply`
- `https://vendor.karigo.com.ng/register`
- Admin Vendor Applications
- Admin SME Services / Provider Applications / Provider Directory

## Customer Web Portal Polish Checks

- `/app` remains the public Customer Web Portal route.
- Returning customers with a stored browser session see a loading state while the secure session is restored.
- The unauthenticated portal uses public-facing copy: `Available on web`.
- Internal `Phase 1` / `Phase 2` wording is not shown on the live portal.
- Food/grocery checkout remains directed to the mobile app.
- KariGO Rides remains readiness-only.
- Wallet top-up opens hosted checkout externally and credits only after backend verification.
- Wallet top-up reference handling supports provider aliases such as `transactionReference`, `reference`, and `paymentReference`.
- If the hosted checkout window is blocked, the portal shows a safe retry message.
- Authenticated dashboard includes `Refresh` and `Log out` actions.
- Error messages include a controlled `Retry` action.
- Long wallet/order/utility references wrap cleanly on mobile.

## Partner Workspace Polish Checks

- `/sme-services/apply` points service providers to the Partner Workspace registration path.
- `/sme-services/apply` no longer exposes internal fallback wording.
- Partner Workspace `/register` shows:
  - Product Seller
  - Service Provider
  - Both
- Partner registration guardrails confirm registration does not activate dispatch, payouts, legal advice automation, vehicle rental contracts, pharmacy marketplace access or public provider contact sharing.
- Partner Workspace login and shell continue to use Partner Workspace copy.

## SME Services Category Checks

Confirm customer/admin/partner surfaces still show the expanded SME Services categories:

- Printing
- Car Hire
- Laundry
- Lesson Teacher
- Legal Practitioner
- Rent a Car

Legal Practitioner remains coordination-only:

```text
Request a verified legal practitioner. KariGO will review and coordinate availability.
```

Car Hire and Rent a Car remain coordination-only and do not activate instant ride dispatch, vehicle rental contracts or automatic payments.

## Validation Result Template

| Area | Expected result | Result | Notes |
| --- | --- | --- | --- |
| Customer Web Portal loads | `/app` opens and renders auth/dashboard state | Pending |  |
| Stored session restore | Loading state appears before dashboard, not login flicker | Pending |  |
| Wallet top-up | External checkout opens; backend verification required | Pending |  |
| Utilities | Safe quote/transaction flow remains backend-controlled | Pending |  |
| SME request | Expanded categories visible and selectable where enabled | Pending |  |
| Partner registration | Three partner paths visible | Pending |  |
| Public SME apply route | Routes to Partner Workspace without internal fallback wording | Pending |  |
| Mobile layout | Portal sidebar/tabs and long references wrap cleanly | Pending |  |

## Guardrails

- No secrets, OTPs, payment tokens, provider private contact details or artifact URLs should be recorded in QA evidence.
- No live dispatch, payout automation, legal advice automation, medical booking or vehicle rental contract automation is activated by this polish task.
