# Consumer Discovery And Homepage

Task 44 changes the Customer App homepage from a product feed into a category-first discovery surface.

## Implemented

- Full-width KariGO red `KariGoAppTopBar` with safe-area support.
- Safe personalised greeting using the customer's first name only.
- Category grid:
  - Food Delivery
  - Groceries
  - Market Items
  - Pharmacy
  - Parcel Delivery
  - SME Errands
- Homepage no longer renders individual product cards, prices, product carousels, or add-to-cart buttons.
- `Today's featured for you` shows vendor spotlights only.
- Labelled internal ad placement exists, but no ad content is shown unless approved content is later supplied.
- Bottom navigation uses real icons with labels: Home, Browse, Cart, Orders, Profile.

## Safety Notes

- Ads do not affect checkout pricing, delivery quotes, order eligibility, or promotion logic.
- Pharmacy is visible as a category but remains compliance-gated by backend feature controls.
- Checkout quote safeguards from Task 43 remain unchanged.

## Test Focus

- Confirm no products appear on Home.
- Confirm category cards route correctly.
- Confirm bottom navigation icons and labels are visible and accessible.
- Confirm `View Store` routes to vendor storefronts.
