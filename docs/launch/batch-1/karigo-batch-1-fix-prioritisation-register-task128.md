# KariGO Batch 1 Fix Prioritisation Register - Task 128

Date prepared: 2026-07-15
Pilot location: Kano

## Purpose

Prioritise issues found during Batch 1, assign owners and define fix/retest
expectations before the pilot continues or expands.

This is an operational fix-planning document only. It does not activate new
features or live providers.

## Priority Definitions

| Priority | Meaning | Continue rule |
| --- | --- | --- |
| P0 | Critical safety, data, payment, access-control or total outage issue | Stop/pause immediately |
| P1 | Blocks ordering, vendor handling, dispatch, completion or support at pilot scale | Pause affected flow before expansion |
| P2 | Important issue with workaround | May continue with approved condition |
| P3 | Minor usability, copy or reporting issue | Track for normal backlog |

## Fix Prioritisation Register

| Fix ID | Source issue ID | Area | Priority | Problem summary | Required fix or action | Owner | Target date/time | Retest required | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FIX-B1-001` | `B1-128-001` |  | `P0 / P1 / P2 / P3` |  |  |  |  | `Yes / No` | `Open / In progress / Fixed / Deferred` |  |
| `FIX-B1-002` | `B1-128-002` |  |  |  |  |  |  |  |  |  |
| `FIX-B1-003` | `B1-128-003` |  |  |  |  |  |  |  |  |  |

## Area-Based Review

| Area | Open issues | Highest priority | Can continue? | Required action |
| --- | --- | --- | --- | --- |
| Customer App |  |  | `Yes / No / Conditional` |  |
| Vendor Dashboard |  |  | `Yes / No / Conditional` |  |
| Admin Portal |  |  | `Yes / No / Conditional` |  |
| KariGO Captain App |  |  | `Yes / No / Conditional` |  |
| Backend/API |  |  | `Yes / No / Conditional` |  |
| Notifications |  |  | `Yes / No / Conditional` |  |
| Operations/support |  |  | `Yes / No / Conditional` |  |
| Launch communications |  |  | `Yes / No / Conditional` |  |

## Retest Plan

| Retest ID | Fix ID | Scenario to retest | Tester | Required evidence | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RETEST-B1-001` | `FIX-B1-001` |  |  | Masked evidence only | `Pass / Fail / Blocked` |  |
| `RETEST-B1-002` | `FIX-B1-002` |  |  | Masked evidence only | `Pass / Fail / Blocked` |  |

## Fix Freeze Rules

- Do not expand customer invitations while any P0 issue is open.
- Do not expand customer invitations while any unresolved P1 blocks order
  placement, vendor handling, dispatch, delivery-code completion or support.
- P2 issues may continue only if the pilot lead approves the workaround.
- P3 issues can move to backlog if they do not affect safety, payments, privacy,
  delivery completion or support.
- Do not activate live payments, live rides, payouts, utilities or wallet
  automation as a "fix" for Batch 1.

## Fix Review Decision

| Decision item | Record |
| --- | --- |
| P0 issues open | `No / Yes - issue IDs` |
| P1 issues open | `No / Yes - issue IDs` |
| P2 issues accepted with workaround | `No / Yes - issue IDs` |
| Retest required before expansion | `No / Yes - retest IDs` |
| Fix plan recommendation | `Continue / Conditional continue / Pause / Stop` |
| Decision owner | `[Name]` |
| Decision date/time | `[DD Month YYYY, HH:MM WAT]` |
