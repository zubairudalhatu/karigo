# Public Website Test Checklist

Use this checklist for the KariGO public website before and after deployment.

## Domains

- Primary: `https://www.karigo.com.ng`
- Apex: `https://karigo.com.ng`
- Admin custom domain reference: `https://admin.karigo.com.ng`
- Vendor custom domain reference: `https://vendor.karigo.com.ng`
- Admin fallback: `https://karigo-admin-portal.vercel.app`
- Vendor fallback: `https://karigo-vendor-dashboard.vercel.app`
- Website fallback: verify the current Vercel deployment URL in the Vercel project dashboard before QA.

| Area | Steps | Expected result | Failure signs | Tester notes |
|---|---|---|---|---|
| Homepage | Open primary and apex domains. | KariGO hero, service summary and CTAs load. | SSL error, wrong redirect, stale content. | Confirm preferred canonical domain. |
| Services page | Open Services. | Live services and preparing-launch services are separated. | Taxi/Pharmacy presented as live incorrectly. | Readiness copy visible. |
| Vendors page | Open Vendors. | Vendor value proposition and apply CTA display. | Broken layout, wrong API URL. | Mobile and desktop. |
| Vendor application form | Submit safe synthetic vendor application. | Success message appears; backend receives application. | CORS error, auth header required, validation unclear. | Do not use real business details. |
| Riders page | Open Riders. | Delivery rider and Taxi readiness copy visible. | Taxi public booking claim. | Taxi is coming later. |
| Taxi forms | Submit Taxi waitlist/driver readiness with synthetic data. | Forms submit to readiness endpoints. | Live ride booking or dispatch action. | No real ride guarantee. |
| Contact page | Open Contact. | Contact details and manual-contact notice display. | Email sending claim without provider. | No automatic email unless configured. |
| Privacy page | Open Privacy. | Page loads and policy content is readable. | Missing policy. | Legal review still required. |
| Terms page | Open Terms. | Page loads and terms content is readable. | Missing terms. | Legal review still required. |
| Mobile responsiveness | Test narrow viewport. | Navigation, CTAs and forms remain usable. | Overflow, hidden buttons. | Android Chrome preferred. |
| Desktop responsiveness | Test laptop viewport. | Hero/cards/forms align cleanly. | Overlapping content. | Include 1366px width. |
| DNS/SSL | Check primary/apex/custom subdomains. | HTTPS valid and redirects are intentional. | Certificate mismatch, DNS propagation issue. | Use browser and Vercel dashboard. |
| CORS from forms | Submit public forms. | Backend accepts approved origins. | Browser CORS block. | Confirm backend `CORS_ORIGINS`. |
