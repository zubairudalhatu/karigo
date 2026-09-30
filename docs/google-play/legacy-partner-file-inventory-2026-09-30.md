# Legacy Partner file inventory — 30 September 2026

## Evidence boundary

No authorized restored production snapshot or approved metadata-only production query was available. No production database, object store or URL was queried. Counts are therefore recorded as unavailable rather than estimated.

| Category / measure | Count |
| --- | ---: |
| `PUBLIC_CONTENT` | NOT AVAILABLE |
| `PRIVATE_ONBOARDING_DOCUMENT` | NOT AVAILABLE |
| `APPROVED_ONBOARDING_EVIDENCE` | NOT AVAILABLE |
| `UNKNOWN` | NOT AVAILABLE |
| Currently public | NOT AVAILABLE |
| Should become private | NOT AVAILABLE |
| Requiring retention | NOT AVAILABLE |
| Missing/orphan database records | NOT AVAILABLE |
| Missing/orphan files | NOT AVAILABLE |

`services/backend-api/scripts/inventory-legacy-partner-files.cjs --dry-run` is the counts-only query prepared for the authorized restored snapshot. It emits no names, emails, filenames, URLs or contents. Object-level missing/orphan checks require safe provider metadata and must not be inferred from database rows alone.

## Migration plan

`prepare-legacy-partner-file-migration.cjs --dry-run` creates deterministic vendor-scoped destination keys and reports only aggregate states. Production apply is deliberately disabled for Task H11.2Q. The controlled executor must use this order per object: copy; verify destination; create manifest; switch reference; verify authenticated owner retrieval and unauthorized rejection; remove public source; record audit completion.

Resume state lives in the unique `storageKey`, linked `VendorPrivateUpload`, deletion state, attempt counters and audit evidence. A retry must re-check destination and manifest before copying. Rollback before public-source removal restores the old application reference. After source removal, rollback restores the verified private reference or recovers the source from the change-window backup; it must never make private evidence anonymously public.
