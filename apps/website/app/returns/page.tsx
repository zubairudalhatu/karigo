import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Returns",
  description: "KariGO delivery issue and return guidance for Kano and Abuja customers."
};

export default function ReturnsPage() {
  return (
    <main>
      <section className="section">
        <p className="eyebrow">Returns</p>
        <h1>Delivery issue and return support.</h1>
        <p className="lead">KariGO reviews delivery issues for orders in Kano and Abuja. Report concerns quickly so Support can check the order, vendor, Captain and payment records.</p>
        <div className="actions">
          <Link className="button" href="/contact">Contact Support</Link>
          <Link className="button secondary" href="/refunds">View Refunds</Link>
        </div>
      </section>

      <section className="section soft">
        <div className="card-grid">
          <article className="info-card">
            <h2>Wrong or missing items</h2>
            <p>Report the issue with the order reference, item name, quantity and a clear explanation. KariGO will review vendor preparation, delivery handoff and any available evidence.</p>
          </article>
          <article className="info-card">
            <h2>Damaged or unsafe delivery</h2>
            <p>Do not consume or use items you believe are unsafe. Contact KariGO Support immediately so the order can be reviewed before any resolution is recorded.</p>
          </article>
          <article className="info-card">
            <h2>Cancellation before dispatch</h2>
            <p>Requests made before vendor preparation or Captain pickup are reviewed against the order status. Approved cancellations may proceed to payment or cash reconciliation review.</p>
          </article>
          <article className="info-card">
            <h2>Cancellation after dispatch</h2>
            <p>Once a Captain is assigned or pickup has started, KariGO may need to review vendor cost, delivery fee and customer communication before confirming the outcome.</p>
          </article>
        </div>
      </section>

      <section className="section split">
        <article className="info-card">
          <h2>How to report</h2>
          <ul className="list">
            <li>Use the in-app Support Centre when possible.</li>
            <li>Include your order number and the affected item or delivery step.</li>
            <li>Do not share OTPs, card details or payment secrets.</li>
            <li>KariGO will review and respond with the next steps.</li>
          </ul>
        </article>
        <article className="info-card">
          <h2>Support contact</h2>
          <p>Website: <a href="https://www.karigo.com.ng">https://www.karigo.com.ng</a></p>
          <p>Email: <a href="mailto:meetup@karigo.com.ng">meetup@karigo.com.ng</a></p>
          <p>Phone: <a href="tel:+2348057092686">+234 805 709 2686</a></p>
        </article>
      </section>
    </main>
  );
}
