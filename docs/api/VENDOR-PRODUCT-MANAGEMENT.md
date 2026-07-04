# Vendor Product Management API

Task 50 adds vendor-owned product management while preserving the public product listing routes.

## Public Catalogue

- `GET /api/v1/products`
- Query: `category=FOOD|GROCERIES|MARKET_ITEMS`
- Legacy query still accepted: `productCategory=FOOD|GROCERIES|MARKET_ITEMS`
- Query: `search=<term>`
- Returns available, active products from active vendors only.
- Category filtering is enforced by the backend. Food, groceries and market-items screens must not rely on client-side hiding.

## Existing Public Vendor Products

- `GET /api/v1/vendors/:vendorId/products`
- Optional query: `category=FOOD|GROCERIES|MARKET_ITEMS`
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
- `optionGroups`: optional product modifiers/add-ons, described below

Delete/archive is implemented as a safe archive: the product is marked inactive/unavailable and hidden from customer catalogue results.

## Product Options And Add-ons

Task 51 adds the backend-managed foundation for vendor product options. Options are visible in product responses and editable by the product owner, but they do not yet change customer cart or order totals. Future checkout work must continue using server-authoritative pricing.

### ProductOptionGroup

- `productId`: owned product ID
- `name`: group name, for example `Protein choice`
- `required`: whether the customer must select from this group in a future checkout flow
- `minSelections`: minimum allowed selections
- `maxSelections`: maximum allowed selections
- `displayOrder`: integer sort order

### ProductOption

- `optionGroupId`: parent option group
- `name`: option name, for example `Extra onions`
- `priceAdjustmentKobo`: integer price adjustment in kobo, never a floating point value
- `available`: whether the option can be selected in future
- `displayOrder`: integer sort order

### Authorization

- Vendors can create/update option groups only through their own product routes.
- The backend first verifies that the product belongs to the authenticated vendor.
- Old option groups are soft-hidden when a vendor replaces a product's option configuration.
- Vendor A cannot read or edit Vendor B's product options through vendor-owned routes.

### Example Payload

```json
{
  "name": "Chicken Suya",
  "description": "Spiced grilled chicken with suya pepper.",
  "productCategory": "FOOD",
  "price": 3000,
  "imageUrl": "https://example.com/suya.jpg",
  "optionGroups": [
    {
      "name": "Spice level",
      "required": true,
      "minSelections": 1,
      "maxSelections": 1,
      "options": [
        { "name": "Mild", "priceAdjustmentKobo": 0 },
        { "name": "Extra spicy", "priceAdjustmentKobo": 0 }
      ]
    }
  ]
}
```
