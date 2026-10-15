import Link from "next/link";
import { buildPageMetadata } from "../../src/lib/seo";

export const metadata = buildPageMetadata({
  title: "Account Deletion",
  description: "Request deletion of KariGO Customer, Captain, Partner or complete account access.",
  path: "/account-deletion"
});

export default function AccountDeletionPage() {
  return <main>
    <section className="section"><p className="eyebrow">Privacy and account controls</p><h1>Request KariGO account deletion</h1><p className="lead">Request deletion from an authenticated app profile or the secure Customer Web Portal. You do not need to reinstall an app.</p><div className="hero-actions"><Link className="button" href="/app">Open secure Customer Web Portal</Link><Link className="button secondary" href="/contact">Contact KariGO Support</Link></div></section>
    <section className="section soft"><div className="card-grid legal-grid">
      <article className="info-card"><h2>Available scopes</h2><ul className="list"><li>Customer account access</li><li>Captain operational access</li><li>Partner business access</li><li>Complete KariGO account</li></ul></article>
      <article className="info-card"><h2>Secure request</h2><p>In KariGO Customer, open Profile → Privacy &amp; security → Delete account permanently and type DELETE. You do not need to email or call support to initiate deletion. Captain, Partner and complete-account scopes use their separately reviewed operational processes.</p></article>
      <article className="info-card"><h2>Permanent Customer deletion</h2><p>Customer account access is disabled when you submit. Completion removes ordinary personal identity, password/session/device credentials, profile photos, saved addresses, personal preferences and associated personal content. Necessary historical links become identity-free tombstones. This is different from temporary account deactivation and cannot be undone after cleanup succeeds.</p></article>
      <article className="info-card"><h2>Blockers and retained records</h2><p>Balances, pending purchases, refunds, active work or disputes require reconciliation before cleanup. Limited financial/legal records may be retained where required by law; unnecessary names, contacts, addresses, meter/token details and personal payloads are removed. Exact retained categories and durations require legal/business approval. Other-role business/application data requires a separately reviewed scope, not automatic deletion.</p></article>
      <article className="info-card"><h2>Provider deletion</h2><p>Deleted GCS objects can remain recoverable through the seven-day soft-delete window, and provider systems may retain protected copies under their processing terms. KariGO does not claim instant irreversible provider erasure.</p></article>
      <article className="info-card"><h2>Timing and help</h2><p>Customer deletion may take up to 30 days. Keep the saved deletion receipt to check progress after sign-out. KariGO sends one completion confirmation to your account email before removing it from operational account data; if no email exists, the saved receipt confirms completion. A failed or pending cleanup is not reported as completed. Use the <Link href="/contact">contact form</Link> for problems, not as a mandatory initiation step. Never send passwords, OTPs, payment credentials or private receipt access data.</p></article>
    </div></section>
  </main>;
}
