# Checkout Pricing And Quotes

KariGO checkout remains server-authoritative.

## Preserved Safeguards

- Checkout must obtain a current backend quote before order creation.
- Missing or stale quotes never display as `NGN 0`.
- Create Order remains disabled until a valid quote is loaded.
- Delivery fee, discount and payable totals come from backend quote/order responses.
- Vendor promotions and marketplace ads do not alter checkout pricing in Task 44.

Future vendor-product promotions must be integrated into backend quote calculation before becoming customer-visible.
