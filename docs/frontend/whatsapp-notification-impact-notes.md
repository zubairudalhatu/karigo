# WhatsApp Notification Impact Notes

## Current Behavior

WhatsApp remains mock-only and requires no frontend dependency. In-app notifications stay
the primary activity feed.

Task 36 staging guidance is in `whatsapp-sandbox-test-notes.md`. No UI may claim message
delivery, and no public activation is allowed before auditable opt-in/opt-out controls.

## Potential Future Operational Events

- Order, payment, vendor, rider, delivery, refund, and support updates
- Vendor new paid-order alerts
- Rider new-job alerts
- Future OTP fallback only after security review

## Future Consent Collection

- Customer signup/profile should offer a clear operational WhatsApp opt-in.
- Vendor business profile/onboarding should capture vendor operational opt-in.
- Rider onboarding/profile should capture rider job-alert opt-in.
- Consent must explain message types and remain separate from marketing consent.

## Frontend TODOs

- Notification preference and consent screens
- Opt-out controls
- Verified phone/change-number flow
- Clear explanation that in-app notifications remain available
- No UI claim that WhatsApp was sent until real provider delivery is enabled
