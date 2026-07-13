# KariGO Soft Launch Go/No-Go Checklist - Task 103

Date prepared: 2026-07-13

## Decision Summary

Use this checklist before approving any controlled external soft launch. This checklist
does not authorize public production launch.

## Platform Readiness Checklist

| Area | Go condition | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| Backend health | `GET /api/v1/health` responds successfully | Pending | Technical Lead |  |
| Customer App | Current staging APK/EAS update installed and login/order flow passes | Pending | QA Lead |  |
| Vendor Dashboard | Vendor can log in and manage paid orders | Pending | Operations Lead |  |
| Admin Portal | Admin can monitor orders, dispatch, support, wallets, referrals and SME Services | Pending | Operations Lead |  |
| KariGO Captain App | Delivery Captain can accept, progress and complete assigned delivery | Pending | Dispatch Lead |  |
| Website | Public pages load, contact and vendor application remain safe | Pending | Marketing/Technical |  |
| CORS/domains | Branded Admin/Vendor domains work with authenticated dashboards | Pending | Technical Lead |  |
| Demo/pilot accounts | Accounts verified through secure handover only | Pending | QA Lead |  |

## Operational Readiness Checklist

| Area | Go condition | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| Pilot scope | Kano zones, pilot users, vendors and Delivery Captains are approved | Pending | Management/Ops |  |
| Dispatch coverage | Dispatch officer assigned for pilot window | Pending | Dispatch Lead |  |
| Support coverage | Support officer assigned for pilot window | Pending | Support Lead |  |
| Technical coverage | Technical responder assigned for pilot window | Pending | Technical Lead |  |
| Finance coverage | Settlement/refund reviewer assigned | Pending | Finance/Admin |  |
| Daily reporting | Daily monitoring tracker ready | Pending | Operations Lead |  |
| Incident escalation | Escalation matrix agreed | Pending | Operations Lead |  |
| Evidence handling | No secrets, OTPs, passwords or private data in Git | Pending | QA Lead |  |

## Feature Guardrail Checklist

| Feature | Required state | Status | Notes |
| --- | --- | --- | --- |
| Paystack | Mock by default; Test Mode only if separately approved | Pending | Live Paystack must remain off |
| Accelerate.ng utilities | Integration-ready concept only | Pending | No live fulfilment |
| Termii SMS | Integration-ready concept only | Pending | No live SMS |
| Wallet | View/admin-controlled foundation only | Pending | No top-up, withdrawal or automatic refund |
| Referrals | Tracking/admin review only | Pending | No automatic rewards |
| SME Services | Manual request/review/assignment only | Pending | No provider login or live dispatch |
| KariGO Rides | Readiness only | Pending | No live rides |
| Pharmacy | Readiness/compliance gated | Pending | No live marketplace launch |
| Payouts | Admin-recorded only where supported | Pending | No bank transfer automation |

## Go/No-Go Decision

| Decision option | Meaning |
| --- | --- |
| Go for controlled external soft launch | All critical checks pass, no P0/P1 issues, management signs off |
| Conditional go | Only accepted P2/P3 issues remain, owners and workarounds documented |
| Continue internal pilot | More internal evidence is needed before external users |
| No-go / pause | Any P0/P1 issue, secret exposure risk, data integrity issue or live-provider risk exists |

## Approval Record

| Approval item | Approve / Decline / Defer | Approver | Date | Notes |
| --- | --- | --- | --- | --- |
| Controlled soft launch scope |  |  |  |  |
| Pilot vendor list |  |  |  |  |
| Pilot Delivery Captain list |  |  |  |  |
| Pilot customer invite list |  |  |  |  |
| Payment mode | Mock / Paystack Test Mode / Defer |  |  |  |
| Support and escalation plan |  |  |  |  |
| Final go/no-go decision |  |  |  |  |

