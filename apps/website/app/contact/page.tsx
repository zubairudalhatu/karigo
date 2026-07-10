import type { Metadata } from "next";
import Link from "next/link";
import { ContactInquiryForm } from "../../src/components/contact-inquiry-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Send a KariGO inquiry for customers, vendors, riders, drivers and business partners."
};

export default function ContactPage() {
  return (
    <main>
      <section className="section">
        <p className="eyebrow">Contact</p>
        <h1>Talk to KariGO.</h1>
        <p className="lead">Use the inquiry form below for customer, vendor, rider, driver or business messages. Public contact details are intentionally not displayed on this page.</p>
      </section>
      <section className="section soft split">
        <article className="contact-card">
          <h2>Quick actions</h2>
          <p>For structured applications, use the dedicated forms below so the KariGO team receives the right context.</p>
          <div className="actions">
            <Link className="button" href="/vendors/apply">Apply as a Vendor</Link>
            <Link className="button secondary" href="/riders">Rider & Driver Interest</Link>
          </div>
        </article>
        <ContactInquiryForm />
      </section>
    </main>
  );
}
