import type { Metadata } from "next";
import Link from "next/link";
import { site } from "../../src/lib/site";

export const metadata: Metadata = {
  title: "Riders & Drivers",
  description: "Join KariGO as a delivery rider or future taxi driver."
};

export default function RidersPage() {
  return (
    <main>
      <section className="section">
        <p className="eyebrow">Riders & Drivers</p>
        <h1>Earn with KariGO.</h1>
        <p className="lead">KariGO supports delivery riders now and is preparing taxi driver onboarding for a later launch.</p>
      </section>
      <section className="section soft split">
        <article className="info-card">
          <h2>Delivery Riders</h2>
          <ul className="list">
            <li>Deliver customer orders</li>
            <li>Earn from completed deliveries</li>
            <li>Support KariGO operations across Kano</li>
          </ul>
          <Link className="button" href="/contact">Contact KariGO</Link>
        </article>
        <article className="info-card">
          <h2>Taxi Drivers - Preparing Launch</h2>
          <ul className="list">
            <li>Taxi is coming later</li>
            <li>Driver verification will be required</li>
            <li>Vehicle and licence checks will be required</li>
            <li>Waitlist interest is handled through KariGO contact for now</li>
          </ul>
          <a className="button secondary" href={`mailto:${site.email}`}>Join the Rider & Driver Waitlist</a>
        </article>
      </section>
    </main>
  );
}
