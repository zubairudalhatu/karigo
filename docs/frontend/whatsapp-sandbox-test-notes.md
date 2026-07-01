# WhatsApp Sandbox Test Notes

WhatsApp is an optional best-effort operational channel. In-app order, payment, delivery,
support, settlement, and earning status remains authoritative.

- Customer, vendor, and rider UIs must not promise guaranteed WhatsApp delivery.
- Sandbox recipients require explicit operational opt-in recorded outside Git.
- Internal support notes, private rider details, payment data, and OTPs must never appear.
- No major frontend implementation is required for provider sandbox tests.
- Future preference, consent, opt-out, suppression, and verified-number controls remain in
  the backlog and are required before public activation.
- If WhatsApp is delayed or unavailable, users continue through in-app activity and support.

Mock mode masks the recipient and records only template acceptance. It is not delivery
evidence and must not be presented to users as a sent message.
