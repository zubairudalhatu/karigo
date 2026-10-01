# Legacy Partner evidence closure — 1 October 2026

## Verified final inventory

The production-derived investigation identified seven historical `APPROVED_ONBOARDING_EVIDENCE` database records. Their approval rows and original review timestamps remain historical audit evidence; they do not prove that document bytes remain available.

| Measure | Verified count |
| --- | ---: |
| Historical approved records | 7 |
| Recoverable legacy document objects | 0 |
| Legacy objects eligible for migration | 0 |
| Records requiring fresh private evidence | 7 |
| Legacy physical source objects currently retained | 0 |

Six source references returned HTTP 404. The remaining reference returned HTTP 200 with 6,939 bytes of `text/html` and no PDF, JPEG, PNG, or WebP signature. It was a web-page response, not an evidence object, and was not copied. No substitute file was created and no historical record was marked migrated.

## Closed migration branch

Legacy file migration is closed. No further backup search, source copy, or migration is authorized for this set. The seven historical rows are classified `SOURCE_UNAVAILABLE_REACQUISITION_REQUIRED`; their `APPROVED` status and original review metadata remain unchanged.

Unavailable records must never expose their stored legacy URL as a current download. Partner and Admin APIs return an unavailable state and no downloadable URL. A private read request requires an `AVAILABLE` record with a stored private object key.

## Reacquisition workflow

1. Show the historical approval as audit history and identify that replacement evidence is required.
2. The Partner uploads a fresh PDF, JPEG, PNG, or WebP through the authenticated private-storage flow.
3. KariGO creates a new GCS object and `VendorPrivateUpload` manifest using an opaque provider-facing key.
4. KariGO creates a new pending onboarding-document row linked through `replacesDocumentId`; it does not overwrite the historical row.
5. Admin reviews the new evidence explicitly.
6. Only approval of the replacement changes the historical row to `SUPERSEDED_BY_REPLACEMENT`.
7. The verified private replacement becomes the current downloadable evidence; the unavailable historical record remains audit-only.

No Partner communication was sent by this implementation task. Production data, GCS configuration, Google Play, and Flutterwave were unchanged.
