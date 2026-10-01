import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Account Deletion", description: "Request deletion of KariGO Customer, Captain, Partner or complete account access." };

export default function AccountDeletionPage() {
  return <main>
    <section className="section"><p className="eyebrow">Privacy and account controls</p><h1>Request KariGO account deletion</h1><p className="lead">Request deletion from an authenticated app profile or the secure Customer Web Portal. You do not need to reinstall an app.</p><div className="hero-actions"><Link className="button" href="/app">Open secure Customer Web Portal</Link><Link className="button secondary" href="/contact">Contact KariGO Support</Link></div></section>
    <section className="section soft"><div className="card-grid legal-grid">
      <article className="info-card"><h2>Available scopes</h2><ul className="list"><li>Customer account access</li><li>Captain operational access</li><li>Partner business access</li><li>Complete KariGO account</li></ul></article>
      <article className="info-card"><h2>Secure request</h2><p>Sign in, open Account deletion, select the scope and type DELETE. Captain and Partner users can use the control in their authenticated profile. If sign-in is unavailable, support verifies account ownership before acting.</p></article>
      <article className="info-card"><h2>What processing does</h2><p>KariGO deactivates the selected access, revokes active refresh sessions, takes a Captain offline where applicable and closes Partner access. Eligible unattached private documents are deleted only after the storage provider confirms deletion. A request is not marked complete while an eligible deletion is pending or failed.</p></article>
      <article className="info-card"><h2>Blockers and retained records</h2><p>Active work, balances, refunds, disputes, support matters or other unresolved obligations can delay processing. Orders, financial reconciliation, approved onboarding evidence, security and audit records may be retained for a defined reason. Broad irreversible anonymization is not currently performed for every linked historical record.</p></article>
      <article className="info-card"><h2>Provider deletion</h2><p>Deleted GCS objects can remain recoverable through the seven-day soft-delete window, and provider systems may retain protected copies under their processing terms. KariGO does not claim instant irreversible provider erasure.</p></article>
      <article className="info-card"><h2>Timing and help</h2><p>Exact retention periods for retained record groups are pending owner/legal approval. The portal shows a request reference, status and safe blocker messages. Use the <Link href="/contact">contact form</Link> if you cannot access the account. Never send passwords, OTPs or payment credentials.</p></article>
    </div></section>
  </main>;
}
