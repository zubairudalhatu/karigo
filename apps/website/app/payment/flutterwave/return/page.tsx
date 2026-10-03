import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentReturnToApp } from "../../../../src/components/payment-return-to-app";
import { absoluteUrl, privatePageRobots } from "../../../../src/lib/seo";

export const metadata: Metadata = {
  title: "Payment Return",
  description: "Return to the KariGO app after a Flutterwave wallet top-up.",
  alternates: { canonical: absoluteUrl("/payment/flutterwave/return") },
  robots: privatePageRobots,
  openGraph: null,
  twitter: null
};

export default function FlutterwavePaymentReturnPage() {
  return (
    <main>
      <section className="section soft">
        <Suspense fallback={<p className="lead">Preparing your return to the KariGO app...</p>}>
          <PaymentReturnToApp />
        </Suspense>
      </section>
    </main>
  );
}
