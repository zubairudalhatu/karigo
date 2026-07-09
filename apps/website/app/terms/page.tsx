import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
  description: "KariGO terms readiness placeholder."
};

export default function TermsPage() {
  return (
    <main>
      <section className="section">
        <p className="eyebrow">Draft Terms</p>
        <h1>Terms of Service</h1>
        <p className="lead">This is a draft/internal readiness page and must be reviewed before public launch.</p>
        <p>KariGO's final terms should cover customer use, vendor obligations, rider/driver operations, refunds, delivery issues, service availability, prohibited use, dispute handling and limitation of liability. No legal guarantees are made by this placeholder.</p>
      </section>
    </main>
  );
}
