export function CustomerRetentionPolicy() {
  return <>
    <p>Effective 15 October 2026. Policy version: KGO-RETENTION-2026-10-15.</p>
    <ul className="list">
      <li>Minimum wallet, payment, settlement, refund, utility, completed order, Ride and receipt accounting facts: 7 years from the end of the financial year in which the transaction occurred.</li>
      <li>Fraud, dispute and chargeback records: 7 years from final resolution, subject to an active legal, court or regulatory hold.</li>
      <li>Ordinary authentication, security and audit logs: 24 months from the event. Case-related logs follow the applicable case or hold period.</li>
      <li>Ordinary support and contact records: 24 months from case closure. Formal dispute-related support follows the 7-year case rule.</li>
      <li>First-party sponsored-ad event deduplication hashes and other Customer-linkable event identifiers: at most 90 days from the event, then permanently removed. Unlinked non-financial campaign metrics: at most 24 months, then deleted or further aggregated. Separate sponsor billing/accounting aggregates follow the financial rule without Customer-level linkage; event-level Customer hashes do not follow the 7-year rule.</li>
      <li>Minimal pseudonymous deletion audit and completion-notice delivery evidence: 7 years from deletion completion. Saved deletion-status lookup: during processing and for 90 days after completion, after which the lookup token expires.</li>
      <li>Operational recovery/PITR backups: at most 35 days. Encrypted archival backups: at most 90 days unless a separately documented legal or infrastructure requirement requires longer. Temporary exports containing Customer personal data: at most 30 days from creation, unless held.</li>
    </ul>
    <p>Direct Customer identity is removed by default. It may remain only where necessary for tax/accounting, settlement, fraud/dispute, legal proceedings or regulatory obligations, and is removed when that need expires. Pseudonymous internal links are not necessarily anonymous.</p>
    <p>Ordinary operational personal data, including unnecessary payment payload details, meter/IUC details, electricity tokens, contact details, precise pickup/drop-off locations, GPS history, instructions and personal attachments, is removed or minimized at deletion completion unless needed for an approved case or hold. Shared reviews may remain only anonymously where needed for platform integrity.</p>
    <p>Legal/Compliance authorizes holds, reviews them every 90 days and releases them immediately when no continuing duty remains. Internal non-litigation holds last no more than 12 months unless formally renewed with documented justification. Court, regulatory and legal holds remain until formally released. A hold affects only the relevant records; unrelated ordinary personal data is still removed.</p>
    <p>Customer deletion is role-scoped if another legitimate role remains active. Customer-specific data is cleaned; only information genuinely required for the still-active Captain, Vendor, staff or other role remains. Customer-only personal data is not retained merely because another role exists.</p>
    <p>KariGO requests deletion, unlinking or anonymization by processors where supported. Providers may independently retain records for legal, settlement, fraud or regulatory obligations. Customer push/device registrations and stored profile/media assets are removed at completion.</p>
    <p>Deleted data in recovery copies must not be used operationally. Deletion tombstones and erasure records must be reapplied before a restored environment returns to operation. These policy limits do not mean every provider copy disappears immediately.</p>
  </>;
}
