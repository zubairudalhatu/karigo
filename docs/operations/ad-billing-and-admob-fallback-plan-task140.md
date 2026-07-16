# Task 140 - Controlled Ad Billing and AdMob Fallback Plan

## Scope

This plan clarifies the KariGO-managed advertising foundation added during Task
138 and the safe fallback direction if Google AdMob is needed later.

No live ad billing, live wallet top-up, card charging, payout, automatic credit
spend, external provider login or marketing campaign sending is activated by this
plan.

## Current KariGO-Managed Ad Flow

1. Vendor opens Vendor Dashboard `Ads`.
2. Vendor submits an ad campaign request with title, body, optional image and
   requested budget.
3. Admin reviews the request in Admin Portal `Ads`.
4. Admin may grant controlled internal ad credit to the vendor.
5. Admin may reserve part of that controlled ad credit against a campaign.
6. Admin sets the campaign status through review states such as `SUBMITTED`,
   `UNDER_REVIEW`, `APPROVED`, `ACTIVE`, `REJECTED`, `CANCELLED` or `EXPIRED`.
7. Customer App displays only approved active ads in the managed homepage
   placement.
8. Customer-facing ads are labelled `Ad`.

## Controlled Ad Credit Rules

- Vendor ad credit is an internal pilot balance only.
- Admin grants credit manually.
- Admin reserves credit manually for an ad campaign.
- Rejected, cancelled or expired ads release reserved credit.
- Real-money purchase, wallet top-up, payment-provider charge, invoice
  collection and payout automation remain disabled.
- Ad credits must not affect checkout quotes, delivery fees, order totals,
  customer wallet balances or vendor settlement balances.

## Current Limitations

- Automatic ad spend deduction is not active.
- Impression/click billing is not active.
- External advertiser payment collection is not active.
- Vendor wallet-to-ad-credit conversion is not active.
- Financial reconciliation remains an operations/manual record until a future
  approved billing task.

## Recommended Pilot Billing Posture

Use controlled internal credit only:

```text
Ad request submitted -> Admin review -> Admin credit grant -> Admin reservation -> Active managed ad -> Manual closeout
```

Do not collect real money for ads during the controlled pilot unless a separate
approved payment/billing task is completed.

## Google AdMob Fallback Plan

AdMob is not active in the current Customer App.

Current safe fallback when no KariGO-managed ad is available:

```text
Show KariGO-managed fallback copy or no ad placement.
```

Future AdMob fallback should only be considered if:

- no approved active KariGO-managed ad is available;
- management approves AdMob use;
- legal/privacy review is complete;
- the Customer App receives a fresh APK with the required native ad SDK;
- ad unit IDs and app IDs are configured through approved environment/build
  configuration;
- ads are clearly labelled;
- live payments and wallet billing remain separate from ad display;
- children-sensitive, medical, financial and misleading ad categories are blocked
  where platform settings allow.

Suggested future flags:

```text
EXPO_PUBLIC_ADMOB_FALLBACK_ENABLED=false
EXPO_PUBLIC_ADMOB_HOME_BANNER_UNIT_ID=
```

Do not add real AdMob IDs, API credentials, private keys or screenshots to Git.

## Rollback

If managed ads cause any issue during pilot:

1. Set affected ad campaign status to `PAUSED`, `REJECTED`, `CANCELLED` or
   `EXPIRED`.
2. Confirm the Customer App falls back to safe KariGO copy or no ad.
3. Confirm checkout pricing and order creation remain unchanged.
4. Record the issue in the Task 139/Task 140 issue register.
