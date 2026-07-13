import type { Metadata } from "next";
import Link from "next/link";
import { ServiceCard } from "../../src/components/service-card";
import { liveServices, preparingServices, services } from "../../src/lib/site";

export const metadata: Metadata = {
  title: "Services",
  description: "KariGO services and launch status."
};

export default function ServicesPage() {
  return (
    <main>
      <section className="section">
        <p className="eyebrow">Services</p>
        <h1>KariGO services and launch status.</h1>
        <p className="lead">KariGO is live for core delivery and local-commerce services while preparing additional everyday services carefully.</p>
      </section>
      <section className="section soft split">
        <article className="info-card">
          <h2>Live / Active</h2>
          <ul className="list">{liveServices.map((service) => <li key={service}>{service}</li>)}</ul>
          <p>Skilled workers and SMEs can apply for KariGO review before joining the SME Services provider directory.</p>
          <Link className="button secondary" href="/sme-services/apply">Become a Service Provider</Link>
        </article>
        <article className="info-card"><h2>Preparing Launch</h2><ul className="list">{preparingServices.map((service) => <li key={service}>{service}</li>)}</ul><p>KariGO Rides is being prepared with Ride Captain onboarding, vehicle checks, fare controls and safety review.</p><Link className="button secondary" href="/riders#taxi-waitlist">Join Ride Waitlist</Link></article>
      </section>
      <section className="section"><div className="service-grid">{services.map((service) => <ServiceCard key={service.title} service={service} />)}</div></section>
    </main>
  );
}
