# Task 161 - Customer/Captain Launch Polish Build Note

Date: 2026-07-18

## Scope

This record covers the mobile app launch-polish changes for the next Google Play internal-testing build.

## Customer App Updates

- Customer production app name remains `KariGO`.
- Android package remains `com.karigo.customer`.
- Customer launcher icon now uses a centered, full KariGO wordmark on a clean white background.
- Customer adaptive icon foreground uses a padded KariGO wordmark so Android launcher masks do not crop the logo badly.
- In-app KariGO wordmark uses a transparent, light-surface-friendly asset.
- Customer home top bar now uses a light header surface so the KariGO logo remains readable.
- Customer home and referral copy now reference Kano and Abuja launch cities.
- Wallet copy remains view-only and does not activate top-up, withdrawals, automatic refunds, wallet checkout, referral rewards or subscription billing.
- Customer production EAS profile now sets `EXPO_PUBLIC_PAYMENT_LAUNCH_MODE=squad_live`.
- Customer production fallback payment config defaults to Squad by GTBank if public config is unavailable.

## Checkout Payment Position

- Squad by GTBank is the primary launch checkout provider.
- Mock Payment remains staging/internal fallback only.
- Monnify and Paystack remain pending approval/future secondary providers.
- Live payment completion remains server-verified only.
- Wallet funding, automatic refunds and payout automation remain disabled.

## Captain App Updates

- Captain launcher icon now uses a square KariGO asset accepted by Expo config validation.
- Captain adaptive icon foreground uses a padded KariGO wordmark on a white background.
- Captain application copy now supports Kano or Abuja launch review.
- KariGO Rides remains readiness-only.
- Live ride dispatch, payouts and wallet withdrawals remain disabled.

## Build Impact

A fresh Customer Android AAB/APK is required because app icon/adaptive icon assets and production EAS env changed.

A fresh Captain Android AAB/APK is required because Captain icon/adaptive icon assets and launch-city application copy changed.

No backend redeploy, Prisma migration, Admin Portal deploy, Vendor Dashboard deploy or Website deploy is required for this task.
