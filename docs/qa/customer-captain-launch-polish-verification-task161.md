# Task 161 - Customer/Captain Launch Polish Verification

Date: 2026-07-18

## Verification Scope

Use this checklist after the next Customer and Captain internal-testing builds are installed.

## Customer App Checks

| Test ID | Area | Expected Result | Status |
| --- | --- | --- | --- |
| CUST161-001 | Launcher icon | Full KariGO logo is visible and not badly cropped on Android launcher. | Pending |
| CUST161-002 | Splash/in-app logo | KariGO wordmark is clear on light background. | Pending |
| CUST161-003 | Home top bar | Header uses a clean light surface and logo remains readable. | Pending |
| CUST161-004 | Launch city copy | Welcome/home/referral surfaces reference Kano and Abuja. | Pending |
| CUST161-005 | Checkout provider list | Live public config shows only Squad by GTBank, with no Mock, Monnify or Paystack options. | Pending |
| CUST161-006 | Payment start | Squad checkout opens only through backend initialization. | Pending |
| CUST161-007 | Payment verification | Order is not marked paid until backend verification succeeds. | Pending |
| CUST161-008 | Wallet | Wallet remains view-only; no top-up, withdrawal, refund automation or wallet checkout is active. | Pending |
| CUST161-009 | Referral | Referral sharing is manual and does not issue rewards automatically. | Pending |

## Captain App Checks

| Test ID | Area | Expected Result | Status |
| --- | --- | --- | --- |
| CAP161-001 | Launcher icon | Full KariGO logo is visible and not badly cropped on Android launcher. | Pending |
| CAP161-002 | Application copy | Captain application supports Kano or Abuja launch review. | Pending |
| CAP161-003 | Delivery mode | Delivery Captain flow remains available for approved accounts. | Pending |
| CAP161-004 | Ride mode | KariGO Rides remains readiness-only; no live ride dispatch is active. | Pending |
| CAP161-005 | Payout safety | Payouts, withdrawals and live payment collection remain disabled. | Pending |

## Guardrails

- Do not record card details, tokens, OTPs, .env values or provider secrets in this checklist.
- Do not publish to production from this verification.
- Do not enable Monnify, Paystack or Mock as public live checkout options.
