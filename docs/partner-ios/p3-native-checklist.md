# P3 checklist â€” prepared only, not executed

Apple submission hold remains YES. No Partner Apple identifier, provisioning, ASC record or TestFlight distribution is authorized by P2.5. Customer/Captain submissions remain untouched.

## Entry gates

- Confirm the recorded staging deploy/source SHA, /health and /ready 200 and X-KariGO-Environment partner-staging.
- Confirm dedicated synthetic database, dedicated persistent public/private storage roots, generated staging-only secrets, mock financial/OTP/email/WhatsApp/push providers and external HTTP deny guard.
- Confirm no Production data/credentials/device tokens or provider calls; inspect bounded sanitized staging logs/evidence.
- For a zero-Production-traffic QA run, do not open the pre-existing public Privacy/Terms/Support website links or submit contact forms. They are explicit user-tapped public web links, not API fallbacks; native summaries remain available. All operational requests must stay on the staging API.
- Use staging app branding, scheme karigo-partner-staging, staging runtime/channel and explicit verified staging API. Missing API must fail closed. Keep Production mobile profiles unchanged.
- Obtain synthetic QA credentials directly from the staging service Environment page/password manager; never paste them in chat, screenshots, fixtures or committed files. No Production accounts.

## Simulator checklist

- Install/launch, visible STAGING banner, iPhone-only layout, screen reader labels, large text and keyboard visibility.
- New reserved synthetic applicant: register/verify with controlled mock delivery, password proof, restricted session, business draft, document/image system picker and upload/private read/delete.
- Pending/onboarding token must fail operational order APIs. Approved login must require fresh normal sign-in after approval.
- Approved Partner: restore session; profile/catalogue/list/detail; accept/reject structured reason/preparing/ready with explicit confirmations. No handoff/complete/refund/payout controls.
- Wrong business, expired/signed-out token, terminal order and stale version rejected server-side. Two confirms cannot duplicate history.
- Airplane mode/timeout: cached read-only view, no queued mutations or false success; reconnect/app resume/push hint/mutation refresh server state. No background polling.
- Payout fields remain protected; no real financial providers.
- Logout clears Partner devices/session; permanent deletion disables access, removes device registrations and respects synthetic retention evidence/blockers. Do not certify final external erasure without its reviewed evidence.
- No camera/location/microphone permission or background task introduced. Check network destination evidence for zero Production requests.

## Physical iPhone gate

Actual iOS APNs native credentials and Apple identity remain DEFERRED. Backend synthetic push capture is not proof of APNs delivery or iOS permission/deep-link presentation. Obtain separate Apple/native authorization before enabling real staging-device delivery or distributing a physical binary.

Once authorized: install the separately verified staging binary; repeat launch/session/onboarding/picker/deletion/operations/network/accessibility checks; contextual notification permission; one staging new-order and changed/cancelled push; tap exact owned detail; duplicate/terminal/logout push safety. Verify no Production token/traffic and no Production financial or dispatch effect.

Record each result and exact sanitized blocker. This file is preparation, not a P3 PASS claim.
