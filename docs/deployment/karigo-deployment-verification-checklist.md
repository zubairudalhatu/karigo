# KariGO Deployment Verification Checklist

Use this checklist after every staging deployment and before any controlled launch demo.

## Backend on Render

- [ ] Pull latest `main`.
- [ ] Confirm build command includes dependency install, Prisma generate, migration deploy and backend build.
- [ ] Run `npx prisma migrate deploy`.
- [ ] Confirm migration status is clean.
- [ ] Run staging seed only when approved.
- [ ] Confirm mock providers remain active unless sandbox testing is explicitly approved.
- [ ] Confirm health endpoint responds.
- [ ] Confirm Swagger/API docs availability decision.
- [ ] Confirm logs do not expose secrets, passwords, OTPs or tokens.

Recommended build command:

```text
npm ci && npx prisma generate && npx prisma migrate deploy && npm run build
```

Recommended start command:

```text
node dist/main
```

## Web Portals and Website

- [ ] Admin Portal Vercel redeployed.
- [ ] Vendor Dashboard Vercel redeployed.
- [ ] Public Website Vercel redeployed.
- [ ] `NEXT_PUBLIC_API_BASE_URL` points to `https://karigo-8htn.onrender.com/api/v1`.
- [ ] Custom domains resolve.
- [ ] Fallback Vercel URLs still load.
- [ ] Browser CORS checks pass from all web origins.

## Mobile Apps

- [ ] Customer App EAS build or update completed if Customer code/config changed.
- [ ] Rider App EAS build or update completed if Rider code/config changed.
- [ ] Internal APK installs on test devices.
- [ ] API base URL points to Render staging API.
- [ ] Taxi and Pharmacy public flags are off unless approved.

## Database and Seed

- [ ] Migrations applied.
- [ ] Demo accounts exist.
- [ ] Demo vendors/products exist.
- [ ] Demo rider active/online.
- [ ] `KARIGOFIRST` exists.
- [ ] Demo utility catalogue exists.
- [ ] No real customer/vendor/rider data inserted by seed.

## DNS and SSL

- [ ] `https://www.karigo.com.ng` has valid SSL.
- [ ] `https://karigo.com.ng` has valid SSL or redirects intentionally.
- [ ] `https://admin.karigo.com.ng` has valid SSL.
- [ ] `https://vendor.karigo.com.ng` has valid SSL.
- [ ] Redirect/canonical behavior is documented.

## Post-Deployment Smoke Test

- [ ] Backend health.
- [ ] Admin login.
- [ ] Vendor login.
- [ ] Customer login.
- [ ] Rider login.
- [ ] Customer quote/order/mock payment.
- [ ] Vendor paid order visible.
- [ ] Admin dispatch assignment.
- [ ] Rider delivery completion with OTP.
- [ ] Customer support ticket.
- [ ] Utility test transaction.
- [ ] Taxi readiness/waitlist.

## Rollback

- [ ] Previous Render deployment identified.
- [ ] Previous Vercel deployments identified.
- [ ] Database rollback plan reviewed for destructive migrations.
- [ ] EAS previous build/update channel available if mobile issue occurs.
