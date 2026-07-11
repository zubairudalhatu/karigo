"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ServiceProviderStatus, ServiceProviderType, SmeProvidersListResponse, smeServicesApi } from "../../../src/api/sme-services.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../../src/components/portal";
import { friendlyError } from "../../../src/lib/errors";

const statuses: Array<"" | ServiceProviderStatus> = ["", "PENDING_REVIEW", "APPROVED", "SUSPENDED", "INACTIVE"];
const serviceTypes: Array<"" | ServiceProviderType> = ["", "PAINTER", "PLUMBER", "MECHANIC", "ELECTRICIAN", "CLEANER", "CARPENTER", "AC_TECHNICIAN", "GENERATOR_REPAIR", "HEALTH_PROFESSIONAL", "OTHER"];

const initialForm = {
  fullName: "",
  businessName: "",
  serviceType: "PLUMBER" as ServiceProviderType,
  phoneNumber: "",
  email: "",
  city: "Kano",
  state: "Kano",
  serviceAreas: "",
  status: "PENDING_REVIEW" as ServiceProviderStatus,
  readinessOnly: false,
  notes: "",
  verificationNote: ""
};

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

function areas(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export default function SmeProvidersPage() {
  const [data, setData] = useState<SmeProvidersListResponse | null>(null);
  const [status, setStatus] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const q = useMemo(() => queryString(status, serviceType, search, city), [status, serviceType, search, city]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await smeServicesApi.providers(q));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [q]);

  async function createProvider() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await smeServicesApi.createProvider({
        fullName: form.fullName,
        businessName: form.businessName || undefined,
        serviceType: form.serviceType,
        phoneNumber: form.phoneNumber,
        email: form.email || undefined,
        city: form.city,
        state: form.state,
        serviceAreas: areas(form.serviceAreas),
        status: form.status,
        readinessOnly: form.readinessOnly,
        notes: form.notes || undefined,
        verificationNote: form.verificationNote || undefined
      });
      setForm(initialForm);
      setMessage("SME Services provider record created.");
      await load();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  return <PortalShell>
    <h1>SME Services provider directory</h1>
    <p className="muted">Admin-managed provider records for manual review and assignment only. This does not create provider login, live dispatch, payment collection, payout automation or medical booking.</p>
    <div className="top-actions">
      <Link className="button-link" href="/sme-services">Back to requests</Link>
    </div>
    <div className="grid">
      <article className="card"><span className="muted">Total providers</span><p className="metric">{data?.summary.total ?? 0}</p></article>
      <article className="card"><span className="muted">Pending review</span><p className="metric">{data?.summary.pendingReview ?? 0}</p></article>
      <article className="card"><span className="muted">Approved</span><p className="metric">{data?.summary.approved ?? 0}</p></article>
      <article className="card"><span className="muted">Suspended / inactive</span><p className="metric">{(data?.summary.suspended ?? 0) + (data?.summary.inactive ?? 0)}</p></article>
    </div>
    <section className="card section">
      <h2>Create provider record</h2>
      <div className="form-grid">
        <label>Full name<input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
        <label>Business name<input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} /></label>
        <label>Service type<select value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value as ServiceProviderType })}>
          {serviceTypes.filter(Boolean).map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
        </select></label>
        <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ServiceProviderStatus })}>
          {statuses.filter(Boolean).map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
        </select></label>
        <label>Phone<input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} /></label>
        <label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>City<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
        <label>State<input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></label>
        <label>Service areas<input value={form.serviceAreas} onChange={(e) => setForm({ ...form, serviceAreas: e.target.value })} placeholder="Nasarawa GRA, Bompai, Tarauni" /></label>
        <label>Verification note<input value={form.verificationNote} onChange={(e) => setForm({ ...form, verificationNote: e.target.value })} /></label>
      </div>
      <label>Internal notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Internal operations notes only. Do not enter secrets, OTPs or sensitive health information." /></label>
      <label className="check-row"><input type="checkbox" checked={form.readinessOnly} onChange={(e) => setForm({ ...form, readinessOnly: e.target.checked })} /> Readiness-only provider</label>
      <button disabled={saving} onClick={() => void createProvider()}>{saving ? "Saving..." : "Create provider"}</button>
    </section>
    <div className="filters section">
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search provider, code, phone or email" />
      <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        {statuses.map((item) => <option key={item || "ALL"} value={item}>{item ? item.replaceAll("_", " ") : "All statuses"}</option>)}
      </select>
      <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
        {serviceTypes.map((item) => <option key={item || "ALL"} value={item}>{item ? item.replaceAll("_", " ") : "All service types"}</option>)}
      </select>
      <button className="secondary" onClick={() => void load()}>Refresh</button>
    </div>
    <p className="success">{message}</p>
    <ErrorMessage>{error}</ErrorMessage>
    {loading ? <Loading /> : <section className="section">
      {data?.items.length ? data.items.map((provider) => <Link className="card" href={`/sme-services/providers/${provider.id}`} key={provider.id}>
        <strong>{provider.providerCode} - {provider.fullName}</strong>
        <p><Badge>{provider.status}</Badge> {provider.readinessOnly ? <Badge>Readiness Only</Badge> : null}</p>
        <p>{provider.businessName || "Independent provider"} - {provider.serviceType.replaceAll("_", " ")}</p>
        <p className="muted">{provider.city}, {provider.state} - {provider.phoneNumber}</p>
        <p className="muted">Created {date(provider.createdAt)}</p>
      </Link>) : <Empty>No SME Services providers found.</Empty>}
    </section>}
  </PortalShell>;
}
