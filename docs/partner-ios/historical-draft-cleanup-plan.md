# Historical Partner draft cleanup plan — NOT EXECUTED

P1 did not query or mutate Production records, backups or object storage. The new API rejects unknown draft keys, the client serializes an explicit allowlist, legacy reads are sanitized, and application-derived draft writes use the same allowlist.

A later authorized remediation must:
1. Confirm exact deployed source/schema, database identity, operator authorization and the existing retention/hold policy. Use a restricted job identity; never print draft JSON, field values, phone numbers or credentials.
2. In an isolated synthetic database rehearse a bounded, restartable dry-run over PartnerOnboardingDraft IDs. Compare canonical JSON against `partnerDraft`; report counts of changed rows/removed key names only. Unknown nested structures and wrongly typed values are removed, not recursively preserved.
3. Review legal holds and approved backup handling. Do not export unsafe payloads into an ad-hoc backup/log/CSV. Any controlled recovery copy needs encryption, access restriction and a reviewed expiry.
4. On separate approval, update in small transactions with a cursor and optimistic updatedAt check. Re-read changed rows and assert allowlisted types/keys. Skip concurrent changes and retry only after re-evaluation.
5. Reconcile any historical credential exposure separately: classify affected auth generations without exposing values, review session revocation/credential reset needs, and redact approved logging/backup copies under policy. Removing JSON alone is not a credential incident response.
6. Retain only aggregate job evidence and reviewed references; confirm no auth/financial/work records changed.

This plan is not a migration that runs on deployment. The P1 SQL creates only scoped-session/file/push tables and adds PARTNER_APP to AppSurface; it does not silently rewrite historical drafts.
