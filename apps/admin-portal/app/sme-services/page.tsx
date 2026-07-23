"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ServiceProviderRequestStatus, ServiceProviderType, SmeServicesListResponse, smeServicesApi } from "../../src/api/sme-services.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../src/components/portal";
import { friendlyError } from "../../src/lib/errors";

const statuses: Array<"" | ServiceProviderRequestStatus> = ["", "SUBMITTED", "UNDER_REVIEW", "PROVIDER_MATCHING", "PROVIDER_ASSIGNED", "COMPLETED", "CANCELLED"];
const serviceTypes: Array<"" | ServiceProviderType> = ["", "PAINTER", "PLUMBER", "MECHANIC", "ELECTRICIAN", "CLEANER", "CARPENTER", "AC_TECHNICIAN", "GENERATOR_REPAIR", "APPLIANCE_REPAIR", "FUMIGATION", "WELDER", "TILER", "CCTV_TECHNICIAN", "MOVING_HELP", "PRINTING", "CAR_HIRE", "LAUNDRY", "LESSON_TEACHER", "LEGAL_PRACTITIONER", "RENT_A_CAR", "HEALTH_PROFESSIONAL", "OTHER"];

function date(value: string) {
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function queryString(status: string, serviceType: string, search: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (serviceType) params.set("serviceType", serviceType);
  if (search.trim()) params.set("search", search.trim());
  return params.toString();
}

export default function SmeServicesRequestsPage() {
  const [data, setData] = useState<SmeServicesListResponse | null>(null);
  const [status, setStatus] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const q = useMemo(() => queryString(status, serviceType, search), [status, serviceType, search]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await smeServicesApi.list(q));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [q]);

  return <PortalShell>
    <h1>SME Services</h1>
    <p className="muted">Review customer service-provider requests. This page does not dispatch providers, collect service payments, approve medical booking or create provider payouts.</p>
    <div className="top-actions">
      <Link className="button-link secondary" href="/sme-services/summary">Operations summary</Link>
      <Link className="button-link" href="/sme-services/providers">Provider directory</Link>
    </div>
    <div className="grid">
      <article className="card"><span className="muted">Total requests</span><p className="metric">{data?.summary.total ?? 0}</p></article>
      <article className="card"><span className="muted">Submitted</span><p className="metric">{data?.summary.submitted ?? 0}</p></article>
      <article className="card"><span className="muted">Under review</span><p className="metric">{data?.summary.underReview ?? 0}</p></article>
      <article className="card"><span className="muted">Matching / assigned</span><p className="metric">{(data?.summary.providerMatching ?? 0) + (data?.summary.providerAssigned ?? 0)}</p></article>
    </div>
    <div className="filters section">
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reference, customer or phone" />
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        {statuses.map((item) => <option key={item || "ALL"} value={item}>{item || "All statuses"}</option>)}
      </select>
      <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
        {serviceTypes.map((item) => <option key={item || "ALL"} value={item}>{item ? item.replaceAll("_", " ") : "All service types"}</option>)}
      </select>
      <button className="secondary" onClick={() => void load()}>Refresh</button>
    </div>
    <ErrorMessage>{error}</ErrorMessage>
    {loading ? <Loading /> : <section className="section">
      {data?.items.length ? data.items.map((request) => <Link className="card" href={`/sme-services/${request.id}`} key={request.id}>
        <strong>{request.requestNumber} - {request.serviceLabel}</strong>
        <p><Badge>{request.status}</Badge> {request.readinessOnly ? <Badge>Readiness Only</Badge> : null}</p>
        <p className="muted">{request.customer.user.fullName} - {request.contactPhone} - {request.serviceAddress.city}, {request.serviceAddress.state}</p>
        <p>{request.description}</p>
        <p className="muted">Created {date(request.createdAt)}</p>
      </Link>) : <Empty>No SME Services requests found.</Empty>}
    </section>}
  </PortalShell>;
}
