# Partner Data Safety worksheet

Source reviewed: Partner auth/onboarding, business profile, products/services, orders, uploads, earnings/settlements, notifications and deletion; Expo/native dependencies; backend contracts. Traffic uses HTTPS.

| Data type | Collected | Shared | Purpose | Requirement / processing | Deletion |
| --- | --- | --- | --- | --- | --- |
| Name | Yes | Operations and safe customer-facing business identity where applicable | Account/business operation | Required; stored | Requestable, subject to retention |
| Phone number | Yes | Operations; private contact is not public by default | Authentication and support | Required; stored | Requestable, subject to retention |
| Email | Yes when supplied | Transactional provider where enabled | Account/application messages | Optional/approval-dependent; stored | Requestable |
| Profile/business photos | Yes when chosen | Customers on approved listings | Business presentation | Optional; stored | Requestable |
| Precise/approximate device location | No current GPS feature identified | No | Not applicable | Not collected by current app | Not applicable |
| Business address/service areas | Yes | Customers/operations where relevant | Discovery and fulfilment | Required by partner type; stored | Requestable, transaction retention applies |
| Settlement information | Yes when entered | Approved finance/banking providers and operations | Settlement preparation | Optional until configured; stored securely | Financial retention applies |
| Purchase/order history | Yes | Customer/Captain/operations within each order | Fulfilment, support and finance | Required; stored | Retention applies |
| Service activity | Yes | Customer/operations | Service catalogue and requests | Required for Service Providers; stored | Retention applies |
| App interactions | Yes | No advertising sharing found | Audit, security and reliability | Required operational logs | Requestable/retention applies |
| Uploaded photos/documents | Yes | Admin/review and customers for approved public listing images | Onboarding, compliance and catalogue | Feature-dependent; stored | Requestable, compliance retention applies |
| Device/session identifiers | Yes | Authentication infrastructure | Secure session and abuse prevention | Required; stored/rotated | Requestable/retention applies |
| Crash logs / diagnostics | SDK-specific collection requires review; absence of a dedicated crash SDK is not evidence of no collection | Provider-specific; see reconciliation | Functionality and documented SDK diagnostics/analytics | Retention varies; do not assume ephemeral | Provider retention applies |
| Notifications | Notification records/preferences may be stored | Approved delivery provider if enabled | Order/account updates | Configuration-dependent | Requestable |
| Business details | Yes | Customers and operations according to approval/publication | Partner operation | Required; stored | Requestable, transaction retention applies |

No contacts, SMS, call-log, background location or broad-storage access was identified. **OWNER CONFIRMATION REQUIRED** for final telemetry, settlement-provider and notification-provider declarations.

September 2026 audit: This worksheet is not a finalized Console declaration. See `../provider-data-safety-reconciliation-2026-09-27.md` for recipient/data-type exceptions and unresolved evidence. Console drafts are incomplete and must not be represented as approved.
