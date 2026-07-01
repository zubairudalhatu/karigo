# Final Launch Risk Register

| Risk | Category | Severity | Likelihood | Mitigation | Owner | Launch impact |
| --- | --- | --- | --- | --- | --- | --- |
| Backend downtime | Technical | Critical | Medium | HA hosting, health checks, alerts, rollback/runbook | DevOps | Blocks orders |
| Database failure/data loss | Technical | Critical | Medium | Managed PostgreSQL, backups, restore rehearsal, least privilege | DevOps/DBA | Blocks platform; data risk |
| Payment verification/refund failure | Technical/Finance | Critical | Medium | Paystack staging certification, signed webhooks, reconciliation, admin controls | Backend/Finance | Blocks real payments |
| OTP delivery/rate-limit failure | Technical/Security | Critical | Medium | Termii staging, distributed limits, monitoring, fallback process | Backend/Operations | Blocks registration/login |
| Order status transition bug | Technical | High | Low | Automated transition tests and smoke suite | Backend/QA | Fulfilment disruption |
| Dispatch assignment bug | Technical/Operations | High | Medium | Dispatch rehearsal, role controls, manual escalation | Operations/Backend | Delivery delay |
| Notification failure | Technical | Medium | Medium | In-app primary channel, monitoring, non-blocking external sends | Backend/Support | Reduced visibility |
| Mobile/web crash | Technical | High | Medium | Physical-device/browser QA and crash monitoring | Mobile/Web/QA | User abandonment |
| Vendor delay/wrong item | Operational | High | High | Onboarding standards, SLA, rejection/escalation process | Vendor Ops | Trust/refund risk |
| Rider no-show/customer unreachable | Operational | High | Medium | Reassignment and contact/escalation runbooks | Dispatch | Delivery failure |
| Refund dispute | Operational/Finance | High | Medium | Approved refund policy, auditable support/admin workflow | Finance/Support | Trust/financial risk |
| Support overload | Operational | High | Medium | Staffing, prioritisation, escalation and daily review | Support Lead | Slow resolution |
| Manual settlement error | Operational/Finance | High | Medium | Dual review, audit logs, reconciliation | Finance | Payout dispute |
| Policies/agreements not approved | Legal | Critical | High | Legal sign-off before customer pilot | Legal/Product | Blocks launch |
| Data-protection/privacy gap | Legal/Security | Critical | Medium | Privacy/security review, minimisation, access audit | Legal/Security | Blocks launch |
| Low vendor adoption/rider shortage | Business | High | Medium | Confirm pilot supply before launch | Operations/Growth | Poor service availability |
| Customer trust/delivery delays | Business | High | Medium | Controlled geography/hours, proactive support, monitoring | Product/Ops | Retention risk |
| Promo abuse/high refund rate | Business/Finance | Medium | Medium | Usage limits, reporting, daily fraud/refund review | Product/Finance | Margin risk |

## Current Risk Decision

Risk is acceptable for an internal mock-provider demo. It is acceptable for staging
deployment with synthetic data. It is not acceptable for a real-customer controlled
soft launch until all critical risks have evidence-backed mitigations and named owners.
