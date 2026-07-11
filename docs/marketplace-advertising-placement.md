# Marketplace Advertising Placement

Task 44 adds a labelled homepage ad placement but does not integrate an external ad network.

## Implemented

- Customer Home includes a clearly labelled `Ad` placement area.
- Discovery API `GET /api/v1/discovery/ad-banner` returns `null` until approved internal content exists.
- The ad placement is visually separated from organic vendor recommendations.

## Allowed Future Targets

- Vendor storefront.
- Category browse page.
- KariGO campaign page.
- Parcel delivery or SME Services request page.

## Safety Rules

- No external ad network was integrated.
- Ads do not affect checkout pricing, delivery quotes or order eligibility.
- Ads must be approved before display.
- Ads must be labelled visibly.
