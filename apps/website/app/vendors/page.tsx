import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Vendors",
  description: "Apply to become a KariGO vendor in Kano or Abuja."
};

export default function VendorsPage() {
  return (
    <main>
      <section className="section">
        <p className="eyebrow">Vendors</p>
        <h1>Reach more customers across Kano and Abuja.</h1>
        <p className="lead">KariGO helps restaurants, grocery stores, market sellers and approved service providers receive digital orders, improve operations visibility and reach more customers.</p>
        <div className="actions">
          <Link className="button" href="/vendors/apply">Apply as a Vendor</Link>
          <a className="button secondary" href="https://vendor.karigo.com.ng/register">Service Provider Onboarding</a>
          <a className="button secondary" href="https://vendor.karigo.com.ng">Vendor Login</a>
        </div>
      </section>
      <section className="section soft">
        <div className="card-grid">
          <article className="info-card"><h2>Why join KariGO</h2><p>Get marketplace visibility, order management tools, settlement visibility and future campaign placement opportunities.</p></article>
          <article className="info-card"><h2>Suitable partner types</h2><p>Restaurants, grocery stores, market sellers, pharmacies pending approval, logistics partners and service providers may apply through unified partner onboarding.</p></article>
          <article className="info-card"><h2>How onboarding works</h2><p>Submit your application, KariGO reviews your details, then approved vendors complete setup and training.</p></article>
          <article className="info-card"><h2>Approval and verification</h2><p>Approval is not automatic. Payout account verification is part of onboarding and does not trigger automatic payment.</p></article>
        </div>
      </section>
    </main>
  );
}
