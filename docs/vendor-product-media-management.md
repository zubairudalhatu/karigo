# Vendor Product Media Management

Task 44 documents the product-media foundation but does not activate binary upload storage.

## Current Implementation Status

- Existing product management still supports `imageUrl`.
- Vendor storefront and Browse use vendor/product image references where available.
- Object storage credentials remain placeholders only.

## Required Future Implementation

- Add `VendorProductMedia` records for primary and gallery images.
- Validate MIME type, file size and dimensions before storage.
- Store object-storage keys or signed/public URL references, not base64 blobs.
- Allow owning vendors to upload, reorder, set primary, replace, remove and add alt text.
- Allow authorised admins to review media.
- Soft-delete media records and audit primary-image changes.

## Limits

Recommended defaults:

- One primary product image.
- Up to six gallery images per product.

## Deferred

No real upload provider, image optimisation pipeline or external storage integration was activated in this task.
