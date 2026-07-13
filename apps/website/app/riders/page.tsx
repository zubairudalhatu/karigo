import type { Metadata } from "next";
import { DeliveryCaptainApplicationForm } from "../../src/components/delivery-captain-application-form";
import { TaxiDriverApplicationForm, TaxiWaitlistForm } from "../../src/components/taxi-readiness-forms";

export const metadata: Metadata = {
  title: "Captains",
  description: "Join KariGO as a Delivery Captain or future Ride Captain."
};

export default function RidersPage() {
  return (
    <main>
      <section className="section">
        <p className="eyebrow">Captains</p>
        <h1>Earn with KariGO.</h1>
        <p className="lead">KariGO supports Delivery Captains now and is preparing Ride Captain onboarding for a later KariGO Rides launch.</p>
      </section>
      <section className="section soft split">
        <article className="info-card">
          <h2>Delivery Captains</h2>
          <ul className="list">
            <li>Deliver customer orders</li>
            <li>Earn from completed deliveries</li>
            <li>Support KariGO operations across Kano</li>
          </ul>
          <a className="button" href="#delivery-captain-application">Apply as Delivery Captain</a>
        </article>
        <article className="info-card">
          <h2>Ride Captains - Coming Soon</h2>
          <ul className="list">
            <li>KariGO Rides is coming later and is not live for ride requests yet</li>
            <li>Verified Ride Captain onboarding will be required</li>
            <li>Vehicle and licence checks will be required</li>
            <li>Fare controls, safety review and dispatch rules must be approved before launch</li>
          </ul>
          <a className="button secondary" href="#taxi-driver-application">Apply for Ride readiness</a>
        </article>
      </section>
      <section className="section">
        <DeliveryCaptainApplicationForm />
      </section>
      <section className="section split">
        <TaxiWaitlistForm />
        <TaxiDriverApplicationForm />
      </section>
    </main>
  );
}
