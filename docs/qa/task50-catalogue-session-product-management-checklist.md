# Task 50 QA Checklist

Use staging demo accounts only. Do not record passwords, tokens, OTPs, full phone numbers, or private customer details in Git.

## Customer Persistent Session

- Customer logs in and receives access and refresh tokens.
- Tokens are stored in Expo SecureStore only.
- Closing and reopening the app restores the customer session.
- Expired access token refreshes silently when refresh token is valid.
- Invalid refresh token clears the session and shows: `Your session has expired. Please sign in again.`
- Logout revokes the supplied refresh token and clears local secure storage.

## Customer Service Discovery

- Food Delivery opens `Food delivery` catalogue.
- Groceries opens `Groceries` catalogue.
- Market Items opens `Market items` catalogue.
- Parcel Delivery opens the existing parcel flow.
- SME Errands opens the existing parcel/errand flow with business-errand context.
- Home shows `Food near you`, `Groceries near you`, and `Market items near you`.

## Customer Catalogue

- Product cards show image, name, one-line description, price, availability, vendor name, and add-to-cart.
- Category search filters the correct product type.
- Empty, loading, error, and retry states are visible and friendly.
- Product detail shows a larger image, description, price, vendor, quantity controls, and add-to-cart.
- Checkout quote, promo, payment, and delivery OTP flows remain unchanged.

## Vendor Product Management

- Vendor can list only its own products.
- Vendor can create a product with valid name, description, positive price, HTTPS image URL, and valid category.
- Invalid image URL is rejected.
- Vendor can edit only its own product.
- Vendor can toggle only its own product availability.
- Vendor can archive only its own product.
- Archived/unavailable products do not appear in customer catalogue results.
- Vendor A cannot retrieve, edit, toggle, or archive Vendor B products.

## Staging Seed Catalogue

- Kano Kitchen has six food products.
- Kano Fresh Mart has six grocery products.
- Kano Everyday Market has six market-item products.
- All seeded products have HTTPS images, one-line descriptions, NGN prices, valid product categories, and available status.
