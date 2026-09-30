# Account deletion retention matrix — 30 September 2026

This matrix separates current behavior from the recommended target. `RETAIN_FOR_DEFINED_REASON` is used only where the implementation records a reason. It does not assert a statutory basis or duration. Every retention duration and legal basis marked below needs owner/legal approval.

| Scope | Record group | Current behavior | Target classification | Required decision/evidence |
| --- | --- | --- | --- | --- |
| All | User identity, contact, password/profile fields | Account is deactivated/soft-deleted; identity is not broadly anonymized | `UNRESOLVED` | Define deletion vs irreversible anonymization, collision handling, fraud/security exceptions and schedule. |
| All | Addresses and precise coordinates | Relational rows/history may remain | `UNRESOLVED` | Define operational evidence need and anonymization boundaries. |
| All | Refresh tokens, device tokens, biometric credentials | Refresh tokens revoked; full row/token deletion is not established for every type | `DELETE` target | Implement and prove physical deletion/revocation for all credential/token types. |
| Customer | Orders, deliveries and status history | Retained | `UNRESOLVED` | Owner/legal decision for fulfilment, disputes and accounting; define anonymization and duration. |
| Customer/Captain | Ride trips, traces, location events, financial ledgers/refunds | Retained | `UNRESOLVED` | Define safety/dispute/financial purpose, minimization, access and duration. |
| All | Payments, wallet, settlement, payout and reconciliation references | Retained; new provider evidence allowlisted | `UNRESOLVED` | Finance/legal approval for fields and duration; run legacy JSON cleanup first. |
| Customer | Support tickets, messages and attachments | Retained | `UNRESOLVED` | Define deletion/anonymization and dispute/security exceptions. |
| All | Notifications | Retained | `DELETE` target | Delete message bodies/metadata when no defined reason remains. |
| Captain | Unattached application documents | Physical delete implemented with retry/failure state | `DELETE` | Deploy durable provider path and verify provider deletion. |
| Captain | Documents attached to active/approved application | Explicit `ACTIVE_APPLICATION_EVIDENCE` state | `RETAIN_FOR_DEFINED_REASON` | Owner/legal must approve purpose and duration; implement expiry review. |
| Partner | Unapproved private onboarding documents | Physical delete path and manifest state implemented | `DELETE` | Provision durable object storage and migrate legacy public items. |
| Partner | Approved onboarding evidence | Explicit `APPROVED_ONBOARDING_EVIDENCE` state | `RETAIN_FOR_DEFINED_REASON` | Owner/legal must approve purpose and duration; implement expiry review. |
| Partner | Public catalogue/service/logo/cover media | Separate public-media lifecycle | `DELETE` when account/content removed, unless a documented listing obligation remains | Define cache/CDN invalidation and public-source removal evidence. |
| All | Audit, login and security records | Retained | `UNRESOLVED` | Define minimum fields, security purpose, restricted access and duration. |
| All | Provider-side records | No general provider deletion orchestration | `UNRESOLVED` | Confirm each provider process, DPA/role, deletion/export contact and evidence. |
| All | Account deletion request/audit outcome | Retained | `RETAIN_FOR_DEFINED_REASON` candidate | Owner/legal must approve minimal proof fields and duration; do not retain request reason unnecessarily. |

Completion must not be reported while an eligible physical deletion remains `PENDING_EXTERNAL_DELETION` or `DELETION_FAILED`. Retained rows need an allowed reason, and provider-side work needs separate evidence.
