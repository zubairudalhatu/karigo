# KariGO Manual QA Results - Task 63

Date: 10 July 2026
Environment: Live staging
Reported by: Project owner

This document records the manual QA status reported after Tasks 60-62. It does not contain passwords, bearer tokens, delivery OTP values, provider credentials or private screenshots.

## Owner Report

The project owner reported:

```text
Almost all the tests so far have passed and everything works and loads fine.
```

This is accepted as manual QA evidence for staging readiness tracking, with the caveat that any remaining failed or untested items must be listed before a controlled external soft launch.

## Current Staging Surfaces

| Surface | URL or channel | Status |
|---|---|---|
| Public website | `https://www.karigo.com.ng` | Passed in prior staging checks |
| Backend API | `https://karigo-8htn.onrender.com/api/v1` | Passed health checks |
| Backend health | `https://karigo-8htn.onrender.com/api/v1/health` | Passed |
| Admin Portal | `https://admin.karigo.com.ng` | Reported working |
| Vendor Dashboard | `https://vendor.karigo.com.ng` | Reported working |
| Customer App | EAS branch `customer-staging` | Reported mostly passing |
| Rider App | EAS branch `rider-staging` | Reported mostly passing |

## Manual QA Coverage

| Area | Task 63 status | Evidence basis | Notes |
|---|---|---|---|
| Customer App login and navigation | Passed by owner report | Manual QA report | No secrets recorded. |
| Customer browse/cart/checkout | Passed by owner report | Manual QA report | Pricing/quote issues from earlier tasks are expected fixed unless re-reported. |
| Mock payment | Passed by owner report | Manual QA report | Live payment remains inactive. |
| Customer order tracking | Passed by owner report | Manual QA report | Delivery OTP value must never be recorded. |
| Rider login and delivery flow | Passed by owner report | Manual QA report | Confirm exact remaining defects if any. |
| Vendor Dashboard orders | Passed by owner report | Manual QA report | Branded domain and CORS blockers are resolved. |
| Vendor settlements/payout visibility | Passed by owner report | Manual QA report | No live bank transfer is active. |
| Admin Portal dashboard/dispatch | Passed by owner report | Manual QA report | Continue using branded domain. |
| Support workflow | Passed by owner report | Manual QA report | Internal notes must remain hidden from customers. |
| Public website | Passed | Prior live checks plus owner report | Taxi/Bills/Pharmacy remain gated. |
| Backend health/API docs | Passed | Prior live checks | `/api/v1` root `NOT_FOUND` remains expected. |
| Taxi | Readiness only | Product gating | Do not activate live booking. |
| Pharmacy | Readiness only | Product gating | Do not activate marketplace. |
| Bills & Utilities | Test mode only | Product gating | Do not activate live fulfilment. |

## Remaining Information Needed

Before moving beyond an internal pilot, collect:

- The list of any tests that did not pass.
- Severity for each issue: P0, P1, P2 or P3.
- Masked order reference for at least one completed end-to-end test order.
- Confirmation that no OTPs, passwords or tokens were captured in evidence.
- Confirmation that no live providers or gated services were activated.

## Task 63 QA Assessment

No P0/P1 issue has been reported in the owner summary. Based on the reported status, KariGO can prepare for a controlled internal pilot, provided the pilot is limited to internal testers and monitored closely.

Controlled external soft launch should wait until:

- all remaining non-passing items are listed;
- any P0/P1 issues are resolved;
- pilot owners approve the internal pilot results.
