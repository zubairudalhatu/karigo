"use client";

import { FormEvent, useState } from "react";
import { site } from "../lib/site";

const waitlistInitial = {
  fullName: "",
  phoneNumber: "",
  email: "",
  city: "Kano",
  state: "Kano",
  pickupArea: "",
  note: ""
};

const driverInitial = {
  fullName: "",
  phoneNumber: "",
  email: "",
  city: "Kano",
  state: "Kano",
  address: "",
  driverLicenceNumber: "",
  vehicleMake: "",
  vehicleModel: "",
  vehicleYear: "",
  vehicleColour: "",
  vehiclePlateNumber: "",
  vehicleType: "SEDAN",
  vehicleOwnership: "OWNER",
  notes: ""
};

async function postReadiness(path: string, body: unknown) {
  const response = await fetch(`${site.apiBaseUrl}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) throw new Error("Taxi request failed");
  return response.json();
}

export function TaxiWaitlistForm() {
  const [form, setForm] = useState(waitlistInitial);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");
    try {
      await postReadiness("taxi/waitlist", {
        ...form,
        email: form.email || undefined,
        pickupArea: form.pickupArea || undefined,
        note: form.note || undefined
      });
      setSuccess("You have joined the KariGO Taxi waitlist. We will contact you when Taxi service is ready in your area.");
      setForm(waitlistInitial);
    } catch {
      setError("We could not submit your taxi waitlist request right now. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  }

  return <form className="form-card" id="taxi-waitlist" onSubmit={submit}>
    <h3>Join Taxi Waitlist</h3>
    <p>Taxi is coming soon. Waitlist registration does not book a ride or activate live taxi dispatch.</p>
    <div className="form-grid">
      <label>Full name<input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
      <label>Phone number<input required value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} /></label>
      <label>Email optional<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
      <label>Pickup area optional<input value={form.pickupArea} onChange={(event) => setForm({ ...form, pickupArea: event.target.value })} /></label>
      <label>City<input required value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label>
      <label>State<input required value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} /></label>
    </div>
    <label>Taxi needs optional<textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
    {success ? <p className="success">{success}</p> : null}
    {error ? <p className="error" role="alert">{error}</p> : null}
    <button disabled={loading}>{loading ? "Joining..." : "Join Taxi Waitlist"}</button>
  </form>;
}

export function TaxiDriverApplicationForm() {
  const [form, setForm] = useState(driverInitial);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");
    try {
      const response = await postReadiness("taxi/driver-applications", {
        ...form,
        email: form.email || undefined,
        address: form.address || undefined,
        driverLicenceNumber: form.driverLicenceNumber || undefined,
        vehicleMake: form.vehicleMake || undefined,
        vehicleModel: form.vehicleModel || undefined,
        vehicleYear: form.vehicleYear ? Number(form.vehicleYear) : undefined,
        vehicleColour: form.vehicleColour || undefined,
        vehiclePlateNumber: form.vehiclePlateNumber || undefined,
        notes: form.notes || undefined
      });
      setSuccess(response?.data?.message ?? "Taxi driver interest submitted. KariGO will review your details before taxi launch.");
      setForm(driverInitial);
    } catch {
      setError("We could not submit your taxi driver interest right now. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  }

  return <form className="form-card" id="taxi-driver-application" onSubmit={submit}>
    <h3>Taxi Driver Interest</h3>
    <p>Register interest while KariGO prepares verified taxi operations. Approval is required and this form does not activate live taxi dispatch.</p>
    <div className="form-grid">
      <label>Full name<input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
      <label>Phone number<input required value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} /></label>
      <label>Email optional<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
      <label>Address optional<input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
      <label>City<input required value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label>
      <label>State<input required value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} /></label>
      <label>Driver licence number optional<input value={form.driverLicenceNumber} onChange={(event) => setForm({ ...form, driverLicenceNumber: event.target.value })} /></label>
      <label>Vehicle plate number optional<input value={form.vehiclePlateNumber} onChange={(event) => setForm({ ...form, vehiclePlateNumber: event.target.value })} /></label>
      <label>Vehicle make optional<input value={form.vehicleMake} onChange={(event) => setForm({ ...form, vehicleMake: event.target.value })} /></label>
      <label>Vehicle model optional<input value={form.vehicleModel} onChange={(event) => setForm({ ...form, vehicleModel: event.target.value })} /></label>
      <label>Vehicle year optional<input inputMode="numeric" value={form.vehicleYear} onChange={(event) => setForm({ ...form, vehicleYear: event.target.value })} /></label>
      <label>Vehicle colour optional<input value={form.vehicleColour} onChange={(event) => setForm({ ...form, vehicleColour: event.target.value })} /></label>
      <label>Vehicle type<select value={form.vehicleType} onChange={(event) => setForm({ ...form, vehicleType: event.target.value })}><option value="SEDAN">Sedan</option><option value="SUV">SUV</option><option value="MINI_BUS">Mini bus</option><option value="TRICYCLE">Tricycle</option><option value="OTHER">Other</option></select></label>
      <label>Vehicle ownership<select value={form.vehicleOwnership} onChange={(event) => setForm({ ...form, vehicleOwnership: event.target.value })}><option value="OWNER">Owner</option><option value="LEASED">Leased</option><option value="COMPANY_ASSIGNED">Company assigned</option><option value="OTHER">Other</option></select></label>
    </div>
    <label>Notes optional<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
    {success ? <p className="success">{success}</p> : null}
    {error ? <p className="error" role="alert">{error}</p> : null}
    <button disabled={loading}>{loading ? "Submitting..." : "Submit Taxi Driver Application"}</button>
  </form>;
}
