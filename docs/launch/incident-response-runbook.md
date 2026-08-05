# Launch Incident Response Runbook

## Severity

- `SEV1`: safety, major outage, data exposure, widespread payment failure or uncontrolled assignment.
- `SEV2`: city degradation, high failure rate, major supply loss, repeated login/crash issue.
- `SEV3`: individual transaction or local operational defect.
- `SEV4`: cosmetic/documentation/low-impact support.

## Response

1. Create the incident with city, service, severity, concise impact and owner.
2. For SEV1, acknowledge immediately; for SEV2 within 15 minutes; SEV3 within 60 minutes.
3. If new activity is unsafe, pause the affected service from the incident record.
4. Preserve active work and coordinate it manually.
5. Record timeline notes, mitigation and customer/captain/partner impact without secrets.
6. Move through `OPEN`, `INVESTIGATING`, `MITIGATING`, `MONITORING`, `RESOLVED`, `CLOSED`.
7. Closing does not resume the service. A separate Admin stage change is required.

## Communications

- Internal: “Incident {reference}; {city}/{service}; {severity}; owner {name}; next update {time}.”
- Customer pause: “This KariGO service is temporarily paused in your area. Existing activity remains available in your account.”
- Captain: “New assignments are paused in your service area. Continue only the assignment already shown in your app.”
- Partner: “New Customer activity is paused. Keep existing orders managed; catalogue access remains available.”

Never include OTPs, Ride PINs, tokens, payment secrets or private document URLs.
