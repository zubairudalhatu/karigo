"use client";

import { FormEvent, useState } from "react";
import { site } from "../lib/site";

type ServiceProviderType =
  | "PAINTER"
  | "PLUMBER"
  | "MECHANIC"
  | "ELECTRICIAN"
  | "CLEANER"
  | "CARPENTER"
  | "AC_TECHNICIAN"
  | "GENERATOR_REPAIR"
  | "HEALTH_PROFESSIONAL"
  | "OTHER";

const serviceTypeOptions: Array<{ label: string; value: ServiceProviderType; note?: string }> = [
  { label: "Painter", value: "PAINTER" },
  { label: "Plumber", value: "PLUMBER" },
  { label: "Mechanic", value: "MECHANIC" },
  { label: "Electrician", value: "ELECTRICIAN" },
  { label: "Cleaner", value: "CLEANER" },
  { label: "Carpenter", value: "CARPENTER" },
  { label: "AC technician", value: "AC_TECHNICIAN" },
  { label: "Generator repair technician", value: "GENERATOR_REPAIR" },
  { label: "Doctor / health professional readiness only", value: "HEALTH_PROFESSIONAL", note: "Future approval required before live booking." },
  { label: "Other approved service provider", value: "OTHER" }
];

const initial = {
  fullName: "",
  businessName: "",
  serviceType: "PLUMBER" as ServiceProviderType,
  phoneNumber: "",
  email: "",
  city: "Kano",
  state: "Kano",
  serviceAreas: "",
  address: "",
  experienceSummary: "",
  toolsOrEquipment: "",
  availability: "",
  identificationType: "",
  identificationNumber: "",
  detailsAccurateAccepted: false,
  reviewRequiredAccepted: false,
  noAutoDispatchAccepted: false
};

function areas(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function ServiceProviderApplicationForm() {
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");

    try {
      const response = await fetch(`${site.apiBaseUrl}/service-provider-applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          serviceAreas: areas(form.serviceAreas),
          businessName: form.businessName || undefined,
          email: form.email || undefined,
          address: form.address || undefined,
          experienceSummary: form.experienceSummary || undefined,
          toolsOrEquipment: form.toolsOrEquipment || undefined,
          availability: form.availability || undefined,
          identificationType: form.identificationType || undefined,
          identificationNumber: form.identificationNumber || undefined
        })
      });

      if (!response.ok) {
        throw new Error("Application could not be submitted");
      }

      setSuccess("Your service provider application has been submitted. KariGO will review your details and contact you with the next steps.");
      setForm(initial);
    } catch {
      setError("We could not submit your service provider application right now. Please check the required fields and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <div className="form-grid">
        <label>Full name<input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
        <label>Business name optional<input value={form.businessName} onChange={(event) => setForm({ ...form, businessName: event.target.value })} /></label>
        <label>Service type<select value={form.serviceType} onChange={(event) => setForm({ ...form, serviceType: event.target.value as ServiceProviderType })}>
          {serviceTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select></label>
        <label>Phone number<input required value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} /></label>
        <label>Email optional<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label>City<input required value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label>
        <label>State<input required value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} /></label>
        <label>Service areas<input value={form.serviceAreas} onChange={(event) => setForm({ ...form, serviceAreas: event.target.value })} placeholder="Nasarawa GRA, Bompai, Tarauni" /></label>
      </div>
      {form.serviceType === "HEALTH_PROFESSIONAL" ? <p className="notice">Health professional applications are collected for readiness review only. KariGO is not activating live medical booking through this form.</p> : null}
      <label>Address optional<textarea value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
      <label>Experience summary<textarea required value={form.experienceSummary} onChange={(event) => setForm({ ...form, experienceSummary: event.target.value })} placeholder="Tell KariGO about your work experience, service quality and typical jobs." /></label>
      <label>Tools or equipment optional<textarea value={form.toolsOrEquipment} onChange={(event) => setForm({ ...form, toolsOrEquipment: event.target.value })} /></label>
      <label>Availability optional<input value={form.availability} onChange={(event) => setForm({ ...form, availability: event.target.value })} placeholder="Weekdays, weekends, emergency availability, etc." /></label>
      <div className="form-grid">
        <label>Identification type optional<input value={form.identificationType} onChange={(event) => setForm({ ...form, identificationType: event.target.value })} placeholder="National ID, driver's licence, CAC, etc." /></label>
        <label>Identification number optional<input value={form.identificationNumber} onChange={(event) => setForm({ ...form, identificationNumber: event.target.value })} /></label>
      </div>
      <label className="check-row"><input type="checkbox" checked={form.detailsAccurateAccepted} onChange={(event) => setForm({ ...form, detailsAccurateAccepted: event.target.checked })} /> I confirm these details are accurate.</label>
      <label className="check-row"><input type="checkbox" checked={form.reviewRequiredAccepted} onChange={(event) => setForm({ ...form, reviewRequiredAccepted: event.target.checked })} /> I understand KariGO must review and approve my application before onboarding.</label>
      <label className="check-row"><input type="checkbox" checked={form.noAutoDispatchAccepted} onChange={(event) => setForm({ ...form, noAutoDispatchAccepted: event.target.checked })} /> I understand this does not create live dispatch, provider login, payments or payouts.</label>
      {success ? <p className="success">{success}</p> : null}
      {error ? <p className="error" role="alert">{error}</p> : null}
      <button disabled={loading || !form.detailsAccurateAccepted || !form.reviewRequiredAccepted || !form.noAutoDispatchAccepted}>
        {loading ? "Submitting..." : "Submit Service Provider Application"}
      </button>
    </form>
  );
}
