import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refunds",
  description: "KariGO payment, wallet and cash/POD refund guidance."
};

export default function RefundsPage() {
  return (
    <main>
      <section className="section">
        <p className="eyebrow">Refunds</p>
        <h1>Refunds are reviewed before processing.</h1>
        <p className="lead">Refunds are reviewed by KariGO Support and processed after order/payment verification. KariGO does not promise instant refunds unless the payment provider and internal review both confirm the outcome.</p>
        <div className="actions">
          <Link className="button" href="/contact">Contact Support</Link>
          <Link className="button secondary" href="/returns">View Returns</Link>
        </div>
      </section>

      <section className="section soft">
        <div className="card-grid">
          <article className="info-card">
            <h2>Failed payment</h2>
            <p>If a payment fails, KariGO will not mark the order paid. If your bank or provider debits you, Support will review provider evidence before recording any refund action.</p>
          </article>
          <article className="info-card">
            <h2>Duplicate payment</h2>
            <p>Duplicate payment reports require the order number, payment reference where available and the payment channel used. KariGO will reconcile against backend and provider records.</p>
          </article>
          <article className="info-card">
            <h2>Wallet refunds</h2>
            <p>KariGO Wallet is prepared for ledger visibility, but automatic wallet refund credit remains disabled until separately approved. Any wallet refund must be backed by backend verification.</p>
          </article>
          <article className="info-card">
            <h2>Cash / Pay on Delivery refunds</h2>
            <p>Cash/POD refunds require manual reconciliation. Do not treat a cash order as electronically paid; KariGO Operations must verify collection and the approved resolution.</p>
          </article>
        </div>
      </section>

      <section className="section split">
        <article className="info-card">
          <h2>Review timeline</h2>
          <ul className="list">
            <li>Support receives and records the request.</li>
            <li>KariGO reviews order, vendor, Captain and payment status.</li>
            <li>Provider or cash collection evidence is checked where relevant.</li>
            <li>Approved outcomes are recorded before any customer update is shared.</li>
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
