# Pharmacy Marketplace Readiness

Task 44 adds Pharmacy as a discovery category and service category, but keeps it compliance-gated.

## Implemented

- Customer Home includes a Pharmacy category card.
- Browse supports `/catalogue/pharmacy`.
- Backend `ServiceCategory` includes `PHARMACY`.
- Public vendor filtering avoids product-category fallback for pharmacy.
- Discovery endpoints return no pharmacy vendors unless `PHARMACY_MARKETPLACE_ENABLED=true`.
- Seed creates a pharmacy vendor category only; it does not create an active pharmacy storefront.

## Safety Rules

- Pharmacy products must not provide medical diagnosis or treatment advice.
- Prescription-required and restricted products must not enter normal automated checkout by default.
- Prescription upload, prescription verification and controlled-medicine workflows remain disabled.
- Pharmacy vendor visibility requires manual admin approval and feature flag activation.

## Future Product Classifications

- OTC
- PRESCRIPTION_REQUIRED
- RESTRICTED
- NOT_SUPPORTED
- HEALTH_AND_WELLNESS
- MEDICAL_SUPPLY

## Deferred

No pharmacy provider, prescription workflow, legal verification, or automatic pharmacy approval was activated.
