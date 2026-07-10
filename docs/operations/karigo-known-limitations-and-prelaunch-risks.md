# KariGO Known Limitations and Pre-Launch Risks

This register captures limitations that must be understood before public production launch.

## Product Limitations

| Area | Current state | Launch risk | Required action |
|---|---|---|---|
| Taxi | Readiness plus staging-only Taxi dispatch foundation. | Customers may misunderstand test Taxi as live. | Keep flags off publicly; complete legal, safety, maps, fare and operations approval before launch. |
| Bills and Utilities | Test mode catalogue and transactions. | Users may expect real airtime/data/electricity/cable fulfilment. | Keep test-mode copy visible; integrate approved providers before live use. |
| Pharmacy | Readiness-gated. | Compliance exposure if activated too early. | Legal/regulatory review before marketplace activation. |
| Payouts | Admin recordkeeping and mark-paid workflows. | Mistaking mark-paid for live bank transfer. | Add approved payout/bank transfer provider before automated payouts. |
| Public app stores | Internal APK/EAS distribution only. | Public users cannot install from stores yet. | Prepare Play Store/App Store listings and compliance material. |

## Provider Limitations

- No live payment provider should be enabled without final go-live approval.
- No live SMS, email, WhatsApp or push provider should be enabled without sandbox evidence and approval.
- No real utility merchant API is connected.
- No live Taxi maps/geolocation/fare billing provider is connected.
- No live Taxi emergency/SOS integration is connected.

## Operational Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Support team not fully staffed | Slow complaint handling. | Assign support officer and escalation owner before pilot. |
| Dispatch team not ready | Delivery delays and reassignment confusion. | Run daily dispatch drills before launch. |
| Vendor response delays | Paid orders may wait too long. | Train vendors and monitor acceptance rate. |
| Rider shortage | Failed or late deliveries. | Confirm rider roster and backup riders. |
| Manual settlement mistakes | Finance disputes. | Daily reconciliation and dual review. |
| Promo abuse | Margin loss. | Monitor usage and enforce limits. |

## Legal and Policy Risks

- Terms of Service must be reviewed.
- Privacy Policy must be reviewed.
- Refund Policy must be reviewed.
- Vendor Agreement must be reviewed.
- Rider Agreement must be reviewed.
- Data protection review must be completed.
- Taxi-specific regulatory requirements must be completed before public Taxi launch.
- Pharmacy compliance requirements must be completed before live Pharmacy.

## Technical Risks

- Render cold starts may affect first request latency.
- Staging seed credentials must be reset securely and not recorded in Git.
- Mobile internal APKs may become outdated after backend/API changes.
- CORS must include approved custom domains and fallback Vercel domains.
- Logs must not expose OTPs, passwords, tokens or provider secrets.

## Required Pre-Launch Decisions

- Confirm final launch zones.
- Confirm vendor/rider onboarding targets.
- Approve public launch promotion.
- Approve provider go-live sequence.
- Approve support/dispatch/finance staffing.
- Approve legal and policy review completion.
