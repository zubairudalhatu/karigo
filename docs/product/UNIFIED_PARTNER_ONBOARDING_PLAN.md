# Unified Partner Onboarding Plan

Task 192 introduces a unified public direction for KariGO partner onboarding.

Preferred public entry point:

```text
https://vendor.karigo.com.ng/register
```

## Partner Account Types

KariGO partner onboarding now distinguishes three public account paths:

- Product Seller: restaurants, grocery stores, market vendors and approved product sellers.
- Service Provider: SME service providers such as plumbers, cleaners, printing shops, legal practitioners and car-hire operators.
- Both: partners that sell products and provide approved SME Services.

## Public Routing

The public website now points service-provider CTAs toward the Partner Workspace registration page instead of making the standalone SME Services application form the primary path.

The legacy service-provider application backend/form remains available as an operational fallback. It should not be promoted as the main onboarding route unless the Partner Workspace is unavailable.

## Partner Workspace

The Vendor Dashboard is presented as the KariGO Partner Workspace. Approved partners can use the same workspace to manage:

- Product catalogue where applicable.
- Services catalogue where applicable.
- Onboarding documents.
- Profile branding.
- Branch/location details.
- Team/account activity where enabled.

Registration does not automatically activate dispatch, payouts, public provider contact sharing, legal advice automation, vehicle rental contracts or pharmacy marketplace access.

## Admin Review

Admin continues to review vendor applications and SME provider applications. Vendor application cards now show safe partner-type context so operations can distinguish product sellers from service-provider-oriented applications without a risky schema rename.

Full persisted partner-type modelling can be added later if KariGO needs a dedicated `partnerType` field across applications, vendors and reporting.
