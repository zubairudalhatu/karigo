# KariGO Promotions and Customer Retention

Marketing-capable admins can create, list, update, and deactivate percentage or fixed-amount promo codes. Promo actions create `AdminAuditLog` records.

Customers validate promos through `POST /api/v1/promos/validate`. Validation checks active dates, minimum subtotal, total and per-customer usage limits, first-order restrictions, vendor restrictions, and service-category restrictions. Percentage discounts support caps, and fixed discounts cannot exceed the order subtotal.

Vendor-order creation accepts an optional `promoCode`. The API recalculates product subtotal and promo discount server-side, stores the promo link and discount on the order, and returns the authoritative payable total. Parcel delivery promo application remains a TODO because parcel pricing currently consists only of delivery fees.

Promo usage is created only when payment succeeds. Failed or abandoned payments do not consume usage, and the unique promo/order constraint prevents duplicate usage.

The seed includes `KARIGOFIRST`, a 10% first-order launch discount capped at NGN 1,000 for orders of at least NGN 2,000.

`GET /api/v1/customers/me/retention-summary` returns total/completed orders, first and last order dates, promo usage count, and repeat-customer status. Advanced loyalty points and wallet features remain deferred.

`GET /api/v1/admin/reports/promos` returns usage, discounts, linked orders, customers reached, and campaign dates.
