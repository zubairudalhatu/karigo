"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ServiceProviderApplicationStatus, ServiceProviderType, SmeProviderApplication, smeServicesApi } from "../../../src/api/sme-services.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../../src/components/portal";
import { friendlyError } from "../../../src/lib/errors";

const statuses: Array<"" | ServiceProviderApplicationStatus> = ["", "SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED", "APPROVED", "REJECTED", "CONVERTED_TO_PROVIDER"];
const serviceTypes: Array<"" | ServiceProviderType> = ["", "PAINTER", "PLUMBER", "MECHANIC", "ELECTRICIAN", "CLEANER", "CARPENTER", "AC_TECHNICIAN", "GENERATOR_REPAIR", "HEALTH_PROFESSIONAL", "OTHER"];

function date(value: string) {
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function queryString(status: string, serviceType: string, search: string, city: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (serviceType) params.set("serviceType", serviceType);
  if (search.trim()) params.set("search", search.trim());
  if (city.trim()) params.set("city", city.trim());
  return params.toString();
}

export default function SmeProviderApplicationsPage() {
  const [data, setData] = useState<SmeProviderApplication[]>([]);
  const [status, setStatus] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const q = useMemo(() => queryString(status, serviceType, search, city), [status, serviceType, search, city]);
  const summary = useMemo(() => ({
    total: data.length,
    submitted: data.filter((item) => item.status === "SUBMITTED").length,
    underReview: data.filter((item) => item.status === "UNDER_REVIEW").length,
    converted: data.filter((item) => item.status === "CONVERTED_TO_PROVIDER").length
  }), [data]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await smeServicesApi.providerApplications(q));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [q]);

  return <PortalShell>
    <h1>SME Provider Applications</h1>
    <p className="muted">Review public SME Services provider applications. Approval creates an internal provider record only; it does not activate live dispatch, payment collection, payout automation, provider login or medical booking.</p>
    <div className="top-actions">
      <Link className="button-link secondary" href="/sme-services/summary">Operations summary</Link>
      <Link className="button-link" href="/sme-services/providers">Provider directory</Link>
      <Link className="button-link secondary" href="/sme-services">Customer requests</Link>
    </div>
    <div className="grid">
      <article className="card"><span className="muted">Applications</span><p className="metric">{summary.total}</p></article>
      <article className="card"><span className="muted">Submitted</span><p className="metric">{summary.submitted}</p></article>
      <article className="card"><span className="muted">Under review</span><p className="metric">{summary.underReview}</p></article>
      <article className="card"><span className="muted">Converted</span><p className="metric">{summary.converted}</p></article>
    </div>
    <div className="filters section">
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reference, applicant, phone or email" />
      <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        {statuses.map((item) => <option key={item || "ALL"} value={item}>{item ? item.replaceAll("_", " ") : "All statuses"}</option>)}
      </select>
      <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
        {serviceTypes.map((item) => <option key={item || "ALL"} value={item}>{item ? item.replaceAll("_", " ") : "All service types"}</option>)}
      </select>
      <button className="secondary" onClick={() => void load()}>Refresh</button>
    </div>
    <ErrorMessage>{error}</ErrorMessage>
    {loading ? <Loading /> : <section className="section">
      {data.length ? data.map((application) => <Link className="card" href={`/sme-services/applications/${application.id}`} key={application.id}>
        <strong>{application.applicationReference} - {application.fullName}</strong>
        <p><Badge>{application.status}</Badge> {application.serviceType === "HEALTH_PROFESSIONAL" ? <Badge>Readiness Only</Badge> : null}</p>
        <p>{application.businessName || "Independent provider"} - {application.serviceType.replaceAll("_", " ")}</p>
        <p className="muted">{application.city}, {application.state} - {application.phoneNumber}</p>
        <p className="muted">Submitted {date(application.submittedAt)}</p>
      </Link>) : <Empty>No SME Services provider applications found.</Empty>}
    </section>}
  </PortalShell>;
}
