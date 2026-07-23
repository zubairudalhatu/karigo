"use client";

import type { ServiceProviderType, VendorServiceInput, VendorServiceStatus, VendorServiceSummary } from "@karigo/shared-types";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { serviceProviderTypes } from "@karigo/shared-types";
import { vendorApi } from "../../src/api/vendor.api";
import { DashboardShell, Empty, ErrorMessage, StatusBadge } from "../../src/components/dashboard";
import { friendlyError } from "../../src/lib/errors";

const serviceTypeLabels: Record<ServiceProviderType, string> = {
  PAINTER: "Painter",
  PLUMBER: "Plumber",
  MECHANIC: "Mechanic",
  ELECTRICIAN: "Electrician",
  CLEANER: "Cleaner",
  CARPENTER: "Carpenter",
  AC_TECHNICIAN: "AC technician",
  GENERATOR_REPAIR: "Generator repair",
  APPLIANCE_REPAIR: "Appliance repair",
  FUMIGATION: "Fumigation",
  WELDER: "Welder",
  TILER: "Tiler",
  CCTV_TECHNICIAN: "CCTV technician",
  MOVING_HELP: "Moving help",
  PRINTING: "Printing",
  CAR_HIRE: "Car hire",
  LAUNDRY: "Laundry",
  LESSON_TEACHER: "Lesson teacher",
  LEGAL_PRACTITIONER: "Legal practitioner",
  RENT_A_CAR: "Rent a car",
  HEALTH_PROFESSIONAL: "Health professional readiness",
  OTHER: "Other approved service"
};

type ServiceForm = {
  serviceType: ServiceProviderType;
  name: string;
  description: string;
  basePrice: string;
  priceNote: string;
  durationEstimate: string;
  serviceAreas: string;
  imageUrl: string;
  status: VendorServiceStatus;
  isAvailable: boolean;
  readinessOnly: boolean;
  internalNote: string;
};

const emptyForm: ServiceForm = {
  serviceType: "PLUMBER",
  name: "",
  description: "",
  basePrice: "",
  priceNote: "",
  durationEstimate: "",
  serviceAreas: "",
  imageUrl: "",
  status: "ACTIVE",
  isAvailable: true,
  readinessOnly: false,
  internalNote: ""
};

function money(value?: number | null) {
  if (value === null || value === undefined) return "Price on review";
  return new Intl.NumberFormat("en-NG", { currency: "NGN", style: "currency", maximumFractionDigits: 0 }).format(value);
}

function toForm(service: VendorServiceSummary): ServiceForm {
  return {
    serviceType: service.serviceType,
    name: service.name,
    description: service.description,
    basePrice: service.basePrice === null || service.basePrice === undefined ? "" : String(service.basePrice),
    priceNote: service.priceNote ?? "",
    durationEstimate: service.durationEstimate ?? "",
    serviceAreas: service.serviceAreas.join(", "),
    imageUrl: service.imageUrl ?? "",
    status: service.status,
    isAvailable: service.isAvailable,
    readinessOnly: service.readinessOnly,
    internalNote: service.internalNote ?? ""
  };
}

function toPayload(form: ServiceForm): VendorServiceInput {
  const readinessOnly = form.readinessOnly || form.serviceType === "HEALTH_PROFESSIONAL";
  return {
    serviceType: form.serviceType,
    name: form.name,
    description: form.description || undefined,
    basePrice: form.basePrice ? Number(form.basePrice) : undefined,
    priceNote: form.priceNote || undefined,
    durationEstimate: form.durationEstimate || undefined,
    serviceAreas: form.serviceAreas.split(",").map((area) => area.trim()).filter(Boolean),
    imageUrl: form.imageUrl || undefined,
    status: form.serviceType === "HEALTH_PROFESSIONAL" ? "INACTIVE" : form.status,
    isAvailable: form.serviceType === "HEALTH_PROFESSIONAL" ? false : form.isAvailable,
    readinessOnly,
    internalNote: form.internalNote || undefined
  };
}

export default function VendorServicesPage() {
  const [services, setServices] = useState<VendorServiceSummary[]>([]);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [editing, setEditing] = useState<VendorServiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setServices(await vendorApi.services());
    } catch (err) {
      setError(friendlyError(err, "dashboard"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const summary = useMemo(() => ({
    total: services.length,
    active: services.filter((service) => service.status === "ACTIVE" && service.isAvailable).length,
    readinessOnly: services.filter((service) => service.readinessOnly).length
  }), [services]);

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
  }

  function edit(service: VendorServiceSummary) {
    setEditing(service);
    setForm(toForm(service));
    setMessage("");
    setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      if (editing) {
        await vendorApi.updateService(editing.id, toPayload(form));
        setMessage("Service updated successfully.");
      } else {
        await vendorApi.createService(toPayload(form));
        setMessage("Service created successfully.");
      }
      resetForm();
      await load();
    } catch (err) {
      setError(friendlyError(err, "form"));
    } finally {
      setSaving(false);
    }
  }

  async function uploadServiceImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setMessage("");
    setError("");
    try {
      const uploaded = await vendorApi.uploadFile(file, "service-image");
      setForm((current) => ({ ...current, imageUrl: uploaded.url }));
      setMessage("Service image uploaded. Save the service to keep this image.");
    } catch (err) {
      setError(friendlyError(err, "form"));
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  }

  async function archive(service: VendorServiceSummary) {
    if (!window.confirm(`Archive ${service.name}? It will be hidden from your workspace list.`)) return;
    setMessage("");
    setError("");
    try {
      await vendorApi.archiveService(service.id);
      setMessage("Service archived.");
      await load();
    } catch (err) {
      setError(friendlyError(err, "dashboard"));
    }
  }

  return <DashboardShell>
    <header className="topbar">
      <div>
        <p className="muted">Vendor catalogue</p>
        <h1>Services</h1>
        <p className="muted">Manage service offerings for SME Services vendors. This does not activate automatic dispatch, payment collection or provider login.</p>
      </div>
      <button onClick={resetForm}>Add service</button>
    </header>
    <section className="grid">
      <div className="card"><p className="muted">Total services</p><p className="metric">{summary.total}</p></div>
      <div className="card"><p className="muted">Available services</p><p className="metric">{summary.active}</p></div>
      <div className="card"><p className="muted">Readiness-only</p><p className="metric">{summary.readinessOnly}</p></div>
    </section>
    {message ? <p className="success">{message}</p> : null}
    <ErrorMessage>{error}</ErrorMessage>
    <section className="product-layout">
      <form className="card product-form" onSubmit={(event) => void submit(event)}>
        <h2>{editing ? "Edit service" : "Add service"}</h2>
        <label>Service type
          <select value={form.serviceType} onChange={(event) => {
            const serviceType = event.target.value as ServiceProviderType;
            setForm((current) => ({
              ...current,
              serviceType,
              readinessOnly: serviceType === "HEALTH_PROFESSIONAL" ? true : current.readinessOnly,
              status: serviceType === "HEALTH_PROFESSIONAL" ? "INACTIVE" : current.status,
              isAvailable: serviceType === "HEALTH_PROFESSIONAL" ? false : current.isAvailable
            }));
          }}>
            {serviceProviderTypes.map((type) => <option key={type} value={type}>{serviceTypeLabels[type]}</option>)}
          </select>
        </label>
        <input placeholder="Service name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        <textarea placeholder="Short service description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        <input placeholder="Base price, optional" type="number" min="0" step="1" value={form.basePrice} onChange={(event) => setForm({ ...form, basePrice: event.target.value })} />
        <input placeholder="Price note, e.g. final price after inspection" value={form.priceNote} onChange={(event) => setForm({ ...form, priceNote: event.target.value })} />
        <input placeholder="Estimated duration, e.g. 1-2 hours" value={form.durationEstimate} onChange={(event) => setForm({ ...form, durationEstimate: event.target.value })} />
        <input placeholder="Service areas, comma-separated" value={form.serviceAreas} onChange={(event) => setForm({ ...form, serviceAreas: event.target.value })} />
        <label className="file-drop">Upload service image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void uploadServiceImage(event)} /></label>
        {uploadingImage ? <p className="muted">Uploading service image...</p> : null}
        <input placeholder="Service image URL" type="url" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} />
        {form.imageUrl ? <img className="product-preview" src={form.imageUrl} alt="" /> : null}
        <label>Status
          <select value={form.status} disabled={form.serviceType === "HEALTH_PROFESSIONAL"} onChange={(event) => setForm({ ...form, status: event.target.value as VendorServiceStatus })}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
        <label className="check-row"><input type="checkbox" checked={form.isAvailable} disabled={form.serviceType === "HEALTH_PROFESSIONAL"} onChange={(event) => setForm({ ...form, isAvailable: event.target.checked })} /> Available for manual review</label>
        <label className="check-row"><input type="checkbox" checked={form.readinessOnly} onChange={(event) => setForm({ ...form, readinessOnly: event.target.checked })} /> Readiness-only service</label>
        <textarea placeholder="Internal vendor note, optional" value={form.internalNote} onChange={(event) => setForm({ ...form, internalNote: event.target.value })} />
        {form.serviceType === "HEALTH_PROFESSIONAL" ? <p className="notice">Health professional services remain readiness-only and cannot be marked active for live booking in this pilot.</p> : null}
        <button disabled={saving}>{saving ? "Saving..." : editing ? "Save changes" : "Create service"}</button>
        {editing ? <button className="secondary" type="button" onClick={resetForm}>Cancel edit</button> : null}
      </form>
      <section className="section">
        {loading ? <div className="loading"><span className="spinner" />Loading services...</div> : services.length === 0 ? <Empty>No services yet. Add your first service for KariGO operations review.</Empty> : services.map((service) => <article className="card product-row" key={service.id}>
          {service.imageUrl ? <img className="product-thumb" src={service.imageUrl} alt="" /> : <div className="service-placeholder">{serviceTypeLabels[service.serviceType].slice(0, 2).toUpperCase()}</div>}
          <div>
            <h3>{service.name}</h3>
            <p className="muted">{service.description || serviceTypeLabels[service.serviceType]}</p>
            <p className="muted">{serviceTypeLabels[service.serviceType]}{service.serviceAreas.length ? ` · ${service.serviceAreas.join(", ")}` : ""}</p>
            {service.readinessOnly ? <p className="notice">Readiness-only: not available for live dispatch or public booking.</p> : null}
          </div>
          <div className="product-actions">
            <strong>{money(service.basePrice)}</strong>
            <StatusBadge>{service.status}</StatusBadge>
            <span className="muted">{service.isAvailable ? "Available" : "Unavailable"}</span>
            <button className="secondary" onClick={() => edit(service)}>Edit</button>
            <button className="secondary" onClick={() => void archive(service)}>Archive</button>
          </div>
        </article>)}
      </section>
    </section>
  </DashboardShell>;
}
