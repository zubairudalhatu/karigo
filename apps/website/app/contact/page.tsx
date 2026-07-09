import type { Metadata } from "next";
import Link from "next/link";
import { site } from "../../src/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact KariGO in Kano, Nigeria."
};

export default function ContactPage() {
  return (
    <main>
      <section className="section">
        <p className="eyebrow">Contact</p>
        <h1>Talk to KariGO.</h1>
        <p className="lead">For customer, vendor, rider, driver or business inquiries, contact the KariGO team directly.</p>
      </section>
      <section className="section soft split">
        <article className="contact-card">
          <h2>Contact details</h2>
          <p>Email: <a href={`mailto:${site.email}`}>{site.email}</a></p>
          <p>Phone: <a href={`tel:${site.phone.replaceAll(" ", "")}`}>{site.phone}</a></p>
          <p>Location: {site.location}</p>
          <p>Website: www.karigo.com.ng</p>
        </article>
        <article className="contact-card">
          <h2>Quick actions</h2>
          <div className="actions">
            <Link className="button" href="/vendors/apply">Apply as a Vendor</Link>
            <Link className="button secondary" href="/riders">Rider & Driver Interest</Link>
          </div>
          <p>This page does not send email automatically. Use the contact details above until a reviewed contact workflow is approved.</p>
        </article>
      </section>
    </main>
  );
}
