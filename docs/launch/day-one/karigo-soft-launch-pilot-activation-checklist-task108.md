# KariGO Soft Launch Pilot Activation Checklist - Task 108

Date prepared: 2026-07-13
Pilot location: Kano
Pilot duration: 7 to 14 days

## Purpose

Use this checklist before starting the first controlled early access pilot day in Kano.
This document is for launch operations only. It does not activate live Paystack, live
Accelerate.ng utilities, live Termii SMS, wallet withdrawals, automatic refunds, live
rides, ride dispatch, payouts, Pharmacy marketplace or provider login.

## Pilot Scope

| Area | Scope |
| --- | --- |
| Location | Kano |
| Pilot vendors | 3 to 5 |
| Pilot customers | 20 to 50 |
| Delivery Captains | 3 to 5 |
| Operations admins | 2 to 3 |
| Pilot duration | 7 to 14 days |
| Payment mode | Mock by default; Paystack Test Mode only if separately approved |
| Utilities | Not live |
| SMS | Not live |
| Wallet | View/admin-controlled foundation only |
| Rides | Readiness-only |
| Pharmacy | Readiness/compliance gated |

## Final Activation Checklist

| Check | Required state | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| Management approval | Signed release candidate and day-one approval | Pending | Pilot Lead |  |
| Release candidate log | Customer/Captain APK links and web deploy checks recorded | Pending | QA Lead |  |
| Backend health | `https://karigo-8htn.onrender.com/api/v1/health` passes | Pending | Technical Lead |  |
| Website | `https://www.karigo.com.ng` opens | Pending | Technical Lead |  |
| Admin Portal | `https://admin.karigo.com.ng` opens and admin logs in | Pending | Admin Lead |  |
| Vendor Dashboard | `https://vendor.karigo.com.ng` opens and pilot vendor logs in | Pending | Vendor Coordinator |  |
| Customer App | Approved Customer App APK/update installed on pilot devices | Pending | QA Lead |  |
| KariGO Captain App | Approved Captain APK/update installed on pilot devices | Pending | QA Lead |  |
| Pilot vendors | 3 to 5 vendors confirmed online/available | Pending | Vendor Coordinator |  |
| Pilot customers | 20 to 50 approved customers invited | Pending | Pilot Lead |  |
| Delivery Captains | 3 to 5 Delivery Captains confirmed available | Pending | Captain Coordinator |  |
| Operations admins | 2 to 3 admins assigned for command centre | Pending | Operations Lead |  |
| Support channel | Support channel open and monitored | Pending | Support Lead |  |
| Dispatch channel | Dispatch owner online and monitoring assignments | Pending | Dispatch Lead |  |
| Incident log | Incident-response document open and ready | Pending | QA Lead |  |
| Evidence log | Evidence/signoff log open and masking rules understood | Pending | QA Lead |  |
| Provider guardrails | Live Paystack, Accelerate.ng, Termii, rides and payouts remain off | Pending | Technical Lead |  |

## Activation Decision

| Decision | Meaning |
| --- | --- |
| Activate day-one pilot | All P0/P1 checks are green and owners are online |
| Activate with conditions | Minor P2/P3 issues accepted by Pilot Lead |
| Hold | Any P0/P1 risk, missing owner, missing build, failed login or health issue |
| Cancel day-one | Security, privacy, payment integrity or operational control risk |

## Approval Record

| Role | Name | Decision | Date/time | Notes |
| --- | --- | --- | --- | --- |
| Pilot Lead |  | Activate / Hold / Cancel |  |  |
| Operations Lead |  | Activate / Hold / Cancel |  |  |
| Technical Lead |  | Activate / Hold / Cancel |  |  |
| Support Lead |  | Activate / Hold / Cancel |  |  |
| QA Lead |  | Activate / Hold / Cancel |  |  |

