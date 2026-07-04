# Task 51 QA Checklist

Use staging demo accounts only. Do not record passwords, bearer tokens, delivery OTPs, full phone numbers, customer addresses, or private payment/provider data in Git.

## Customer App

| Area | Expected result | Status |
| --- | --- | --- |
| Cart add feedback | Add-to-cart shows a short confirmation such as `Chicken Suya added to cart` | Fixed |
| View cart action | The cart confirmation includes a `View cart` action | Fixed |
| Rapid duplicate taps | Add button briefly disables/changes to `Added` to prevent accidental duplicate quantity | Fixed |
| Intentional repeat add | Customer can add another quantity after the short lockout clears | Fixed |
| Cart badge | Bottom navigation cart badge updates immediately when cart count changes | Fixed |
| Bottom navigation | Authenticated customer screens show Home, Browse, Cart, Orders and Profile | Fixed |
| Auth hiding | Bottom navigation is hidden on auth/onboarding entry screens | Fixed |
| Homepage simplification | Old dense links for Addresses, Cart, Orders, Profile and Support are removed from Home | Fixed |
| Profile account actions | Addresses, Support and Notifications are reachable from Profile | Fixed |
| Food category | Food screen calls `GET /api/v1/products?category=FOOD` and shows only food products | Fixed |
| Groceries category | Groceries screen calls `GET /api/v1/products?category=GROCERIES` and shows only grocery products | Fixed |
| Market category | Market Items screen calls `GET /api/v1/products?category=MARKET_ITEMS` and shows only market products | Fixed |
| Category search | Search remains scoped to the selected backend category | Fixed |

## Backend

| Area | Expected result | Status |
| --- | --- | --- |
| Public product filtering | `category=FOOD|GROCERIES|MARKET_ITEMS` filters server-side | Fixed |
| Legacy product filtering | `productCategory=...` remains accepted for compatibility | Fixed |
| Invalid categories | Validation rejects invalid enum values safely | Fixed |
| Product options schema | Product option groups and options are stored under the owning product | Fixed |
| Option price format | Option price adjustments use integer kobo values | Fixed |
| Vendor ownership | Vendor product mutations verify ownership before option changes | Fixed |
| Existing products | Products without option groups continue to work | Fixed |

## Vendor Dashboard

| Area | Expected result | Status |
| --- | --- | --- |
| Product header polish | Product page shows `Vendor catalogue`, `Products`, and concise supporting copy | Fixed |
| Option group form | Vendors can add group name, required flag and min/max selections | Fixed |
| Option form | Vendors can add option name, kobo price adjustment and availability | Fixed |
| Responsive layout | Product form and list remain readable on laptop/tablet widths | Fixed |
| No checkout impact | Product options are editable but do not alter customer order totals yet | Fixed |

## Demo Seed Data

- `Jollof Rice`: protein choice and drink add-on options.
- `Chicken Suya`: spice level and extras.
- `Household Cleaning Pack`: optional add-on pack.

These are synthetic staging/demo examples only.
