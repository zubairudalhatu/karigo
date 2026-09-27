# Customer Data Safety worksheet

Source reviewed: Customer app auth/profile, addresses, Ride, orders, wallet/payment, Utilities, SME Services, uploads, support and account-deletion clients; Expo/native dependencies; backend contracts. All network traffic uses HTTPS. Final Play answers must be reconciled against production providers and the generated manifest.

| Data type | Collected | Shared | Purpose | Requirement / processing | Deletion |
| --- | --- | --- | --- | --- | --- |
| Name | Yes | With assigned operational parties where needed | Account and service fulfilment | Required; stored | Requestable, subject to retention |
| Phone number | Yes | With approved communication/operational providers where needed | Authentication, account and service coordination | Required; stored | Requestable, subject to retention |
| Email | Yes when supplied | Transactional email provider where enabled | Account and service messages | Optional; stored | Requestable |
| Profile photo | Yes when chosen | No public sharing by default | Account personalization | Optional; stored upload | Requestable |
| Precise/approximate location | Yes when permission granted | Maps/route and assigned operational parties | Address selection and Ride/service operation | Feature-dependent; current/operational storage | Requestable, with safety retention |
| Address | Yes | Assigned partner/Captain/provider as needed | Delivery and service fulfilment | Required for relevant service; stored | Requestable, with order retention |
| Payment information | Payment references/status and retained provider responses; instrument metadata scope requires review | Flutterwave and backend payment services | Checkout and wallet top-up | Feature-dependent; hosted payment; stored transaction metadata | Financial retention applies |
| Purchase/order history | Yes | Assigned partner/Captain | Order fulfilment, support, fraud/finance | Required for transaction; stored | Retention applies |
| Ride history | Yes | Assigned Captain and operations | Ride operation, safety and support | Required for Ride; stored | Retention applies |
| App interactions | Yes, operational events | No advertising sharing found | Reliability, security and support | Required operational logs; stored | Requestable/retention applies |
| Uploaded photos | Yes when chosen | Approved service parties only where needed | Profile/evidence | Optional; stored | Requestable |
| Uploaded documents | Not a normal Customer feature | No | Not applicable | Not collected by current app | Not applicable |
| Device/session identifiers | Yes | Authentication/infrastructure providers | Secure session and abuse prevention | Required; stored/rotated | Requestable/retention applies |
| Crash logs / diagnostics | SDK-specific collection requires disclosure; absence of a dedicated crash SDK is not evidence of no collection | Provider-specific; see reconciliation | Functionality and documented SDK diagnostics/analytics | Retention varies; do not assume ephemeral | Provider retention applies |
| Notifications | Notification records/preferences may be stored; no contact-list access | Approved delivery provider if enabled | Transactional account/service updates | Optional/configuration-dependent | Requestable |
| Business details | Only details submitted in a partner/application flow | Admin review | Application processing | Optional feature; stored | Requestable/retention applies |

No contacts, call logs, broad storage, marketing advertising ID or background location use was identified. **OWNER CONFIRMATION REQUIRED** for final provider-sharing and Expo telemetry declarations.

September 2026 audit: This worksheet is not a finalized Console declaration. See `../provider-data-safety-reconciliation-2026-09-27.md` for recipient/data-type exceptions and unresolved evidence. Console drafts are incomplete and must not be represented as approved.
