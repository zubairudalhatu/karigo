import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Account Deletion",
  description: "Request deletion of KariGO Customer, Captain, Partner or complete account access through a secure verified process."
};

export default function AccountDeletionPage() {
  return (
    <main>
      <section className="section">
        <p className="eyebrow">Privacy and account controls</p>
        <h1>Request KariGO account deletion</h1>
        <p className="lead">Current and former KariGO users can request deletion without reinstalling an app. KariGO verifies account access before accepting a destructive request.</p>
        <div className="hero-actions">
          <Link className="button" href="/app">Open secure Customer Web Portal</Link>
          <Link className="button secondary" href="/contact">Contact KariGO Support</Link>
        </div>
      </section>

      <section className="section soft">
        <div className="card-grid legal-grid">
          <article className="info-card">
            <h2>Available deletion scopes</h2>
            <ul className="list">
              <li>Customer account access</li>
              <li>Captain operational access</li>
              <li>Partner business access</li>
              <li>Complete KariGO account</li>
            </ul>
          </article>
          <article className="info-card">
            <h2>Secure request process</h2>
            <p>Sign in to the Customer Web Portal with your verified phone number and password, open Account deletion, choose a scope and type DELETE to confirm.</p>
            <p>Captain and Partner users can also use the deletion control in their authenticated app profile. If you cannot sign in, contact support so KariGO can verify your identity safely.</p>
          </article>
          <article className="info-card">
            <h2>Review and blockers</h2>
            <p>Active orders, rides, wallet balances, refunds, support cases or other unresolved obligations may block processing. The secure portal shows the request reference, status and safe blocker messages.</p>
          </article>
          <article className="info-card">
            <h2>Records KariGO may retain</h2>
            <p>Order, payment, wallet, fraud-prevention, security and audit records may be retained where required for legal, financial, dispute, safety or regulatory obligations. Retained records are access-controlled and are not kept for marketing.</p>
          </article>
          <article className="info-card">
            <h2>Cancel a request</h2>
            <p>Eligible requests can be cancelled from the secure portal before processing begins. Once processing or required retention work starts, cancellation may no longer be available.</p>
          </article>
          <article className="info-card">
            <h2>Need help?</h2>
            <p>Use the KariGO contact form if you no longer have access to your verified phone or email. Never send passwords, OTPs, card details or provider credentials through a public message.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
