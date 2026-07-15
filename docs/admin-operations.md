# Admin Operations

The Admin Portal provides operations, dispatch, support, settlement, promotion, reporting and management surfaces.

## Task 44 Additions

- Admin vendor application review page: `/vendor-applications`.
- Backend admin application endpoints: `/api/v1/admin/vendor-applications`.
- Review decisions are recorded without automatically publishing storefronts or activating payout, promotion or pharmacy scope.

See:

- `docs/vendor-application-review-and-approval.md`
- `docs/pharmacy-marketplace-readiness.md`

Admin settlement actions remain manual and do not initiate bank transfers.

## Task 130 Vendor Account Cleanup

The Admin Portal Vendors page now supports a safe cleanup workflow for staging and pilot test vendor accounts.

- `Move to Trash` hides the vendor from active admin lists, closes the vendor storefront, disables the linked vendor user, revokes active refresh tokens and deactivates device tokens.
- `Restore` removes the trash marker and restores the linked vendor user when an account was trashed by mistake.
- `Delete permanently` is only available for trashed vendors when the backend safety check confirms there are no protected operational records.
- Permanent deletion is blocked when the vendor has orders, settlements, promo codes, payout account records or product records linked to order items.
- Cleanup actions are recorded in admin audit logs with safe metadata and optional internal reason notes.

Use permanent deletion only for synthetic test vendors. Real pilot vendors, vendors with operational history and vendors with payout/settlement records should remain archived in Trash rather than deleted.
