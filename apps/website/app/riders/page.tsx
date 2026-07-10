import type { Metadata } from "next";
import Link from "next/link";
import { TaxiDriverApplicationForm, TaxiWaitlistForm } from "../../src/components/taxi-readiness-forms";

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
            <li>Taxi is coming later and is not live for ride requests yet</li>
            <li>Verified driver onboarding will be required</li>
            <li>Vehicle and licence checks will be required</li>
            <li>Fare controls, safety review and dispatch rules must be approved before launch</li>
          </ul>
          <a className="button secondary" href="#taxi-driver-application">Apply for Taxi Readiness</a>
        </article>
      </section>
      <section className="section split">
        <TaxiWaitlistForm />
        <TaxiDriverApplicationForm />
      </section>
    </main>
  );
}
