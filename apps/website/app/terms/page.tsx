import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
  description: "KariGO terms of service summary for customers, vendors, riders, drivers and website visitors."
};

export default function TermsPage() {
  return (
    <main>
      <section className="section">
        <p className="eyebrow">Terms</p>
        <h1>Terms of Service</h1>
        <p className="lead">These terms explain the expected use of KariGO's public website, delivery platform, vendor readiness forms, rider/driver readiness forms and staging/pilot services.</p>
        <p className="legal-note">Pre-launch notice: this content is prepared for product readiness and must be reviewed before broad public launch. It is not a substitute for final legal approval.</p>
      </section>

      <section className="section soft">
        <div className="card-grid legal-grid">
          <article className="info-card">
            <h2>Using KariGO</h2>
            <p>KariGO provides delivery, local-commerce and service-readiness workflows. Users must provide accurate information, use the platform lawfully and avoid actions that may disrupt the service or harm other users.</p>
          </article>

          <article className="info-card">
            <h2>Accounts and access</h2>
            <p>Customers, vendors, riders, drivers and admins may have different levels of access. Users are responsible for keeping account access private and reporting suspected unauthorized activity quickly.</p>
          </article>

          <article className="info-card">
            <h2>Orders, payments and delivery</h2>
            <p>Orders, mock payments, delivery status updates, support tickets, settlements and earnings are managed through approved KariGO workflows. Live payment and provider services should only be activated after approval and testing.</p>
          </article>

          <article className="info-card">
            <h2>Vendors, riders and drivers</h2>
            <p>Vendor applications, rider operations and taxi driver readiness submissions are subject to review. Approval is not automatic, and readiness forms do not activate restricted services by themselves.</p>
          </article>

          <article className="info-card">
            <h2>Readiness-gated services</h2>
            <p>Taxi, Pharmacy, Bills & Utilities and other preparing-launch services are not live unless KariGO clearly announces activation through approved channels. Website references to these services are readiness information only.</p>
          </article>

          <article className="info-card">
            <h2>Support and disputes</h2>
            <p>Users should report delivery, vendor, rider, payment, refund or account issues through the approved KariGO support process. Refund, settlement and operational decisions should follow internal approval controls.</p>
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
            <p>KariGO may update these terms as the platform moves from staging, internal pilot and controlled soft launch into approved public operations.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
