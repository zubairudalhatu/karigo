# Partner Support And Escalation Guide

This guide helps Support and Operations triage partner onboarding issues.

## Common Support Categories

| Category | Examples | Primary Owner |
| --- | --- | --- |
| Registration | Cannot submit application, wrong partner type selected. | Operations Support |
| Activation | Missing password setup link, expired activation link. | Admin Operations |
| Documents | Upload failed, unclear document, wrong document type. | Partner Review |
| Profile | Logo, cover image, branch/location or business info issue. | Partner Success |
| Catalogue | Product/service creation, image upload, pricing issue. | Partner Success |
| Orders | Vendor order visibility, preparation status, dispatch handoff. | Operations |
| Payments | Pay on Delivery reconciliation, wallet visibility, settlement questions. | Finance Operations |
| Account Cleanup | Duplicate/test account, trashed account, missing profile state. | Admin Operations |

## Missing Partner Profile

If a signed-in partner sees:

```text
Your partner profile is not active.
```

Support should:

1. Confirm the email/phone used to sign in.
2. Check Admin Portal for a linked active Partner/Vendor record.
3. Check Vendor Applications and Trashed filters for duplicate or removed records.
4. Ask Admin Operations to restore only if the record should be active.
5. Direct new applicants to `https://vendor.karigo.com.ng/register`.

Do not ask the partner to create a workaround account unless Admin confirms it is safe.

## Escalation Levels

| Level | Meaning | Response |
| --- | --- | --- |
| L1 | Basic onboarding or how-to issue. | Support resolves with standard guide. |
| L2 | Account activation, document review or catalogue blocker. | Escalate to Admin Operations or Partner Success. |
| L3 | Payment, wallet, settlement, legal, regulated category or data cleanup issue. | Escalate to Finance, Legal, Engineering or leadership as appropriate. |

## Safe Communication Rules

- Never request or share passwords, OTPs, payment card details, API keys or environment variable values.
- Do not forward internal Admin notes to partners.
- Use applicant-visible notes for partner-facing feedback.
- Keep audit-sensitive cleanup decisions in Admin records.
