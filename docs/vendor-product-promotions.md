# Vendor Product Promotions

Task 44 documents vendor-product promotion readiness. It does not activate automatic promotion approval or checkout discounting from vendor promotions.

## Current Status

- Existing platform promo-code flow remains server-authoritative.
- Checkout still requires a current backend quote before order creation.
- Vendor product promotion workflow is deferred to a future implementation stage.

## Required Future Lifecycle

Statuses:

- DRAFT
- SUBMITTED
- UNDER_REVIEW
- APPROVED
- SCHEDULED
- ACTIVE
- PAUSED
- EXPIRED
- REJECTED

Promotion types:

- PERCENTAGE_DISCOUNT
- FIXED_AMOUNT_DISCOUNT
- PROMOTIONAL_PRICE

## Safety Rules

- Vendors may only promote their own products.
- Promotions must not exceed product price or create negative prices.
- Admin approval is required before customer visibility.
- Active vendor promotions must be included in server-side quote calculation.
- Existing orders must retain pricing snapshots.
- Promotion changes must not silently alter confirmed orders.
