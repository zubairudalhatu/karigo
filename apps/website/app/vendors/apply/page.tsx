import type { Metadata } from "next";
import { VendorApplicationForm } from "../../../src/components/vendor-application-form";

export const metadata: Metadata = {
  title: "Apply as a Vendor",
  description: "Submit a public KariGO vendor application."
};

export default function VendorApplyPage() {
  return (
    <main>
      <section className="section">
        <p className="eyebrow">Vendor Application</p>
        <h1>Apply to sell or serve through KariGO.</h1>
        <p className="lead">Restaurants, grocery stores, market sellers, pharmacies pending approval and service providers in Kano and Abuja can apply. KariGO reviews all applications before onboarding.</p>
      </section>
      <section className="section soft split">
        <div>
          <h2>What vendors get</h2>
          <ul className="list">
            <li>Storefront setup</li>
            <li>Order management workflow</li>
            <li>Settlement visibility</li>
            <li>Future campaign placement opportunities</li>
            <li>Future payout account verification support</li>
          </ul>
          <p>Approval is not automatic. Current vendor applications are open for Kano and Abuja launch onboarding and do not activate live payouts, pharmacy scope or paid campaign placement.</p>
        </div>
        <VendorApplicationForm />
      </section>
    </main>
  );
}
