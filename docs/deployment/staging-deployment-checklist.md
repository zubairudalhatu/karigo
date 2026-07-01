# Staging Deployment Checklist

## Backend

- [ ] Staging database and secret storage created
- [ ] Environment variables configured; mock providers confirmed
- [ ] `npm ci`, Prisma generate/validate, and `prisma migrate deploy` pass
- [ ] Staging-safe seed completes
- [ ] Backend starts; health and approved Swagger access work
- [ ] CORS is restricted to staging web URLs

## Frontends

- [ ] Customer/rider apps point to staging API and open on test devices
- [ ] Vendor/admin dashboards point to staging API and build/deploy
- [ ] KariGO logo/assets, login, and basic navigation work

## Data

- [ ] Super admin and operations admin exist
- [ ] Demo customer, active vendor, vendor category/products, and active rider exist
- [ ] Customer Home address, sample parcel order, and `KARIGOFIRST` exist

## Security

- [ ] Staging credentials differ from development and production
- [ ] Default/example passwords replaced; credentials shared only with approved testers
- [ ] JWT secret changed, CORS restricted, and provider keys remain mock/empty
- [ ] Logs contain no OTPs, passwords, authorization headers, or full device tokens
- [ ] Admin login and role guards tested

## Approval

- [ ] Staging smoke script passed
- [ ] Internal demo checklist passed
- [ ] Known issues recorded with owners
- [ ] Engineering/QA/Operations approve continued staging use
