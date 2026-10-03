import Link from "next/link";
import { buildPageMetadata } from "../../src/lib/seo";

export const metadata = buildPageMetadata({
  title: "Safety",
  description: "KariGO safety guidance for customers, Captains, deliveries and Partners.",
  path: "/safety"
});

export default function SafetyPage() {
  return (
    <main>
      <section className="section">
        <p className="eyebrow">Safety at KariGO</p>
        <h1>Clear responsibilities before, during and after every service.</h1>
        <p className="lead">KariGO combines account controls, onboarding review, trip and delivery information, operational reporting and access controls. Report urgent danger to the appropriate local emergency authority.</p>
      </section>
      <section className="section soft">
        <div className="card-grid legal-grid">
          <article className="info-card"><h2>Customers and Riders</h2><ul className="list"><li>Check Captain and trip information shown in the app.</li><li>Use location only when needed for pickup, delivery or an active trip.</li><li>Keep OTPs and account credentials private.</li><li>Report service, conduct or privacy concerns through KariGO support.</li></ul></article>
          <article className="info-card"><h2>Captains</h2><ul className="list"><li>Complete required identity, vehicle and document review.</li><li>Drive safely and follow prohibited-conduct rules.</li><li>Use active-work availability and location controls accurately.</li><li>Report incidents and protect account access.</li></ul></article>
          <article className="info-card"><h2>Delivery</h2><ul className="list"><li>Verify the correct pickup and delivery through the approved workflow.</li><li>Do not transport prohibited or restricted goods.</li><li>Protect customer contact and address information.</li><li>Report damaged, unsafe or disputed deliveries.</li></ul></article>
          <article className="info-card"><h2>Partners</h2><ul className="list"><li>Complete merchant and evidence review where required.</li><li>Do not list prohibited, unsafe or misleading goods.</li><li>Protect staff access, payout details and customer order information.</li><li>Report fraud, account compromise and fulfilment incidents.</li></ul></article>
          <article className="info-card"><h2>Trust and enforcement</h2><p>KariGO may review reports, restrict accounts, preserve necessary audit evidence and cooperate with lawful requests. Outcomes depend on the evidence and the applicable service rules.</p></article>
          <article className="info-card"><h2>Report a concern</h2><p>Use the <Link href="/contact">KariGO contact and support form</Link>. Do not submit passwords, OTPs, payment credentials or unnecessary identity documents through a public message.</p><p>See the <Link href="/privacy">Privacy Policy</Link>, <Link href="/terms">Terms</Link> and <Link href="/account-deletion">Account Deletion</Link> pages.</p></article>
        </div>
      </section>
    </main>
  );
}
