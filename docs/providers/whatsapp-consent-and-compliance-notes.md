# WhatsApp Consent And Compliance Notes

## Consent

- Obtain explicit WhatsApp opt-in before sending any real message.
- Record who consented, when, how, the phone number, scope, and policy version.
- Customer, vendor, and rider operational consent must be independently auditable.
- Consent for operational updates does not automatically permit marketing messages.

## Operational Versus Marketing

Operational messages directly support an active account, order, delivery, refund, or
support case. Marketing messages promote offers or campaigns and remain out of scope.

Marketing requires separate consent, approved templates, preference controls,
unsubscribe/opt-out handling, suppression records, and compliance review.

## Message Controls

- Use only approved templates outside applicable conversation windows.
- Avoid spam, repeated status messages, and unnecessary personal data.
- Apply per-user and per-event frequency controls.
- Stop immediately after opt-out.
- Keep in-app notifications as the primary durable activity feed.
- Do not use WhatsApp as the sole channel for critical support or safety handling.

## Privacy And Security

- Store provider credentials only in a managed secret store.
- Avoid logging message bodies, access tokens, or unnecessary phone numbers.
- Verify webhooks and process callbacks idempotently.
- Define retention periods for consent, delivery status, and suppression records.
- Review Nigeria data protection obligations and Meta platform policies before launch.

## Required Future Work

- Consent and notification-preference model
- Opt-out and suppression workflow
- Template approval tracking
- Frequency controls
- Delivery/read/failure telemetry
- Customer support policy and escalation boundaries
