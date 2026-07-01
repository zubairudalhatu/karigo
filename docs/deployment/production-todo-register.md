# Production TODO Register

Detailed provider readiness, security requirements, and phased integration work are
tracked under `docs/providers/`.

## Required Before Public Launch

- Production PostgreSQL hosting, encrypted connections, backup/restore rehearsal
- Domain/API hosting, HTTPS, restricted CORS, rate limiting, monitoring, and log redaction
- Hardened vendor/admin session handling
- Privacy, terms, refund, vendor, rider, and data-protection legal review
- Admin role granularity/access-recovery review
- Customer support workflow and escalation approval

## Required Before Payment Go-Live

- Approved real payment gateway and webhook signature verification
- Real refund integration and reconciliation process
- Approved bank-transfer/payout process
- Finance controls, settlement review, and audit procedures

## Required Before App Store Release

- App-store developer accounts and signing
- Physical-device test matrix and crash monitoring
- Real SMS OTP provider
- Privacy disclosures, store metadata, screenshots, and support URLs

## Future Improvement

- Email, WhatsApp, and push providers
- Vendor product management and vendor settlement view
- Vendor/rider support tickets
- Live GPS, improved analytics, pagination, loyalty, and wallet features
