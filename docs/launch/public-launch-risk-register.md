# Public Launch Risk Register

| Risk | Category | Severity | Likelihood | Mitigation | Owner | Launch impact | Review frequency |
| --- | --- | --- | --- | --- | --- | --- | --- |
| API downtime | Technical | Critical | Medium | HA hosting, health alerts, capacity test, rollback | DevOps | Stops platform | Live/daily |
| Database failure | Technical | Critical | Medium | Managed DB, backups, restore rehearsal | DevOps/DBA | Data/order outage | Daily |
| Payment failure | Technical | Critical | Medium | Certified provider, verification, webhooks, reconciliation | Backend/Finance | Blocks purchase | Live |
| OTP delivery failure | Technical | Critical | Medium | Certified provider, rate limits, monitoring, fallback | Backend/Ops | Blocks registration/login | Live |
| App crash | Technical | High | Medium | Device QA, crash monitoring, staged rollout | Mobile/QA | Customer/rider failure | Live/daily |
| Dashboard outage | Technical | High | Medium | Browser QA, uptime/error monitoring, rollback | Web/DevOps | Operations/partner failure | Live/daily |
| Notification failure | Technical | Medium | Medium | In-app fallback, delivery telemetry | Backend/Support | Missed updates | Daily |
| Too many orders for riders | Operational | Critical | Medium | Zone/order caps, reserve riders, pause intake | Operations/Dispatch | Failed deliveries | Per shift |
| Vendor preparation delays | Operational | High | High | SLA, capacity controls, pause vendor | Vendor Ops | Late orders | Daily |
| Rider no-show | Operational | High | Medium | Attendance controls, reassignment, reserve rider | Dispatch | Failed/late delivery | Per shift |
| Customer complaints | Operational | High | High | Support SLA, issue categories, corrective actions | Support Lead | Trust loss | Daily |
| Support overload | Operational | High | Medium | Staffing thresholds, priorities, overflow process | Support Lead | Slow resolution | Daily |
| Refund disputes | Operational | High | Medium | Approved policy, evidence, finance escalation | Support/Finance | Trust/legal risk | Daily |
| Settlement delays | Operational | High | Medium | Reconciliation calendar, dual review, escalation | Finance | Partner churn | Daily/weekly |
| Payment reconciliation errors | Financial | Critical | Medium | Automated/manual reconciliation, exception queue | Finance/Backend | Financial loss | Daily |
| Promo abuse | Financial | High | Medium | Limits, eligibility validation, fraud review | Product/Finance | Margin loss | Daily |
| High refund rate | Financial | High | Medium | Root-cause review, vendor/rider controls | Finance/Ops | Margin/trust loss | Daily |
| Incorrect vendor settlement | Financial | Critical | Low/Medium | Dual approval, audit logs, reconciliation | Finance | Vendor dispute | Per payout |
| Incorrect rider earnings | Financial | High | Low/Medium | Earning verification, dual payout review | Finance/Ops | Rider dispute | Per payout |
| Policy gap | Legal/Compliance | Critical | Medium | Legal review and published approved policies | Legal/Product | Blocks launch | Prelaunch/quarterly |
| Data privacy concern | Legal/Compliance | Critical | Medium | Privacy/security assessment, minimisation, controls | Legal/Security | Blocks launch | Live/monthly |
| Vendor dispute | Legal/Compliance | High | Medium | Signed agreement and evidence trail | Legal/Vendor Ops | Service/reputation risk | Weekly |
| Rider dispute | Legal/Compliance | High | Medium | Signed agreement and documented earnings/actions | Legal/Ops | Service/reputation risk | Weekly |
| Customer refund complaint | Legal/Compliance | High | Medium | Clear policy, support evidence, finance review | Legal/Support | Regulatory/trust risk | Daily |
| Failed delivery experience | Reputation | High | High | Rapid dispatch/support recovery and review | Operations | Customer trust loss | Live/daily |
| Public social complaint | Reputation | High | Medium | Approved response owner and incident escalation | Marketing/Management | Brand damage | Live |
| Slow support response | Reputation | High | Medium | SLA dashboard, staffing, escalation | Support Lead | Customer churn | Daily |
| Poor vendor experience | Reputation | High | Medium | Onboarding, support, settlement transparency | Vendor Ops | Vendor churn | Weekly |

Open Critical risks block public launch. High risks require named mitigation evidence,
accepted residual risk, monitoring, and a rollback/pause trigger.
