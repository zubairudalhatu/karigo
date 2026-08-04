# KariGO Closed Test runbook

Create one Closed Testing track per Play app with the consistent track name **KariGO Closed Test** after Internal Testing acceptance.

## Entry criteria

- Internal build installed from Play and all critical acceptance scenarios pass.
- Data Safety, App Content, listing and screenshots match the exact submitted build.
- Reusable review account works.
- No blocking crash, security, payment, dispatch or account-deletion defect.

## Track operation

1. Create a private Google Group or approved tester list.
2. Add release notes from the app listing file and upload the accepted AAB.
3. Review Play warnings before rollout; do not override a blocking policy warning.
4. Send the closed-track opt-in link privately.
5. A tester moving from Internal must opt out of Internal, allow Play state to update, then opt into Closed.
6. Record each tester's opt-in date, last participation date and device class in a private register.
7. Track continuous opt-in duration exactly where the developer account is subject to Google's testing threshold.

## Private records required

- Tester participation log: tester ID alias, app, opt-in/opt-out dates, device and completed scenarios.
- Test duration log: track start, daily active tester count and interruption notes.
- Defect register: severity, reproducible steps, owner, target build and retest result.
- Daily acceptance checklist: crash rate, auth, primary flow, notifications, privacy/deletion and support.

## Production-readiness questions

- Did representative users complete the primary purpose of each app?
- Are location, upload and notification denials handled safely?
- Do Customer, Captain and Partner identities remain isolated by role?
- Are payment, earnings and settlement states backend-authoritative?
- Can users reach privacy, terms, support and deletion controls?
- Are all P0/P1 defects closed and P2 risks explicitly accepted by an owner?

Production rollout remains an explicit owner decision and is outside this runbook.
