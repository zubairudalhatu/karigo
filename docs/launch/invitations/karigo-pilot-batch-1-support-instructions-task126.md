# KariGO Pilot Batch 1 Support Instructions - Task 126

Date prepared: 2026-07-15
Pilot location: Kano

## Purpose

Provide support instructions for the first controlled Batch 1 invitations and
early access usage by vendors, Delivery Captains and customers.

This document does not activate live providers, live payments, live rides, payout
automation, wallet withdrawal/refund automation, marketing SMS/email or bulk
messaging.

## Support Principles

- Support Batch 1 participants through approved private pilot channels only.
- Do not ask participants to share passwords, OTP values, delivery codes or full
  payment details in chat.
- Do not collect unnecessary personal data.
- Do not paste private participant details into Git-tracked files.
- Use masked participant references in Git documentation.
- Escalate P0/P1 issues immediately to the pilot lead and technical lead.

## Support Coverage

| Role | Responsibility | Coverage requirement | Backup |
| --- | --- | --- | --- |
| Support Officer | First response to participant questions | Online during invite and test windows | `[Name]` |
| Dispatch Officer | Order assignment and delivery-flow support | Online when customer orders are allowed | `[Name]` |
| Operations Admin | Vendor/order/admin support | Online during active pilot window | `[Name]` |
| Technical Lead | API, app, login and incident investigation | On call during invite window | `[Name]` |
| Pilot Lead | Pause/continue decisions and participant control | Available for decision calls | `[Name]` |

## Participant Support Categories

| Category | Examples | First response owner | Escalation |
| --- | --- | --- | --- |
| APK install | Cannot install, old APK still opens, app crashes | Support Officer | Technical Lead |
| Login/registration | OTP issue, password issue, account inactive | Support Officer | Technical Lead |
| Vendor readiness | Dashboard login, product/menu issue, availability | Operations Admin | Pilot Lead |
| Delivery Captain readiness | Captain login, availability, job list, OTP completion | Dispatch Officer | Technical Lead |
| Customer ordering | Vendor browse, cart, checkout, mock payment, order tracking | Support Officer | Operations Admin |
| Dispatch | Rider assignment, delivery progression, job mismatch | Dispatch Officer | Pilot Lead |
| Payment mode | Mock payment confusion | Support Officer | Pilot Lead |
| Safety/privacy | Delivery code, wrong recipient, private data concern | Pilot Lead | Technical Lead |
| Incident | Crash, outage, duplicate orders, wrong status | Technical Lead | Pilot Lead |

## Standard Support Response Rules

- Acknowledge within the agreed support window.
- Confirm participant role and masked reference only.
- Ask for app surface, time of issue and safe screenshot if needed.
- Never ask for password, OTP or delivery code.
- Never ask for full phone number in Git or public channels.
- Confirm whether the issue blocks the participant from continuing.
- Record issue summary in the approved pilot issue register.

## Safe Response Templates

### APK Install Help

```text
Thanks for reporting this. Please confirm the app you are installing is the approved KariGO pilot APK shared through the private pilot channel. Do not forward the link. If Android blocks the install, send us a safe screenshot with personal details hidden.
```

### Login Or OTP Help

```text
Thanks. Please do not share your OTP or password. Confirm whether you used the same phone number approved for the pilot. If the OTP does not arrive after the resend window, we will escalate to technical support.
```

### Mock Payment Help

```text
KariGO's first pilot uses mock payment only. You should not be asked for a real card, bank transfer or live payment. If you see a live payment screen, stop and report it immediately.
```

### Delivery Code Help

```text
Only share the delivery code after you have received your order. Do not send the code in screenshots or chat unless operations specifically asks through the approved support route.
```

### Vendor Dashboard Help

```text
Please keep the Vendor Dashboard open during the pilot window and confirm only items that are available. If an order appears incorrectly, pause action on that order and report the order reference to operations.
```

### Delivery Captain Help

```text
Please stay in Delivery Captain mode for this pilot. KariGO Rides is readiness-only and live ride jobs are not active. For delivery completion, ask the customer for the code only after the order has been received.
```

## Escalation Timing

| Severity | Examples | Response target | Escalation |
| --- | --- | --- | --- |
| P0 | Outage, data exposure, live payment requested, unsafe delivery-code exposure | Immediate | Pilot Lead and Technical Lead |
| P1 | Login broken for many users, duplicate paid/mock orders, dispatch blocked | 15 minutes | Pilot Lead and Technical Lead |
| P2 | Single participant blocked, UI issue, delayed SMS, vendor menu correction | 1 hour | Role owner |
| P3 | Copy issue, minor layout issue, enhancement request | Same day | Record for backlog |

## Support Handover Log

| Date/time | Participant reference | Role | Issue category | Status | Owner | Escalated | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `[DD Month YYYY, HH:MM]` | `[Masked reference]` | `Customer / Vendor / Delivery Captain` |  | `Open / Resolved / Deferred` |  | `Yes / No` |  |
