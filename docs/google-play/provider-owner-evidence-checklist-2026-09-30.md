# Provider owner evidence checklist — 30 September 2026

Store these records in the approved private compliance vault. Do not put credentials, secret values, card data, access tokens or private keys in the repository.

| Provider | Exact owner evidence needed | Decision unlocked |
| --- | --- | --- |
| Flutterwave | Merchant account legal entity; accepted Merchant/Payment Services Terms with version/effective date; incorporated DPA or controller/processor schedule; enabled products; subprocessor/financial-partner terms; checkout configuration showing hosted collection; returned-field sample with personal values redacted; retention/fraud/KYC obligations. | Whether each Customer/Captain/Partner payment flow is exempt as user-initiated, shared for independent processing, and whether any payment-account field reaches KariGO. |
| Agora | Account/customer agreement and DPA; product list; current recording/cloud-recording setting; analytics/diagnostic options; region and retention overrides; confirmation that only RTC is enabled. | Voice stream ephemeral status and service-provider exception for voice/RTC metadata. |
| Expo/EAS | Organization/account plan; terms version accepted; any order form/DPA; production project IDs and channels; Updates retention; push-service use and retention; subprocessor notice record. | Service-provider treatment for update/push payload and treatment of independent telemetry. |
| Firebase/Google Cloud | Project identity; applicable Firebase/GCP Terms and data-processing terms; enabled Firebase products; direct FCM sender state; Service Data settings; retention/location configuration. | Whether direct FCM is active and which token/delivery/service-data rows must be declared. |
| Google Maps | Billing account legal entity and accepted Maps Terms version; enabled APIs for Customer and Captain; API restriction list; server and Android usage inventory; retention/settings if available. | Final field mapping for precise/approximate location, searches, interactions, diagnostics and identifiers. Controller-to-controller sharing remains required for active Maps flows. |
| Resend | Account legal entity; accepted Terms/DPA version or executed dashboard DPA; production domain; retention/log settings; enabled email streams; subprocessor notice record. | Confirms the already well-supported service-provider exception for email payloads and separates service telemetry. |
| Termii | Production selector evidence; account/API agreement and DPA; sender IDs/products; carrier/aggregator chain; message/content/log retention; security/fraud/analytics terms. | Whether Termii is active and whether phone/message data is shared or exempt. |
| Render | Workspace legal entity/plan; accepted Terms/DPA version or downloaded account DPA; PostgreSQL linkage; backup and deletion settings; service-log/telemetry fields and retention; disk/filesystem persistence for Partner uploads. | Final Render telemetry classification and Partner file durability/deletion claims. |
| Captain object storage | Provider legal name; service/account identifier; region; bucket purpose; accepted agreement/DPA; encryption at rest/default bucket encryption; TLS; public-access block and IAM policy summary; object lock/versioning; lifecycle/retention; backups/replication; deletion behavior and audit logs. | Removes the storage blocker and decides service-provider exception, region, access and deletion claims. |
| Vercel | Current production project and plan; legal entity; accepted Terms/DPA version; form/serverless routes; analytics/logging settings and retention; subprocessors. | Whether any website data is processor-hosted and whether any website flow belongs in a mobile declaration. |
| Accelerate/iRecharge | Production feature/selector state; merchant/API agreement/DPA; endpoints/products; recipient data; response retention; subprocessors. | Whether Utilities data is present in the Customer form. |
| Meta WhatsApp | Production selector/approval state; WhatsApp Business terms/DPA; template list; phone/content retention and recipients. | Whether any phone/message-content flow is active. |

## Storage remediation evidence

The current Captain removal path updates database status only. It does not issue an S3 `DeleteObject` request. Before asserting deletion, implement or document an approved retention hold, object deletion for eligible removals/replacements, version cleanup where enabled, and backup-expiry behavior. Partner files are written to a service-local public URL path; confirm access requirements, persistence and deletion behavior.

## Safe activation record format

For every selector, record only: provider name, enabled/disabled state, feature, environment, verification date, reviewer and evidence location. Never copy its secret value. Required selectors include payment, Customer checkout, wallet top-up, Captain commission, Partner onboarding, Ride calls, push sender, OTP/SMS, receipt email, utilities and object storage configured state.

## Task 209B-S1-H11.2P owner evidence additions — 2026-09-30

- [ ] Identify the Captain S3-compatible provider, endpoint style, region, bucket, encryption defaults, versioning, DPA, subprocessors, and independent processing without recording credentials.
- [ ] Approve a least-privilege Captain delete permission and test one synthetic object only.
- [ ] Approve durable private Partner storage; inventory and migrate legacy public onboarding documents with backup and anonymous-access verification.
- [ ] Review/approve the two defined retained-evidence reasons and establish record-specific periods or deletion triggers.
- [ ] Run the legacy Flutterwave count-only dry run on a restored snapshot, validate reconciliation, then authorize a separate production cleanup window.
- [ ] Confirm no other production path receives raw card/bank-account data before changing Customer `User payment info` in Play.
