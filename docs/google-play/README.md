# KariGO Google Play release pack

This folder is the controlled source for KariGO Android Internal and Closed Testing preparation. It covers three separate Play applications and does not authorize public Production rollout.

| App | Package | Version | Runtime | versionCode | Build profile | Channel |
| --- | --- | --- | --- | ---: | --- | --- |
| KariGO | `com.karigo.customer` | 1.0.0 | 1.0.0 | 16 | `customer-play-internal` | `customer-production` |
| KariGO Captain | `com.karigo.rider` | 1.1.0 | 1.1.0 | 15 | `captain-play-internal` | `captain-production` |
| KariGO Partner | `com.karigo.partner` | 1.0.0 | 1.0.0 | 6 | `partner-play-internal` | `partner-production` |

All profiles produce an Android App Bundle, use the production environment and API, and target Internal testing when EAS Submit is deliberately invoked. Public Production submission is not approved.

## Pack index

- `release-build-record.md`: build and technical verification evidence.
- `android-compliance.md`: API level, manifest, ABI and 16 KB checks.
- `internal-testing-matrix.md`: device and role coverage.
- `closed-testing-runbook.md`: track operation and participation records.
- `review-account-handoff-template.md`: private owner-controlled account setup.
- Each app folder: listing copy, Data Safety worksheet, App Content responses, permissions and assets.
- `approved-icon-asset-manifest.json`: approved icon dimensions, transparency, safe-zone measurements and checksums.
- `icon-validation/KariGO-Final-Icon-Validation.png`: fallback mask, small-size and themed-icon verification sheet.

## Guardrails

- Reviewer passwords, tester email addresses, service-account JSON, signing keys and provider credentials stay outside Git.
- EAS build pages are durable artifact locators. Expiring direct artifact download URLs are not committed.
- Actual phone screenshots must be captured from the submitted build with controlled demo data. This pack specifies required shots and captions but does not fabricate app UI.
- Service availability is limited to supported areas in Kano and Abuja.
