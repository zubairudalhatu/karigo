import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "KariGO privacy policy summary for customers, vendors, Captains, Ride review applicants and website visitors."
};

export default function PrivacyPage() {
  return (
    <main>
      <section className="section">
        <p className="eyebrow">Privacy Policy</p>
        <h1>Privacy Policy</h1>
        <p className="lead">KariGO is built for delivery, local commerce and operational trust. This page explains how we handle information for customers, vendors, Captains, Ride review applicants and website visitors.</p>
      </section>

      <section className="section soft">
        <div className="card-grid legal-grid">
          <article className="info-card">
            <h2>Information we may collect</h2>
            <ul className="list">
              <li>Account and profile details submitted by users.</li>
              <li>Delivery addresses, order details and support messages needed to operate KariGO.</li>
              <li>Vendor, Captain, Ride review and partner application details submitted through KariGO forms.</li>
              <li>Device, browser and usage information needed to keep the service secure and reliable.</li>
            </ul>
          </article>

          <article className="info-card">
            <h2>How we use information</h2>
            <ul className="list">
              <li>To create accounts, process orders, support delivery and respond to inquiries.</li>
              <li>To review vendor, Captain and Ride applications or interest requests.</li>
              <li>To improve safety, prevent abuse and monitor operational performance.</li>
              <li>To prepare reports for operations, finance and customer support.</li>
            </ul>
          </article>

          <article className="info-card">
            <h2>Sharing and access</h2>
            <p>KariGO only shares operational information where it is needed to complete a service, support a user, review an application or comply with legal and operational requirements.</p>
            <p>Role-based access controls are designed to keep customers, vendors, Captains and admins within their permitted information scope.</p>
          </article>

          <article className="info-card">
            <h2>Security and retention</h2>
            <p>KariGO uses authenticated access, role separation and careful provider activation to reduce data exposure risk. Sensitive credentials, OTPs and payment secrets must never be stored in public documents or exposed through the website.</p>
            <p>KariGO keeps information only as long as needed for service delivery, safety, legal, finance and operational purposes.</p>
          </article>

          <article className="info-card">
            <h2>User choices</h2>
            <p>Users can request support, correct inaccurate details and ask questions about how their information is handled. Notification preferences and consent controls will continue to improve as KariGO grows.</p>
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
