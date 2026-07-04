# Vendor Product Management API

Task 50 adds vendor-owned product management while preserving the public product listing routes.

## Public Catalogue

- `GET /api/v1/products`
- Query: `productCategory=FOOD|GROCERIES|MARKET_ITEMS`
- Query: `search=<term>`
- Returns available, active products from active vendors only.

## Existing Public Vendor Products

- `GET /api/v1/vendors/:vendorId/products`
- Optional query: `productCategory=FOOD|GROCERIES|MARKET_ITEMS`
- Returns available products for one active vendor.

## Vendor-Owned Product Routes

All routes require `Authorization: Bearer <accessToken>` and `VENDOR` role.

- `GET /api/v1/vendor/products`
- `POST /api/v1/vendor/products`
- `GET /api/v1/vendor/products/:productId`
- `PATCH /api/v1/vendor/products/:productId`
- `PATCH /api/v1/vendor/products/:productId/availability`
- `DELETE /api/v1/vendor/products/:productId`

Vendor ownership is enforced on every route. A vendor cannot read, update, archive, or toggle another vendor's products.

## Product Fields

- `name`: required
- `description`: required, concise text
- `price`: positive NGN amount
- `imageUrl`: HTTPS URL only
- `productCategory`: `FOOD`, `GROCERIES`, or `MARKET_ITEMS`
- `category`: optional display label such as `Rice`, `Household`, or `Drinks`
- `isAvailable`: optional boolean
- `isFeatured`: optional boolean

Delete/archive is implemented as a safe archive: the product is marked inactive/unavailable and hidden from customer catalogue results.
