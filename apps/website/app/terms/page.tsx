import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
  description: "KariGO terms of service summary for customers, vendors, Captains, Ride review applicants and website visitors."
};

export default function TermsPage() {
  return (
    <main>
      <section className="section">
        <p className="eyebrow">Terms</p>
        <h1>Terms of Service</h1>
        <p className="lead">These terms explain the expected use of KariGO's public website, delivery platform, vendor application forms, Captain and Ride review forms and related services.</p>
      </section>

      <section className="section soft">
        <div className="card-grid legal-grid">
          <article className="info-card">
            <h2>Using KariGO</h2>
            <p>KariGO provides delivery, local-commerce and service request workflows. Users must provide accurate information, use the platform lawfully and avoid actions that may disrupt the service or harm other users.</p>
          </article>

          <article className="info-card">
            <h2>Accounts and access</h2>
            <p>Customers, vendors, Captains, Ride review applicants and admins may have different levels of access. Users are responsible for keeping account access private and reporting suspected unauthorized activity quickly.</p>
          </article>

          <article className="info-card">
            <h2>Orders, payments and delivery</h2>
            <p>Orders, payment status, delivery updates, support tickets, settlements and earnings are managed through KariGO workflows. Provider-based services are available only when KariGO marks them as active.</p>
          </article>

          <article className="info-card">
            <h2>Vendors and Captains</h2>
            <p>Vendor applications, Delivery Captain operations and Ride Captain review submissions are subject to review. Approval is not automatic, and interest forms do not activate restricted services by themselves.</p>
          </article>

          <article className="info-card">
            <h2>Services under approval</h2>
            <p>KariGO Rides, Pharmacy, Bills & Utilities and other preparing-launch services are not live unless KariGO clearly announces availability. Website references to these services are availability information only.</p>
          </article>

          <article className="info-card">
            <h2>Support and disputes</h2>
            <p>Users should report delivery, vendor, Captain, payment, refund or account issues through the KariGO support process. Refund, settlement and operational decisions follow KariGO review controls.</p>
          </article>

          <article className="info-card">
            <h2>Prohibited use</h2>
            <ul className="list">
              <li>Do not submit false, harmful or misleading information.</li>
              <li>Do not attempt to access another user's data or operational records.</li>
              <li>Do not share delivery OTPs before receiving an order.</li>
              <li>Do not use the website to send secrets, passwords or payment credentials.</li>
            </ul>
          </article>

          <article className="info-card">
            <h2>Changes to terms</h2>
            <p>KariGO may update these terms as services expand, provider integrations are approved and new public features become available.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
