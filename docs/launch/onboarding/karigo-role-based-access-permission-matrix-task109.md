# KariGO Role-Based Access Permission Matrix - Task 109

Date prepared: 2026-07-13

## Purpose

Define which pilot participants may access each KariGO surface during controlled early
access in Kano.

## Access Matrix

| Role | Customer App | Vendor Dashboard | KariGO Captain App | Admin Portal | Website | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Pilot customer | Allowed | Not allowed | Not allowed | Not allowed | Allowed | Customer can browse/order and use support |
| Vendor owner/manager | Not required | Allowed | Not allowed | Not allowed | Allowed | Vendor sees own products, orders and settlements only |
| Delivery Captain | Not required | Not allowed | Allowed | Not allowed | Allowed | Delivery mode only; Ride Captain readiness-only |
| Operations Admin | Testing only if assigned | Testing/support only if assigned | Testing/support only if assigned | Allowed | Allowed | Admin actions must be role-approved |
| Support Officer | Testing only if assigned | View/support only if approved | View/support only if approved | Allowed if role permits | Allowed | No password/OTP collection |
| Technical Lead | Testing only if needed | Testing only if needed | Testing only if needed | Allowed if role permits | Allowed | No secret sharing in docs |
| External observer | Not allowed unless approved | Not allowed | Not allowed | Not allowed | Allowed | No private pilot access |

## Permission Rules

- Customers must not access vendor, Captain or Admin surfaces.
- Vendors must not access customer, Captain or Admin surfaces.
- Delivery Captains must not access customer, vendor or Admin surfaces.
- Operations/Admin users must use only approved admin roles.
- Public website access does not equal pilot app access.
- No participant may share APK links, login details, OTPs, delivery codes or screenshots
  containing sensitive data.

## Sensitive Data Rules

| Data type | Access rule |
| --- | --- |
| Passwords | Never recorded or requested in support chat |
| OTPs | Never recorded in Git-tracked docs |
| Delivery codes | Customer-controlled; never shown to vendor/admin/Captain before handoff |
| Payment details | Never requested in support chat |
| Provider keys | Never shared with participants |
| Device tokens | Not shared outside technical systems |
| Private phone numbers | Masked or stored only in approved private roster |

## Feature Guardrails

| Feature | Required pilot state |
| --- | --- |
| Paystack | Mock by default; Test Mode only if separately approved |
| Accelerate.ng utilities | Future integration; not live |
| Termii SMS | Future integration; not live |
| Wallet withdrawals | Disabled |
| Automatic refunds | Disabled |
| KariGO Rides | Readiness-only; no live trips |
| Payouts | No automation |
| Pharmacy marketplace | Readiness/compliance gated |
| Provider login | Not active |

