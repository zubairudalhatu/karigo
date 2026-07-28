# Partner Product Self-Service - Task 206C

Task 206C hardens Partner/Vendor product management for approved product-selling partners.

## Scope

Approved active partners may:

- list their own products
- create products
- edit products
- change availability
- upload/select product images
- archive products
- manage option groups and add-ons

Existing Admin product and marketplace controls remain separate. Vendor-side product edits do not activate payouts, promotions, pharmacy scope, or privileged admin moderation.

## Access Rules

- Product self-service requires an authenticated Partner account with an active vendor profile.
- Vendor status must be `ACTIVE`.
- Backing user account status must be `ACTIVE`.
- Suspended, pending, closed, trashed or service-only partners cannot create, update, publish or archive products.
- Backend ownership checks derive the vendor from the authenticated session. The client does not send a trusted vendor ID.
- Cross-vendor product reads/updates return a safe not-found response.

## Validation Rules

- Product name and description are trimmed and length-checked.
- Product category must be one of the supported product categories.
- Price must be at least NGN 1.
- Product image URL must be HTTPS and use JPG, PNG or WebP media, including approved KariGO upload paths.
- Duplicate active product names inside the same vendor catalogue are rejected.
- Vendor-side `isFeatured` is ignored so partners cannot self-promote products above admin rules.
- Option group selection ranges are validated.

## Audit

Vendor audit logs are written for:

- product creation
- product update
- availability change
- archive/deactivation

Audit records include safe product metadata, changed fields and before/after availability or catalogue state. Audit records must not include uploaded file bytes, secrets, OTPs, credentials or payment data.

## Vendor Dashboard Behaviour

The Product page:

- shows empty, loading, success and error states
- validates inputs before submit
- disables duplicate save, availability and archive actions while processing
- keeps product images as uploaded/HTTPS URLs
- displays a restriction notice for pending, suspended or service-only partners

## Deployment Checks

After deployment:

1. Log in as an approved active product seller and create a valid product.
2. Confirm duplicate names are rejected.
3. Confirm invalid image URLs and zero prices are rejected.
4. Toggle availability and confirm the product list refreshes.
5. Archive a test product and confirm it disappears from active vendor-owned lists.
6. Confirm a suspended partner cannot create or activate products.
7. Confirm Vendor Audit Logs show product create/update/availability/archive actions.

## Rollback

If product self-service hardening blocks a legitimate partner:

1. Confirm the partner vendor profile is active and the backing user account is active.
2. Confirm the partner is product-selling or mixed, not service-only.
3. Review backend validation errors from the API logs without exposing payload secrets.
4. Temporarily use Admin product controls only if owner-approved.
5. Revert the 206C deployment if the active-vendor gate or validation has an unintended production impact.
