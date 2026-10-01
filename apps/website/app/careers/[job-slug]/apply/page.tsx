import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCareerOpening } from "../../../../src/lib/careers";

export const metadata: Metadata = {
  title: "Secure career application",
  robots: { index: false, follow: false }
};

export default async function CareerApplicationPage({ params }: { params: Promise<{ "job-slug": string }> }) {
  const opening = getCareerOpening((await params)["job-slug"]);
  if (!opening) notFound();
  return (
    <main>
      <section className="section">
        <p className="eyebrow">Secure online application</p>
        <h1>Apply for {opening.title}</h1>
        <p className="lead">Applications for an approved role are accepted only through KariGO's authenticated recruitment workflow. Email is a support fallback, not the primary submission channel.</p>
        <p className="legal-note">The secure application endpoint and private applicant-document storage must be enabled and verified before this role can be published.</p>
      </section>
    </main>
  );
}
