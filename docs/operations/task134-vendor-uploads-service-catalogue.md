# Task 134 - Vendor Uploads and Service Catalogue Operations Note

## Scope

Task 134 adds vendor workspace support for:

- Vendor onboarding document uploads.
- Product image uploads.
- Vendor logo and cover image uploads.
- Internal vendor service catalogue management for SME Services vendors.

This does not activate live payments, payouts, public provider login, automated SME Services dispatch, Pharmacy marketplace, live rides, marketing messaging or bulk messaging.

## Upload Handling

Vendor uploads are accepted only through authenticated vendor sessions.

Supported upload purposes:

- `onboarding-document`
- `product-image`
- `service-image`
- `logo`
- `cover`

Accepted file types:

- Images: JPG, PNG, WebP.
- Documents: PDF, JPG, PNG, WebP.

Current storage:

- Files are stored under the backend `uploads/` directory.
- `uploads/` is ignored by Git.
- Files must not be committed, copied into documentation or included in screenshots unless appropriately redacted.

Operational note:

- Local/backend filesystem upload storage is suitable for controlled staging and pilot testing only.
- Before broad production usage, KariGO should move uploads to approved object storage with private access controls, retention policy, malware scanning and signed access URLs.

## Vendor Workspace Changes

Vendor Dashboard now allows vendors to upload:

- Onboarding documents from their device.
- Product images from their device.
- Profile logo and cover image from their device.
- Service images from their device.

Manual URL fields remain available as a controlled fallback for approved hosted links.

## Services Catalogue

The new Services workspace supports SME Services vendors that do not fit the product/menu workflow.

Vendors can manage:

- Service type.
- Service name.
- Description.
- Optional base price.
- Price note.
- Duration estimate.
- Service areas.
- Image.
- Availability.
- Readiness-only flag.
- Internal vendor note.

Health professional services remain readiness-only and cannot be marked active for live booking in this pilot.

The service catalogue is vendor-owned and internal to the vendor workspace in this task. It is not exposed as a public marketplace catalogue and does not trigger assignment, dispatch, payment collection or provider payouts.

## Deployment Notes

Backend deployment requires:

- Prisma migration deploy.
- Backend build/redeploy.
- Vendor Dashboard redeploy.

No Customer App APK, KariGO Captain APK, Admin Portal redeploy or payment-provider configuration change is required unless a separate task changes those surfaces.

## Guardrails

- Do not upload passwords, OTPs, payment secrets, API keys or unnecessary private identity details.
- Do not place uploaded files in Git.
- Do not activate provider dispatch, payouts or public provider login from the service catalogue.
- Keep mock payment as the pilot default unless separately approved.
