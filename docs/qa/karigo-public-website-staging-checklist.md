# KariGO Public Website Staging Checklist

Use this checklist before connecting `www.karigo.com.ng` publicly.

## Environment

- Website app: `apps/website`
- API variable: `NEXT_PUBLIC_API_BASE_URL`
- Site URL variable: `NEXT_PUBLIC_SITE_URL`

## Page Checks

| Check | Expected result | Status | Notes |
| --- | --- | --- | --- |
| Homepage loads | Hero, services, vendor, rider, bills readiness, download and contact sections display | Pending |  |
| Header navigation works | Services, Vendors, Riders & Drivers, Download App, Contact and Become a Vendor links work | Pending |  |
| Services page loads | Live and preparing-launch services are clearly separated | Pending |  |
| Vendor page loads | Vendor benefits, onboarding and approval notice display | Pending |  |
| Vendor application form loads | Public form fields are visible and accessible | Pending |  |
| Vendor application submits | Form posts to `POST /api/v1/vendor-applications` using configured API URL | Pending | Requires backend CORS origin |
| Vendor success message displays | Approved success copy is shown after submission | Pending |  |
| Rider/driver page loads | Delivery rider and taxi readiness sections display | Pending |  |
| Contact page loads | Email, phone, location and CTAs display | Pending |  |
| Privacy and Terms load | Draft/internal readiness wording appears | Pending | Must be legally reviewed before public launch |

## Readiness Safety

- [ ] Taxi is marked `Coming soon` and does not request rides.
- [ ] Pharmacy is marked `Preparing launch` and does not imply live pharmacy approval.
- [ ] Airtime, Data, Electricity and Cable TV are marked `Coming soon`.
- [ ] No fake app-store links are present.
- [ ] No live payment, payout, taxi, pharmacy or utility provider integration is activated.
- [ ] No secrets are committed.

## Responsive and Accessibility Checks

- [ ] Mobile layout has no horizontal overflow.
- [ ] Buttons and links have readable labels.
- [ ] Form fields have labels.
- [ ] Contrast is readable against white/light-grey backgrounds.
- [ ] Keyboard navigation reaches form fields and buttons.
