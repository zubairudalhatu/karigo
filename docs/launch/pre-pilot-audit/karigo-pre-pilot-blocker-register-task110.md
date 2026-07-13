# KariGO Pre-Pilot Blocker Register - Task 110

Date prepared: 2026-07-13

## Purpose

Track blockers before inviting real Kano pilot participants.

## Severity Guide

| Severity | Meaning | Action |
| --- | --- | --- |
| P0 | Security, privacy, payment integrity, cross-tenant data, live-provider activation or total core-flow failure | No-Go |
| P1 | Core pilot role cannot complete required flow | No-Go or Conditional only after fix |
| P2 | Workaround exists but pilot quality affected | Conditional Go possible |
| P3 | Cosmetic/docs/minor operations issue | Track and proceed if accepted |

## Blocker Register

| Blocker ID | Area | Severity | Description | Owner | Status | Target resolution | Go/No-Go impact | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T110-BLK-001 |  | P0/P1/P2/P3 |  |  | Open |  |  |  |

## Automatic No-Go Blockers

- Live Paystack enabled.
- Paystack Test Mode enabled without explicit approval.
- Live Accelerate.ng utility fulfilment enabled.
- Live Termii SMS enabled.
- Wallet withdrawal or automatic refund enabled.
- Live rides or ride dispatch enabled.
- Payout automation enabled.
- Pharmacy marketplace enabled.
- Provider login enabled.
- Delivery code visible outside owning customer flow.
- Wrong vendor/customer/Captain data visible to another role.
- Customer/Captain APK links are unapproved or public.
- Support/dispatch/technical owner missing for pilot window.

## Closure Rules

A blocker can close only when:

- owner confirms resolution;
- QA or operations retest is recorded;
- evidence is safe and masked;
- Pilot Lead accepts closure;
- go/no-go record is updated.

