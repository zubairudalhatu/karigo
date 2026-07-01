# Staging Smoke Test Script

Record Pass/Fail, evidence, issue ID, and tester for every section.

## Backend And Public API

- Health endpoint and approved Swagger access
- Customer/vendor/rider/admin login and `/auth/me`
- Active vendor and product listings

## Customer

- Login, add/view address, create normal order, validate `KARIGOFIRST`
- Initiate/verify mock payment and open tracking

## Vendor

- Login, view own paid order, accept, prepare, and mark ready

## Admin

- Login, load dashboard/reports, assign available rider

## Rider

- Login, go online, view/accept assigned job
- Progress valid statuses and complete with OTP

## Support, Promo, Notifications

- Customer creates ticket; admin replies/resolves; internal note remains hidden
- Promo validation succeeds and invalid code fails clearly
- User lists notifications, checks unread count, and marks read

## Payment Sandbox (Run Only After Approval And Secure Configuration)

- [ ] Payment provider environment configured in staging secret manager
- [ ] `PAYMENT_PROVIDER=mock` fallback confirmed before activation
- [ ] Payment initiation returns expected sandbox authorization data
- [ ] Authorization flow opens only the approved HTTPS provider URL
- [ ] Backend verification succeeds after provider success
- [ ] Valid webhook received and signature verified
- [ ] Duplicate webhook and duplicate verification are idempotent
- [ ] Failed/cancelled payment does not move order to `PAID`
- [ ] Amount mismatch is rejected; server order total remains authoritative
- [ ] Customer/order statuses update correctly and vendor sees the paid order
- [ ] Rollback to mock is tested and recorded

## SMS OTP Sandbox (Run Only After Approval And Secure Configuration)

- [ ] Selected SMS provider environment configured in the staging secret manager
- [ ] `OTP_PROVIDER=mock` and `SMS_PROVIDER=mock` fallback confirmed before activation
- [ ] Registration creates a hashed, expiring OTP record
- [ ] Sandbox send request succeeds for an approved, masked test phone
- [ ] Valid OTP verification succeeds without exposing the OTP in responses or logs
- [ ] Invalid and expired OTPs are rejected
- [ ] Maximum failed-attempt limit blocks further verification
- [ ] Resend cooldown works and replacement invalidates the old OTP
- [ ] Supported Nigerian phone formats normalize consistently
- [ ] Provider timeout/failure returns safely and leaves the account unverified
- [ ] Rollback to mock is tested and recorded

## Transactional Email Sandbox (Run Only After Approval And Adapter Review)

- [ ] Selected email provider configured in the staging secret manager
- [ ] `EMAIL_PROVIDER=mock` fallback confirmed before activation
- [ ] Approved sender identity/domain and masked test recipient confirmed externally
- [ ] Welcome and order-created templates triggered
- [ ] Payment-successful and order-status templates triggered
- [ ] Support acknowledgement/update templates triggered
- [ ] Refund request/approval templates triggered
- [ ] HTML and plaintext variables render without unresolved placeholders
- [ ] Provider timeout/failure leaves the primary business workflow successful
- [ ] Logs mask recipients and omit bodies, metadata, credentials, and personal data
- [ ] Rollback to mock is tested and recorded

## Push Notification Sandbox (Run Only After Approval And Physical Devices)

- [ ] Selected push provider configured in the staging secret manager
- [ ] `PUSH_PROVIDER=mock` fallback confirmed before activation
- [ ] Customer and rider test builds/devices approved externally
- [ ] Customer token registration/list/deactivation succeeds without returning raw tokens
- [ ] Rider token registration succeeds with role/app-surface enforcement
- [ ] Customer order-status and payment-success pushes render safely
- [ ] Rider job-assignment push renders safely
- [ ] Support-update push contains no message body or private details
- [ ] Permission-denied flow leaves the app and in-app feed usable
- [ ] Invalid-token receipt deactivates or queues the token for cleanup
- [ ] Provider failure leaves core workflows successful
- [ ] Logs mask tokens and omit provider credentials and payload data
- [ ] Rollback to mock is tested and recorded

## WhatsApp Sandbox (Run Only After Approval, Consent, And Webhook Review)

- [ ] Meta Cloud sandbox environment configured in the staging secret manager
- [ ] `WHATSAPP_PROVIDER=mock` fallback confirmed before activation
- [ ] Operational templates and consented internal recipients approved externally
- [ ] Order-created and payment-success templates trigger safely
- [ ] Vendor new-order and rider new-job role variants trigger safely
- [ ] Support-update and refund-approved templates contain only safe references
- [ ] Unsupported/marketing events and unrestricted text are rejected
- [ ] Webhook challenge/token and raw-body signature verification pass
- [ ] Invalid and duplicate webhook events are rejected/handled idempotently
- [ ] Provider failure leaves core workflows and in-app activity available
- [ ] Logs mask recipients and omit variables, metadata, credentials, and payloads
- [ ] Rollback to mock is tested and recorded

## Exit Criteria

No critical failures, access-control violation, raw secret/OTP exposure, or broken
customer-to-vendor-to-rider journey. Enter all other issues in the staging register.
