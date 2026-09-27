import type { Metadata } from "next";
import Link from "next/link";

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
        <p className="lead">KariGO is owned by Zamkah Technologies Limited, the developer of KariGO Customer, KariGO Captain and KariGO Partner on Google Play. This page explains how we handle information for customers, vendors, Captains, applicants and website visitors.</p>
      </section>

      <section className="section soft">
        <div className="card-grid legal-grid">
          <article className="info-card">
            <h2>Information we may collect</h2>
            <ul className="list">
              <li>Account and profile information, including name, phone number, optional email and profile photos.</li>
              <li>Delivery and pickup addresses, location when you use a location feature, order and Ride history, payment references, wallet transactions, and support or in-app messages.</li>
              <li>Business, vehicle, identity and application details, and the photos or documents you choose to upload for onboarding or service fulfilment.</li>
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
            <h2>Location during service use</h2>
            <p>Customer location helps select an address, pickup or service area. You can manage location permission in your device settings.</p>
            <p>KariGO Captain uses location for operational availability, navigation and live Ride or Delivery tracking. During accepted active work, location may continue to be collected when the app is minimized or not in use, so the service can show progress and support safety. Background tracking is intended to stop when the active assignment ends. Location is not used for advertising.</p>
          </article>

          <article className="info-card">
            <h2>Payments and communications</h2>
            <p>Flutterwave processes supported payments. Payment references, amounts and results support orders, wallet transactions and reconciliation. Do not send card details through KariGO chat or support messages.</p>
            <p>In-app messages and support conversations support service coordination. Where calling is available, Agora processes call audio to connect participants. Microphone permission is used for calls. Expo and Firebase support device push notifications using notification tokens and service messages.</p>
          </article>

          <article className="info-card">
            <h2>Sharing and access</h2>
            <p>KariGO shares information to fulfil services, support users, review applications, process payments and communications, and meet security and legal requirements.</p>
            <p>Assigned Captains and Partners receive the contact, address and order information needed to fulfil the service. Hosting, payment, maps, communications and notification providers process information needed for their functions. Depending on the service and data involved, providers may also process usage or diagnostic information for their own security, fraud prevention or service-improvement purposes under their terms. Role-based access controls limit operational access.</p>
          </article>

          <article className="info-card">
            <h2>Security and retention</h2>
            <p>KariGO uses authenticated access, role separation and careful provider activation to reduce data exposure risk. Sensitive credentials, OTPs and payment secrets must never be stored in public documents or exposed through the website.</p>
            <p>KariGO keeps information only as long as needed for service delivery, safety, legal, finance and operational purposes.</p>
          </article>

          <article className="info-card">
            <h2>User choices</h2>
            <p>You can manage device permissions, update your profile, choose whether to upload optional photos, and contact support about your information. Disabling a permission may limit the feature that requires it.</p>
          </article>

          <article className="info-card">
            <h2>Account deletion</h2>
            <p>Use the account-deletion control in your authenticated app profile or the secure web portal to request deletion of Customer, Captain, Partner or complete KariGO account access. You do not need to reinstall an app to make a web request.</p>
            <p>Active work, balances, disputes or other unresolved obligations may require review before processing. Some transaction, security and audit records may be retained for legal, financial or safety obligations.</p>
            <p><Link href="/account-deletion">Read the deletion steps and retention information</Link>.</p>
          </article>

          <article className="info-card">
            <h2>Questions</h2>
            <p>Use the <Link href="/contact">KariGO contact form</Link> for privacy or account questions. Do not submit passwords, payment card details, delivery OTPs or other secrets through public forms.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
