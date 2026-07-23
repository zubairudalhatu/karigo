import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Become a Service Provider",
  description: "Apply to join KariGO SME Services provider review."
};

export default function SmeServiceProviderApplicationPage() {
  return (
    <main>
      <section className="section">
        <p className="eyebrow">SME Services</p>
        <h1>Join KariGO as a Service Provider</h1>
        <p className="lead">Service providers now start from the unified KariGO Partner Workspace, where product sellers and SME service providers can choose the right account type for onboarding.</p>
        <p>This path starts review only. It does not create automatic job dispatch, service payments, payouts, legal advice, vehicle rental contracts or live medical booking.</p>
        <div className="actions">
          <a className="button" href="https://vendor.karigo.com.ng/register">Open Partner Workspace Registration</a>
          <Link className="button secondary" href="/services">View KariGO Services</Link>
        </div>
      </section>
      <section className="section soft split">
        <article className="info-card">
          <h2>Partner account types</h2>
          <ul className="list">
            <li>Product Seller for restaurants, groceries and market sellers</li>
            <li>Service Provider for approved SME Services categories</li>
            <li>Both for businesses that sell products and offer services</li>
          </ul>
          <p className="muted">Health professional applications remain compliance-review only until legal, compliance and operational approval is complete.</p>
        </article>
        <article className="info-card">
          <h2>Legacy form fallback</h2>
          <p>The older public service-provider application endpoint remains available internally for Admin/back-office fallback, but public onboarding now routes through the Partner Workspace.</p>
          <p className="muted">KariGO will review service category, operating areas, availability, documents and verification details before any provider appears in customer-facing SME Services.</p>
        </article>
      </section>
    </main>
  );
}
