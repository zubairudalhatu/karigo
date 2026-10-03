import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { careerOpenings, getCareerOpening } from "../../../src/lib/careers";
import { buildPageMetadata, privatePageRobots } from "../../../src/lib/seo";

export function generateStaticParams() {
  return careerOpenings.filter((opening) => opening.status === "OPEN").map((opening) => ({ "job-slug": opening.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ "job-slug": string }> }): Promise<Metadata> {
  const slug = (await params)["job-slug"];
  const opening = getCareerOpening(slug);
  return opening
    ? buildPageMetadata({ title: opening.title, description: opening.description, path: `/careers/${slug}` })
    : { title: "Career opportunity", robots: privatePageRobots };
}

export default async function CareerOpeningPage({ params }: { params: Promise<{ "job-slug": string }> }) {
  const opening = getCareerOpening((await params)["job-slug"]);
  if (!opening) notFound();
  return (
    <main>
      <section className="section">
        <p className="eyebrow">{opening.department}</p>
        <h1>{opening.title}</h1>
        <p className="lead">{opening.location} · {opening.employmentType}</p>
        <p>{opening.description}</p>
        <Link className="button" href={"/careers/" + opening.slug + "/apply"}>Apply securely online</Link>
      </section>
      <section className="section soft split">
        <article className="info-card"><h2>Responsibilities</h2><ul className="list">{opening.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul></article>
        <article className="info-card"><h2>Requirements</h2><ul className="list">{opening.requirements.map((item) => <li key={item}>{item}</li>)}</ul><p><strong>Closing:</strong> {opening.closingDate}</p></article>
      </section>
    </main>
  );
}
