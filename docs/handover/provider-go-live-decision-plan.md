# Provider Go-Live Decision Plan

No provider may move from mock/sandbox to live based on engineering completion alone.
Product, Operations, Finance, Security, and the accountable provider owner must sign off.

## A. Payment Go-Live Decision

Recommended first provider: **Paystack**.

Required approval evidence:

- Approved staging test account and test keys stored outside Git.
- Complete customer redirect/callback flow tested.
- Backend verification confirms reference, successful status, amount, and currency.
- Raw-body webhook signature verification and duplicate-event idempotency tested.
- Refund policy approved; admin approval remains mandatory.
- Sandbox refund/reconciliation and finance exception process rehearsed.
- Live keys stored in production secret storage with rotation/revocation owners.
- Monitoring and provider incident fallback approved.

Decision gate: Finance + Security + Engineering approval. No live payment until every
item above passes.

## B. SMS OTP Go-Live Decision

Recommended first provider: **Termii**, subject to approved sender/test account.

Required approval evidence:

- OTP expiry 10 minutes or less, maximum attempts, and resend cooldown verified.
- Distributed per-phone and per-IP issue/resend rate limiting implemented.
- OTP never returned or logged in production.
- Nigerian phone normalization and failure messaging tested.
- Provider delivery failures, retries, monitoring, and support fallback rehearsed.
- Provider credentials stored and rotatable outside Git.

Decision gate: Security + Operations + Engineering approval.

## C. Email Go-Live Decision

Recommended first provider: **SendGrid** for fast transactional setup, or **Amazon SES**
when AWS operations capability and sender reputation controls are available.

Required approval evidence:

- Transactional templates reviewed and tested in common clients.
- Sender domain and reply-to addresses approved.
- SPF, DKIM, and DMARC configured and verified.
- Bounce, complaint, suppression, retry, and monitoring behavior tested.
- Credentials stored outside Git with least privilege.

Decision gate: Operations/Support + Security + Engineering approval.

## D. WhatsApp Go-Live Decision

Use WhatsApp only for high-value operational notifications initially.

Required approval evidence:

- Explicit opt-in/consent records and privacy wording approved.
- Meta operational templates approved.
- Marketing remains disabled; anti-spam/frequency controls exist.
- Opt-out and suppression process approved.
- Webhook verification and delivery-status processing tested.
- Token rotation and incident response rehearsed.

Decision gate: Legal/Privacy + Operations + Security approval. Defer until after the
controlled pilot unless operations proves a critical need.

## E. Push Notification Go-Live Decision

Recommended first provider: **Expo Push** for the Expo customer and rider apps. Reassess
direct Firebase after pilot evidence.

Required approval evidence:

- Device-token registration/ownership endpoints and database migration verified.
- Customer/rider permission UX approved and tested on physical devices.
- Token refresh, logout cleanup, invalid-token receipt processing, and multiple devices tested.
- Foreground/background/terminated behavior tested.
- Payloads contain no sensitive information; deep links re-check auth/ownership.
- Provider credentials stored outside Git.

Decision gate: Mobile + Security + Product approval.
