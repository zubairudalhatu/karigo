# Vendor-First Browse Experience

Task 44 makes Browse prioritise vendors before products.

## Implemented Layout

1. KariGO branded top bar.
2. Browse heading and vendor search.
3. Featured Vendors.
4. Top Restaurants.
5. Top Grocery and Market Vendors.
6. Top Pharmacy Vendors, only when pharmacy scope is enabled.
7. Top Menus and Products as the final section.

## API Support

New read-only discovery endpoints:

- `GET /api/v1/discovery/home`
- `GET /api/v1/discovery/categories`
- `GET /api/v1/discovery/featured-vendors`
- `GET /api/v1/discovery/top-restaurants`
- `GET /api/v1/discovery/top-grocery-vendors`
- `GET /api/v1/discovery/top-pharmacy-vendors`
- `GET /api/v1/discovery/top-products`
- `GET /api/v1/discovery/ad-banner`

The existing vendor endpoint also supports `serviceCategory=FOOD|GROCERY|MARKET|PHARMACY`.

## Rules

- Product discovery appears only after vendor sections.
- Product cards route into product details with vendor context.
- Suspended, deleted, inactive and unavailable vendor/product records remain hidden by existing backend filters.
- Pharmacy vendors are not returned unless `PHARMACY_MARKETPLACE_ENABLED=true`.
