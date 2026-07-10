import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "KariGO privacy policy summary for customers, vendors, riders, drivers and website visitors."
};

export default function PrivacyPage() {
  return (
    <main>
      <section className="section">
        <p className="eyebrow">Privacy Policy</p>
        <h1>Privacy Policy</h1>
        <p className="lead">KariGO is built for delivery, local commerce and operational trust. This page explains the privacy approach for customers, vendors, riders, drivers, website visitors and pilot participants.</p>
        <p className="legal-note">Pre-launch notice: this policy content is prepared for product readiness and should be reviewed by qualified legal and data-protection advisers before broad public launch.</p>
      </section>

      <section className="section soft">
        <div className="card-grid legal-grid">
          <article className="info-card">
            <h2>Information we may collect</h2>
            <ul className="list">
              <li>Account and profile details submitted by users.</li>
              <li>Delivery addresses, order details and support messages needed to operate KariGO.</li>
              <li>Vendor, rider, driver and partner application details submitted through approved forms.</li>
              <li>Device, browser and usage information needed to keep the service secure and reliable.</li>
            </ul>
          </article>

          <article className="info-card">
            <h2>How we use information</h2>
            <ul className="list">
              <li>To create accounts, process orders, support delivery and respond to inquiries.</li>
              <li>To review vendor, rider and driver readiness applications.</li>
              <li>To improve safety, prevent abuse and monitor operational performance.</li>
              <li>To prepare reports for internal operations, finance and customer support.</li>
            </ul>
          </article>

          <article className="info-card">
            <h2>Sharing and access</h2>
            <p>KariGO only shares operational information where it is needed to complete a service, support a user, review an application or comply with approved legal and operational requirements.</p>
            <p>Role-based access controls should prevent customers, vendors, riders and admins from viewing information outside their permitted scope.</p>
          </article>

          <article className="info-card">
            <h2>Security and retention</h2>
            <p>KariGO uses authenticated access, role separation and staged provider activation to reduce data exposure risk. Sensitive credentials, OTPs and payment secrets must never be stored in public documents or exposed through the website.</p>
            <p>Retention periods and deletion processes should be finalized before public launch.</p>
          </article>

          <article className="info-card">
            <h2>User choices</h2>
            <p>Users should be able to request support, correct inaccurate details and ask questions about how their information is handled. Future notification preferences and consent controls remain part of the product roadmap.</p>
          </article>

          <article className="info-card">
            <h2>Questions</h2>
            <p>Use the KariGO contact form for privacy or account questions. Do not submit passwords, payment card details, raw delivery OTP values or other sensitive secrets through public forms.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
