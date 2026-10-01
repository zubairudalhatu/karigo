import type { Metadata } from "next";
import Link from "next/link";
import { careerOpenings } from "../../src/lib/careers";

export const metadata: Metadata = {
  title: "Careers",
  description: "Explore approved KariGO vacancies and apply through the secure online recruitment process."
};

export default function CareersPage() {
  const activeOpenings = careerOpenings.filter((opening) => opening.status === "OPEN");
  return (
    <main>
      <section className="section">
        <p className="eyebrow">Careers at KariGO</p>
        <h1>Help build practical services for everyday life.</h1>
        <p className="lead">Approved vacancies are published here with the role, location, employment type, requirements and closing status. KariGO does not accept speculative CV uploads through public contact forms.</p>
      </section>
      <section className="section soft">
        <div className="section-heading"><div><p className="eyebrow">Open roles</p><h2>Current vacancies</h2></div></div>
        {activeOpenings.length ? (
          <div className="card-grid">
            {activeOpenings.map((opening) => (
              <article className="info-card" key={opening.slug}>
                <p className="eyebrow">{opening.department}</p>
                <h3>{opening.title}</h3>
                <p>{opening.location} · {opening.employmentType}</p>
                <Link className="button secondary" href={"/careers/" + opening.slug}>View role</Link>
              </article>
            ))}
          </div>
        ) : (
          <article className="info-card vacancy-empty">
            <h3>No approved vacancies are open right now.</h3>
            <p>When a role is approved, its full description and secure online application will appear here. KariGO will never ask applicants to pay an application fee.</p>
          </article>
        )}
      </section>
      <section className="section">
        <div className="card-grid legal-grid">
          <article className="info-card">
            <h2>How recruitment works</h2>
            <ol className="list">
              <li>NEW — application received through the approved role page.</li>
              <li>SCREENING — minimum role requirements reviewed.</li>
              <li>SHORTLISTED and INTERVIEW — selected applicants contacted.</li>
              <li>OFFER or NOT SELECTED — outcome recorded; HIRED only after acceptance and checks.</li>
            </ol>
          </article>
          <article className="info-card">
            <h2>Recruitment privacy notice</h2>
            <p>KariGO collects applicant contact details, location, CV, optional profile link, cover note and approved screening answers only for recruitment, verification, communications and security.</p>
            <p>Applicant documents must use private storage, authenticated staff access and defined deletion or retention rules. They must not receive permanent public URLs. Final retention periods require owner/legal approval before applications are activated.</p>
            <p>For recruitment privacy questions, use the <Link href="/contact">KariGO contact form</Link> without attaching confidential documents.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
