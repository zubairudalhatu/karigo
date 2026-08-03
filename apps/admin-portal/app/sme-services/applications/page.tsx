"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ServiceProviderApplicationStatus, ServiceProviderType, SmeProviderApplication, smeServicesApi } from "../../../src/api/sme-services.api";
import { Badge, Empty, Loading, PortalShell } from "../../../src/components/portal";
import { friendlyError } from "../../../src/lib/errors";

const statuses: Array<"" | ServiceProviderApplicationStatus> = ["", "SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED", "APPROVED", "REJECTED", "CONVERTED_TO_PROVIDER"];
const serviceTypes: Array<"" | ServiceProviderType> = ["", "PAINTER", "PLUMBER", "MECHANIC", "ELECTRICIAN", "CLEANER", "CARPENTER", "AC_TECHNICIAN", "GENERATOR_REPAIR", "APPLIANCE_REPAIR", "FUMIGATION", "WELDER", "TILER", "CCTV_TECHNICIAN", "MOVING_HELP", "PRINTING", "CAR_HIRE", "LAUNDRY", "LESSON_TEACHER", "LEGAL_PRACTITIONER", "RENT_A_CAR", "HEALTH_PROFESSIONAL", "OTHER"];

function date(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

function label(value?: string | null, fallback = "Not set") {
  return value ? value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) : fallback;
}

function capabilityLabel(application: SmeProviderApplication) {
  if (application.capabilityLabel) return application.capabilityLabel;
  if (application.partnerType === "BOTH") return "Product Seller and Service Provider";
  return label(application.serviceType, "Service Provider");
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
    pending: data.filter((item) => item.status === "SUBMITTED" || item.status === "UNDER_REVIEW").length,
    approved: data.filter((item) => item.status === "APPROVED" || item.status === "CONVERTED_TO_PROVIDER").length,
    rejected: data.filter((item) => item.status === "REJECTED").length,
    revisionRequired: data.filter((item) => item.status === "CHANGES_REQUESTED").length
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
    <h1>Partner service applications</h1>
    <p className="muted">Review unified Partner and legacy service-provider applications. Approval remains an operations decision and does not activate automatic dispatch, payment collection, payouts or regulated medical booking.</p>
    <div className="top-actions">
      <Link className="button-link secondary" href="/sme-services/summary">Operations summary</Link>
      <Link className="button-link" href="/sme-services/providers">Provider directory</Link>
      <Link className="button-link secondary" href="/sme-services">Customer requests</Link>
    </div>
    <div className="grid">
      <article className="card"><span className="muted">Applications</span><p className="metric">{summary.total}</p></article>
      <article className="card"><span className="muted">Pending review</span><p className="metric">{summary.pending}</p></article>
      <article className="card"><span className="muted">Approved</span><p className="metric">{summary.approved}</p></article>
      <article className="card"><span className="muted">Rejected</span><p className="metric">{summary.rejected}</p></article>
      <article className="card"><span className="muted">Revision required</span><p className="metric">{summary.revisionRequired}</p></article>
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
    {error ? <div className="empty" role="alert"><strong>Partner service applications could not be loaded</strong><span>{error}</span><button className="secondary" onClick={() => void load()}>Retry</button></div> : null}
    {loading ? <Loading /> : !error ? <section className="section">
      {data.length ? data.map((application) => {
        const href = application.sourceType === "UNIFIED_PARTNER_APPLICATION" ? "/vendor-applications" : `/sme-services/applications/${application.id}`;
        return <article className="card" key={application.id}>
          <strong>{application.applicationReference || "Reference unavailable"} - {application.fullName || application.businessName || "Applicant"}</strong>
          <p><Badge>{application.status || "UNKNOWN"}</Badge> {application.serviceType === "HEALTH_PROFESSIONAL" ? <Badge>Readiness Only</Badge> : null}</p>
          <p>{application.businessName || "Independent provider"} - {capabilityLabel(application)}</p>
          <p className="muted">{application.city || "City not set"}, {application.state || "State not set"}</p>
          <p className="muted">Document review: {label(application.documentReviewStatus, "Not recorded")} · Submitted {date(application.submittedAt)}</p>
          <Link className="button-link secondary" href={href}>{application.sourceType === "UNIFIED_PARTNER_APPLICATION" ? "Open in Partner Applications" : "Review application"}</Link>
        </article>;
      }) : <Empty>No Partner service applications found.</Empty>}
    </section> : null}
  </PortalShell>;
}
