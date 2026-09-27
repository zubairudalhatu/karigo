# Task 209B-S1-H11.2D — Render evidence, 2026-09-27

Read-only inspection authorized by owner in My Workspace. Only KariGO project inspected.

## Actual configuration
- Project KariGO, Production environment: Node web service `karigo` plus PostgreSQL 18 resource `karigo-staging-db`, both Frankfurt. Database resource is available; its name does not establish whether it contains staging or production data.
- Web service srv-d92nv5u7r5hc73a6vsjg, Starter, one instance, public HTTPS endpoint https://karigo-8htn.onrender.com. Cache profile no-cache. Previews off. Automatic deployment off. Current deployment visibly Live at de3bbdccf17570bbeead4b18b3e9413d50048f74. This differs from local audit baseline da2bfd53a270ec8ddedc6109d65fe0500526e1cc; do not assume local code equals deployed code.
- Linked environment group `karigo` supplies DATABASE_URL. Connection value was not opened. Database linkage to the displayed database remains unverified.
- Masked integration configuration names include Flutterwave, Agora, Google Maps, Expo push, Resend, Termii, Accelerate utilities, S3-compatible Captain uploads, and alternate payment providers. Presence does not establish activation. No credential or connection-string values recorded.
- UI read of non-credential selector PAYMENTS_PROVIDER showed flutterwave; RIDE_RECEIPT_EMAIL_PROVIDER showed resend. Other attempted selector reads were unavailable and remain unconfirmed. Further reveal of RIDE_CALL_PROVIDER was rejected by automatic approval review because the UI marks environment values as secrets; no workaround attempted.
- No deployment, service-setting, environment-variable, database or credential changes made.

## Render role by data flow
[Render DPA](https://render.com/dpa), last modified 19 December 2024, read in authenticated in-app browser. Sections 2.1–2.2 support processor treatment for customer payloads under instructions. Sections 1.4 and 9 separately reserve independent-controller handling of service usage, communication routing and activity data for security, fraud prevention and service optimization. Thus the Play service-provider exception is supported for hosted application payloads within the instructed processing scope, not as a blanket exemption for all Render data. Account/billing data about KariGO administrators is not automatically app end-user data. Subprocessors are authorized under section 4 with comparable contractual safeguards. Frankfurt placement does not establish exclusive EU processing; section 6 permits international transfers.

[Privacy policy](https://render.com/privacy), modified 10 July 2026, distinguishes processing customer end-user data on customers' behalf from Render's own purposes. Its website cookie/advertising clauses do not prove advertising use of KariGO hosted payloads. [Terms](https://render.com/terms) and the applicable contract must be read together with the DPA.

## Declaration consequence
All three apps send application data to the backend: collected remains Yes, even where hosting is exempt from sharing. Personal/profile, trip location, transaction records, communications and uploads processed only as instructed can qualify for the service-provider exception for this hosting transfer. Other recipients must be assessed separately. Independent usage data is not covered by that exception: map actually transferred IP/routing/activity/diagnostic identifiers to the current Play categories and purposes before finalizing. Exact Render telemetry fields and any other applicable sharing exception remain requires review; do not guess No sharing for the entire integration. No final Data safety submission made on the strength of this partial evidence.

Current [Render subprocessor list](https://render.com/security), reached from the DPA trust link, lists AWS, Google Cloud Platform, Cloudflare and ClickHouse for hosting/cloud processing (US entities). This does not establish that every listed company receives each KariGO data type.
