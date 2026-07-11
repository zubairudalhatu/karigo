"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ServiceProviderStatus, ServiceProviderType, SmeProvider, smeServicesApi } from "../../../../src/api/sme-services.api";
import { Badge, ErrorMessage, Loading, PortalShell } from "../../../../src/components/portal";
import { friendlyError } from "../../../../src/lib/errors";

const statuses: ServiceProviderStatus[] = ["PENDING_REVIEW", "APPROVED", "SUSPENDED", "INACTIVE"];
const serviceTypes: ServiceProviderType[] = ["PAINTER", "PLUMBER", "MECHANIC", "ELECTRICIAN", "CLEANER", "CARPENTER", "AC_TECHNICIAN", "GENERATOR_REPAIR", "HEALTH_PROFESSIONAL", "OTHER"];

function date(value?: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function areas(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function isReadinessOnlyProvider(form: ReturnType<typeof formFromProvider>) {
  return form.readinessOnly || form.serviceType === "HEALTH_PROFESSIONAL";
}

function availableStatuses(form: ReturnType<typeof formFromProvider>) {
  return isReadinessOnlyProvider(form) ? statuses.filter((item) => item !== "APPROVED") : statuses;
}

function formFromProvider(provider: SmeProvider) {
  return {
    fullName: provider.fullName,
    businessName: provider.businessName ?? "",
    serviceType: provider.serviceType,
    phoneNumber: provider.phoneNumber,
    email: provider.email ?? "",
    city: provider.city,
    state: provider.state,
    serviceAreas: provider.serviceAreas.join(", "),
    status: provider.status,
    readinessOnly: provider.readinessOnly,
    notes: provider.notes ?? "",
    verificationNote: provider.verificationNote ?? ""
  };
}

export default function SmeProviderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [provider, setProvider] = useState<SmeProvider | null>(null);
  const [form, setForm] = useState<ReturnType<typeof formFromProvider> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setError("");
    try {
      const item = await smeServicesApi.provider(id);
      setProvider(item);
      setForm(formFromProvider(item));
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  useEffect(() => { void load(); }, [id]);

  async function save() {
    if (!form) return;
    if (!form.fullName.trim() || !form.phoneNumber.trim() || !form.city.trim() || !form.state.trim()) {
      setError("Provider could not be updated. Please check the required fields and try again.");
      return;
    }
    const readinessOnly = isReadinessOnlyProvider(form);
    if (readinessOnly && form.status === "APPROVED") {
      setError("Readiness-only and health professional providers can be saved for review only. They cannot be approved or assigned yet.");
      return;
    }
    if (!window.confirm("Update this SME Services provider record? This does not create provider login, live dispatch, payment collection or medical booking.")) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await smeServicesApi.updateProvider(id, {
        fullName: form.fullName,
        businessName: form.businessName || undefined,
        serviceType: form.serviceType,
        phoneNumber: form.phoneNumber,
        email: form.email || undefined,
        city: form.city,
        state: form.state,
        serviceAreas: areas(form.serviceAreas),
        status: form.status,
        readinessOnly,
        notes: form.notes || undefined,
        verificationNote: form.verificationNote || undefined
      });
      setProvider(updated);
      setForm(formFromProvider(updated));
      setMessage("SME Services provider updated.");
    } catch (e) {
      setError(friendlyError(e, "form"));
    } finally {
      setSaving(false);
    }
  }

  if (!provider && !error) return <PortalShell><Loading /></PortalShell>;

  return <PortalShell>
    <h1>{provider?.providerCode ?? "SME Services provider"}</h1>
    <p className="muted">Provider directory records are for KariGO operations only. Customers do not receive provider phone numbers from this page.</p>
    <div className="top-actions">
      <Link className="button-link" href="/sme-services/providers">Back to provider directory</Link>
    </div>
    <p className="success">{message}</p>
    <ErrorMessage>{error}</ErrorMessage>
    {provider && form ? <div className="detail-grid">
      <section className="section">
        <article className="card">
          <h2>{provider.fullName}</h2>
          <p><Badge>{provider.status}</Badge> {provider.readinessOnly ? <Badge>Readiness Only</Badge> : null}</p>
          <p>{provider.businessName || "Independent provider"} - {provider.serviceType.replaceAll("_", " ")}</p>
          <p className="muted">{provider.city}, {provider.state}</p>
        </article>
        <article className="card">
          <h2>Operations contact</h2>
          <p><strong>Phone:</strong> {provider.phoneNumber}</p>
          <p><strong>Email:</strong> {provider.email || "Not provided"}</p>
          <p><strong>Service areas:</strong> {provider.serviceAreas.length ? provider.serviceAreas.join(", ") : "Not set"}</p>
        </article>
        <article className="card">
          <h2>Record notes</h2>
          <p><strong>Verification:</strong> {provider.verificationNote || "No verification note"}</p>
          <p>{provider.notes || "No internal notes."}</p>
          <p className="muted">Created {date(provider.createdAt)} - Updated {date(provider.updatedAt)}</p>
        </article>
      </section>
      <aside className="card review-panel">
        <h2>Edit provider</h2>
        <label>Full name<input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
        <label>Business name<input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} /></label>
        <label>Service type<select value={form.serviceType} onChange={(e) => {
          const nextServiceType = e.target.value as ServiceProviderType;
          const nextReadinessOnly = form.readinessOnly || nextServiceType === "HEALTH_PROFESSIONAL";
          setForm({
            ...form,
            serviceType: nextServiceType,
            readinessOnly: nextReadinessOnly,
            status: nextReadinessOnly && form.status === "APPROVED" ? "PENDING_REVIEW" : form.status
          });
        }}>
          {serviceTypes.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
        </select></label>
        <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ServiceProviderStatus })}>
          {availableStatuses(form).map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
        </select></label>
        <label>Phone<input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} /></label>
        <label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>City<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
        <label>State<input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></label>
        <label>Service areas<input value={form.serviceAreas} onChange={(e) => setForm({ ...form, serviceAreas: e.target.value })} /></label>
        <label>Verification note<textarea value={form.verificationNote} onChange={(e) => setForm({ ...form, verificationNote: e.target.value })} /></label>
        <label>Internal notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Internal operations notes only." /></label>
        <label className="check-row"><input type="checkbox" checked={form.readinessOnly} onChange={(e) => {
          const nextReadinessOnly = e.target.checked || form.serviceType === "HEALTH_PROFESSIONAL";
          setForm({
            ...form,
            readinessOnly: nextReadinessOnly,
            status: nextReadinessOnly && form.status === "APPROVED" ? "PENDING_REVIEW" : form.status
          });
        }} /> Readiness-only provider</label>
        {isReadinessOnlyProvider(form) ? <p className="muted">Readiness-only and health professional providers can be saved for review, but cannot be approved or assigned yet.</p> : null}
        <button disabled={saving} onClick={() => void save()}>{saving ? "Saving..." : "Save provider"}</button>
      </aside>
    </div> : null}
  </PortalShell>;
}
