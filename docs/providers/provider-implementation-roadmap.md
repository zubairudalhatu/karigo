# Provider Implementation Roadmap

## Phase 1: Paystack Sandbox Payment Integration

- Implement the Paystack adapter behind the existing payment registry.
- Add provider-specific credential validation and HTTP timeouts.
- Verify initiation, direct verification, signed webhooks, duplicate events, amount
  mismatch, and sandbox refund flow.
- Complete finance reconciliation and incident-response rehearsal.

Exit criteria: all payment contract/sandbox tests pass and mock remains the production
default until explicit go-live approval.

## Phase 2: SMS OTP Integration

- Choose Termii or Africa's Talking after delivery-rate and commercial review.
- Add a dedicated OTP delivery provider.
- Add OTP issue/resend rate limits and Nigerian phone normalization.
- Remove OTP exposure from production responses and logs.

Exit criteria: delivery, expiry, attempt-limit, fallback, and abuse tests pass.

## Phase 3: Transactional Email

- Select provider and verify sending domain.
- Add adapter, queue, templates, bounce handling, and operational alerts.
- Test order, payment, refund, support, vendor, and rider emails.

## Phase 4: Push Notifications

- Add device-token model/endpoints and mobile permission flows.
- Integrate Expo Push first; evaluate FCM after pilot usage.
- Connect only high-value customer and rider events initially.

## Phase 5: WhatsApp Operational Notifications

- Record opt-in and configure Meta Cloud API.
- Approve a minimal set of operational templates.
- Enable important order, vendor, rider, and support events without bulk marketing.

## Phase 6: Production Go-Live Validation

- Rotate and store all live keys in a managed secret store.
- Reject mock providers in production.
- Restrict CORS and enable rate limiting/monitoring.
- Verify HTTPS callbacks and signed webhooks.
- Run payment and OTP production smoke tests using controlled accounts.
- Monitor errors, delivery rates, reconciliation, and provider costs.

## Cross-Cutting Work

- Stable provider error codes and sanitized logs
- Timeouts, retry policy, queues, and circuit-breaker decisions
- Consent and suppression management
- Provider dashboards and incident ownership
- Credential rotation and disaster-recovery procedures
