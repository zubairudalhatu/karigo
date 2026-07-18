import type { Metadata } from "next";
import Link from "next/link";
import { ServiceProviderApplicationForm } from "../../../src/components/service-provider-application-form";

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
        <p className="lead">Offer approved services such as plumbing, painting, electrical work, mechanics, cleaning, carpentry, AC repairs, generator repairs and business maintenance support.</p>
        <p>This form starts an onboarding review only. It does not create provider login, automatic job dispatch, service payments, payouts or live medical booking.</p>
      </section>
      <section className="section soft split">
        <article className="info-card">
          <h2>What KariGO reviews</h2>
          <ul className="list">
            <li>Your service category and experience</li>
            <li>Your operating areas in Kano and Abuja</li>
            <li>Your availability, tools and contact details</li>
            <li>Whether the service can be safely prepared for customer requests</li>
          </ul>
          <p className="muted">Health professional applications remain compliance-review only until legal, compliance and operational approval is complete.</p>
          <Link className="button secondary" href="/services">View KariGO Services</Link>
        </article>
        <ServiceProviderApplicationForm />
      </section>
    </main>
  );
}
