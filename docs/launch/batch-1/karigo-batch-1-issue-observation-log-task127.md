# KariGO Batch 1 Issue Observation Log - Task 127

Date prepared: 2026-07-15
Pilot location: Kano

## Purpose

Record observations, support issues, incidents and follow-up actions during Batch
1 activation, internal test order and first real pilot order.

Do not record passwords, OTP values, delivery codes, full phone numbers, private
addresses, tokens, private APK links, provider keys, bank details or unmasked
screenshots.

## Severity Guide

| Severity | Meaning | Examples | Required action |
| --- | --- | --- | --- |
| P0 | Stop immediately | Data exposure, live payment requested, unsafe delivery-code exposure | Pause activation and escalate |
| P1 | Blocks pilot flow | Login outage, order cannot complete, dispatch broken, repeated duplicate orders | Pause affected flow |
| P2 | Workaround available | Single user blocked, delayed SMS, UI confusion, vendor menu correction | Record and assign owner |
| P3 | Minor observation | Copy issue, layout issue, improvement idea | Record for backlog |

## Observation Log

| Issue ID | Time | Phase | Role affected | Severity | Observation | Immediate action | Owner | Status | Blocks expansion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `B1-127-001` | `[HH:MM]` | `Activation / Internal order / First real order` | `Customer / Vendor / Captain / Admin / Support` | `P0 / P1 / P2 / P3` |  |  |  | `Open / Closed / Deferred` | `Yes / No` |
| `B1-127-002` | `[HH:MM]` |  |  |  |  |  |  |  |  |
| `B1-127-003` | `[HH:MM]` |  |  |  |  |  |  |  |  |

## Known Guardrail Checks

| Guardrail | Expected state | Observed state | Status | Notes |
| --- | --- | --- | --- | --- |
| Mock payment | Only mock payment is used |  | `Pass / Fail` |  |
| Live Paystack/Monnify/Squad | Not active for pilot |  | `Pass / Fail` |  |
| Accelerate.ng utilities | Inactive |  | `Pass / Fail` |  |
| KariGO Rides | Readiness-only |  | `Pass / Fail` |  |
| Live rides/ride dispatch | Disabled |  | `Pass / Fail` |  |
| Payout automation | Disabled |  | `Pass / Fail` |  |
| Wallet withdrawal/refund automation | Disabled |  | `Pass / Fail` |  |
| Pharmacy marketplace | Not active |  | `Pass / Fail` |  |
| Bulk messaging | Not used |  | `Pass / Fail` |  |

## Follow-Up Action Register

| Action ID | Related issue | Required action | Owner | Due date/time | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `B1-ACT-001` |  |  |  |  | `Open / Closed / Deferred` |  |
| `B1-ACT-002` |  |  |  |  |  |  |

## End-Of-Activation Issue Summary

| Summary item | Record |
| --- | --- |
| Total P0 issues | `[0]` |
| Total P1 issues | `[0]` |
| Total P2 issues | `[0]` |
| Total P3 observations | `[0]` |
| Expansion blockers open | `No / Yes - issue IDs` |
| Support backlog acceptable | `Yes / No` |
| Technical lead recommendation | `Go / Conditional Go / Pause / No-Go` |
