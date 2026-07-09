import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "KariGO privacy policy readiness placeholder."
};

export default function PrivacyPage() {
  return (
    <main>
      <section className="section">
        <p className="eyebrow">Draft Policy</p>
        <h1>Privacy Policy</h1>
        <p className="lead">This is a draft/internal readiness page and must be reviewed by qualified legal and data-protection advisers before public launch.</p>
        <p>KariGO intends to protect customer, vendor, rider and operational data responsibly. Final policy wording, lawful processing basis, retention timelines, data subject rights and third-party processing details must be approved before production launch.</p>
      </section>
    </main>
  );
}
