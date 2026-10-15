import Link from "next/link";
import { ContactInquiryForm } from "../../src/components/contact-inquiry-form";
import { buildPageMetadata } from "../../src/lib/seo";

export const metadata = buildPageMetadata({
  title: "Contact",
  description: "Send a KariGO inquiry for customers, vendors, Captains, Ride review and business partners.",
  path: "/contact"
});

export default function ContactPage() {
  return (
    <main>
      <section className="section">
        <p className="eyebrow">Contact</p>
        <h1>Talk to KariGO.</h1>
        <p className="lead">Get help with your KariGO account, orders, payments, deliveries or account deletion. Contact our support team directly or use the inquiry form below.</p>
      </section>
      <section className="section soft split">
        <article className="contact-card">
          <h2>KariGO customer support</h2>
          <p>Email: <a href="mailto:meetup@karigo.com.ng">meetup@karigo.com.ng</a></p>
          <p>Phone: <a href="tel:+2348057092686">+234 805 709 2686</a></p>
          <p>For a problem with an order or payment, include its reference so we can investigate. Never send passwords, OTPs, card details or payment credentials.</p>
          <p>You can initiate Customer account deletion in the app under Profile → Privacy &amp; security → Delete account permanently. Contacting support is not required to start it.</p>
          <h3>Applications and business inquiries</h3>
          <p>For structured applications, use the dedicated forms below so the KariGO team receives the right context.</p>
          <div className="actions">
            <Link className="button" href="/vendors/apply">Apply as a Vendor</Link>
            <Link className="button secondary" href="/riders">Captain & Ride Interest</Link>
          </div>
        </article>
        <ContactInquiryForm />
      </section>
    </main>
  );
}
