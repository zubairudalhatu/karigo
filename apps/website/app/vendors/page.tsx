import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Vendors",
  description: "Apply to become a KariGO vendor in Kano."
};

export default function VendorsPage() {
  return (
    <main>
      <section className="section">
        <p className="eyebrow">Vendors</p>
        <h1>Reach more customers across Kano.</h1>
        <p className="lead">KariGO helps restaurants, grocery stores, market sellers and approved service providers prepare for digital orders, operations visibility and future growth opportunities.</p>
        <div className="actions"><Link className="button" href="/vendors/apply">Apply as a Vendor</Link></div>
      </section>
      <section className="section soft">
        <div className="card-grid">
          <article className="info-card"><h2>Why join KariGO</h2><p>Get marketplace visibility, order management readiness, settlement visibility and future campaign placement opportunities.</p></article>
          <article className="info-card"><h2>Suitable vendor types</h2><p>Restaurants, grocery stores, market sellers, pharmacies pending approval, logistics partners and service providers may apply.</p></article>
          <article className="info-card"><h2>How onboarding works</h2><p>Submit your application, KariGO reviews your details, then approved vendors complete setup and training.</p></article>
          <article className="info-card"><h2>Approval and verification</h2><p>Approval is not automatic. Payout account verification is readiness only and does not trigger payment.</p></article>
        </div>
      </section>
    </main>
  );
}
