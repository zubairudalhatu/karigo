import type { Metadata } from "next";
import { ServiceCard } from "../../src/components/service-card";
import { liveServices, preparingServices, services } from "../../src/lib/site";

export const metadata: Metadata = {
  title: "Services",
  description: "KariGO services and readiness status."
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
        <article className="info-card"><h2>Live / Active</h2><ul className="list">{liveServices.map((service) => <li key={service}>{service}</li>)}</ul></article>
        <article className="info-card"><h2>Preparing Launch</h2><ul className="list">{preparingServices.map((service) => <li key={service}>{service}</li>)}</ul></article>
      </section>
      <section className="section"><div className="service-grid">{services.map((service) => <ServiceCard key={service.title} service={service} />)}</div></section>
    </main>
  );
}
