# Missing compliance evidence: secure records to create

Owner response, 27 September 2026: no verified reviewer-account handoff or complete provider agreement/DPA pack is available. These are outstanding evidence, not negative sharing answers. Zamkah Technologies Limited is the confirmed KariGO owner; an operating-company or controller role for KariGO Express Limited is not established.

## 1. Reviewer records

Create a restricted password-manager collection named `KariGO / Google Play review` with three separate records: `PLAY_REVIEW_CUSTOMER`, `PLAY_REVIEW_CAPTAIN`, `PLAY_REVIEW_PARTNER`. This document is a structure only; no accounts have been created or verified.

Each private record must contain:

| Field | Required value / handling |
|---|---|
| Identity | App name, package, non-personal account label and organization-controlled phone/email |
| Custodian | Responsible operations owner and recovery contact; access limited to assigned maintainers |
| Credentials | Username and password in vault secret fields; recovery details and OTP seed/codes, if any, never in repository or general notes |
| Account state | Verified/approved roles and capabilities; approval evidence reference and date |
| Environment | API environment, installed Play track/versionCode, tested device/Android version and operating region |
| Isolation | Controlled sample data, no unrelated users, no real dispatch/payout/bank data; restrictions explicitly recorded |
| Access instructions | Exact tested login and navigation steps, permission choices, review-safe assignment/order path, geographic limits and any feature prerequisite |
| Authentication test | Fresh-install login and repeat login results; reviewers must not depend on an expiring OTP or owner intervention. Resolve through a supported review arrangement, never a global authentication bypass |
| Verification | Test date, tester, result, screenshots with secrets redacted, next review/expiry date |
| Console record | App access entry label, last update date, exact instructions version and custodian who entered credentials |
| Recovery | Rotation procedure and incident/revocation owner; verify after every credential/build change |

Google needs the reusable review login in the App access credential fields and the minimum instructions required to reach all restricted functionality. Do not repeat passwords in the instruction text, repository, issue trackers or screenshots. Enter credentials privately; a human custodian must complete creation/change of passwords and any agreement acceptance. No founder/admin/personal credentials.

Role-specific setup and tested instruction drafts are in `reviewer-access-preparation-task209b-s1-h11-2d.md`. Customer needs service browsing/account deletion and a controlled transaction journey; Captain needs approved eligibility and a controlled accepted assignment; Partner needs approved product/service capabilities and safe catalogue/order/settlement views. Do not assert that a prepared account works until clean-device verification passes.

## 2. Provider evidence pack

Create a separate restricted evidence folder/vault collection `KariGO / Provider privacy evidence / YYYY-MM-DD`. For each provider store: contracted legal entity; KariGO contracting entity; product/plan/project reference (non-secret); activation evidence; agreement acceptance/order date and version; applicable DPA/addenda; privacy notice; product data-disclosure/retention/security pages; subprocessors and regions; relevant configuration evidence with all credentials redacted; review owner/date; and a per-data-type decision record.

| Provider and observed scope | Exact evidence needed | Current sharing answer |
|---|---|---|
| Render: confirmed live backend; all3; PostgreSQL resource in KariGO project | Applicable Render Terms + incorporated DPA, account acceptance/version, selected service/database linkage, logging/retention and regional settings, subprocessor list. Public DPA sections2 and9 distinguish instructed payload from independently controlled usage data | NOT CONFIRMED overall; public processor clause alone does not settle all flows |
| Flutterwave: payment selector confirmed; Customer checkout/wallet, Captain fees, Partner onboarding source | KariGO's Nigeria merchant agreement/order and product terms, signed/incorporated DPA or written controller-role terms, Nigeria Privacy Notice, payment/fraud/KYC retention and onward-recipient terms, enabled checkout/product configuration and returned-data field inventory | NOT CONFIRMED; assess each payment transfer and independent purpose separately |
| Agora: Customer/Captain RTC SDK and backend integration; live feature activation unverified | Executed/subscribed RTC service agreement, applicable DPA, RTC end-user Privacy Policy table, subprocessors, regional routing/retention, recording/analytics configuration and actual shipped SDK version | NOT CONFIRMED; no assumption that every Agora datum is processor-only or ephemeral |
| Google Maps/Places/routes: Customer/Captain | Applicable Maps Platform Terms, product-specific terms, controller-to-controller or processing terms for each selected API, Maps SDK Play data disclosure, service usage/telemetry configuration and project API list | NOT CONFIRMED pending product/data mapping; independent service improvement cannot receive blanket exemption |
| Expo: Updates all3; push in Customer/Captain | Account/organization service agreement and applicable DPA if offered/incorporated, Privacy Policy, subprocessors, Updates/EAS and Push security/data-retention documentation, channel/project/SDK and push activation evidence | NOT CONFIRMED; separate update telemetry, push tokens and payloads |
| Google/Firebase FCM: Customer/Captain push pathway | Applicable Firebase/Google Cloud terms and data-processing/security terms, Firebase Privacy and Security documentation, FCM data/retention disclosure, Firebase Service Data terms and relevant service-data choices; confirm actual Expo-to-FCM route | NOT CONFIRMED; customer payload and Firebase Service Data have separate roles |
| Resend: confirmed receipt provider and account/application email code | Applicable Resend Terms + incorporated DPA, Privacy Policy and subprocessors, sending/log retention configuration, recipient/routing-data purposes and enabled email flows | NOT CONFIRMED overall; message body processor role does not decide independently processed usage/routing data |
| Termii: OTP/SMS code and configuration keys; live enablement unverified | KariGO's core messaging/API agreement, applicable DPA/data-protection addendum (not an unrelated product policy), platform Privacy/Data Protection policies, carrier/subprocessor recipients, delivery-log retention and enabled SMS routes | NOT CONFIRMED |
| iRecharge/Accelerate: utilities API code; activation unverified | Merchant/reseller/API agreement with actual contracting entity for irechargetech.com, applicable DPA/controller terms, current privacy/retention notice, utility-operator recipients and enabled products | NOT CONFIRMED |
| Upload/object storage: S3-compatible implementation, vendor not identified | Non-secret provider identity and product/region; storage service agreement, applicable DPA, privacy/subprocessor/retention terms; object access controls, deletion/backup lifecycle and logs. AWS SDK is not proof the provider is AWS | NOT CONFIRMED; identity itself outstanding |
| Vercel: website/portal hosting scope; plan unverified | Contract and actual project/plan, applicable DPA, Privacy Notice, subprocessor list, Analytics/Speed Insights/drain configuration, embedded web-flow scope. March2026 public DPA applies to Pro/Enterprise; do not assume Hobby is covered | NOT CONFIRMED |
| Paystack, Monnify, Squad: alternative adapters/configuration, no live selection established | First establish actual activation. Only if active, obtain that exact product's merchant agreement, DPA/controller terms, privacy, subprocessors and retention documents. Do not label these current recipients merely from code presence | NOT CONFIRMED activation; exclude from a confirmed-active inventory until evidenced |

Public source links and provisional per-data-type analysis are in `provider-data-safety-reconciliation-2026-09-27.md`. Documents should be obtained from the provider account/legal records or its official legal channel; no agreement request has been sent on the owner's behalf.

## 3. Decision record for each transfer

Record app + shipped version, feature, provider/product, exact data category/fields, required/optional collection, retention, purpose, recipient role, independent purposes, subprocessors, user-initiated/expected transfer evidence, applicable Google exception with clause/reference, and decision reviewer/date. Outcomes are `shared`, `exception evidenced for this transfer`, or `NOT CONFIRMED / REQUIRES REVIEW`. A processor role for one payload cannot decide another payload's answer. Collection remains reportable even if a sharing exception is established. Unknowns remain flagged; do not select No merely to finish the form.

## Release gate

Do not submit evidence-dependent Data safety answers until the mapping is reviewed. Preserve the saved partial Console drafts. New native bundles, Captain video/device QA, verified reviewer access, privacy/controller review and final owner submission decision remain separate gates.
