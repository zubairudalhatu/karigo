# KariGO Vendor Uploads and Service Catalogue Verification - Task 134

## Environment

- Backend API: staging/pilot backend.
- Vendor Dashboard: staging/pilot dashboard.
- Payment mode: Mock payment remains default.
- Live payouts: Disabled.
- SME Services dispatch/provider login: Disabled.

## Verification Checklist

### Vendor Onboarding Uploads

- [ ] Vendor logs into Vendor Dashboard.
- [ ] Vendor opens Onboarding.
- [ ] Vendor uploads PDF onboarding document.
- [ ] Vendor uploads image onboarding document.
- [ ] Document reference is populated after upload.
- [ ] Vendor submits document for review.
- [ ] Admin can view submitted onboarding document metadata.
- [ ] No password, OTP, payment secret or unnecessary identity number appears in logs/evidence.

### Product Image Uploads

- [ ] Vendor opens Products.
- [ ] Vendor uploads product image from device.
- [ ] Product image preview appears.
- [ ] Vendor creates product with uploaded image.
- [ ] Product list displays uploaded image.
- [ ] Existing product option/add-on behaviour is unchanged.

### Vendor Branding Uploads

- [ ] Vendor opens Profile.
- [ ] Vendor uploads logo.
- [ ] Vendor uploads cover image.
- [ ] Vendor saves profile.
- [ ] Logo/cover URLs persist after refresh.
- [ ] No vendor credential or private document is uploaded as branding.

### Vendor Services Catalogue

- [ ] Vendor opens Services.
- [ ] Vendor creates service record.
- [ ] Vendor uploads service image.
- [ ] Vendor sets service areas.
- [ ] Vendor can edit service record.
- [ ] Vendor can archive service record.
- [ ] Archived service disappears from active workspace list.
- [ ] Health professional service remains readiness-only/inactive.
- [ ] Service catalogue does not trigger customer booking, dispatch, payment or payout.

### Access Control

- [ ] Vendor A cannot view or update Vendor B services.
- [ ] Unauthenticated upload request is rejected.
- [ ] Customer/Admin/Rider tokens cannot use vendor upload or service catalogue routes unless explicitly vendor-authorized.

## Result Record

| Area | Result | Evidence reference | Notes |
| --- | --- | --- | --- |
| Onboarding upload | Pending |  |  |
| Product image upload | Pending |  |  |
| Profile branding upload | Pending |  |  |
| Services catalogue create/edit/archive | Pending |  |  |
| Access control | Pending |  |  |
| Logs/secrets review | Pending |  |  |

## Known Limitations

- Backend local filesystem uploads are for controlled staging/pilot only.
- Production-grade object storage, malware scanning and signed URL access remain future hardening work.
- Services catalogue remains internal to Vendor Dashboard and does not activate public SME provider booking.
