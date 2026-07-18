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
  driverLicenceExpiry: "",
  vehicleMake: "",
  vehicleModel: "",
  vehicleYear: "",
  vehicleColour: "",
  vehiclePlateNumber: "",
  vehicleType: "SEDAN",
  vehicleOwnership: "OWNER",
  notes: ""
};

const launchCityOptions = [{ label: "Kano", value: "Kano" }, { label: "Abuja", value: "Abuja" }];
const launchStateOptions = [{ label: "Kano", value: "Kano" }, { label: "FCT", value: "FCT" }];

function stateForCity(city: string) {
  return city === "Abuja" ? "FCT" : "Kano";
}

async function postReadiness(path: string, body: unknown) {
  const response = await fetch(`${site.apiBaseUrl}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) throw new Error("Ride request failed");
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
      setSuccess("You have joined the KariGO Rides waitlist. We will contact you when Ride service is available in your area.");
      setForm(waitlistInitial);
    } catch {
      setError("We could not submit your ride waitlist request right now. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  }

  return <form className="form-card" id="ride-waitlist" onSubmit={submit}>
    <h3>Join Ride Waitlist</h3>
    <p>Join the KariGO Rides interest list. Waitlist registration does not book a ride or activate live ride dispatch.</p>
    <div className="form-grid">
      <label>Full name<input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
      <label>Phone number<input required value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} /></label>
      <label>Email optional<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
      <label>Pickup area optional<input value={form.pickupArea} onChange={(event) => setForm({ ...form, pickupArea: event.target.value })} /></label>
      <label>City<select required value={form.city} onChange={(event) => {
        const city = event.target.value;
        setForm({ ...form, city, state: stateForCity(city) });
      }}>{launchCityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label>State<select required value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })}>{launchStateOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    </div>
    <label>Ride needs optional<textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
    {success ? <p className="success">{success}</p> : null}
    {error ? <p className="error" role="alert">{error}</p> : null}
    <button disabled={loading}>{loading ? "Joining..." : "Join Ride Waitlist"}</button>
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
        address: form.address,
        driverLicenceNumber: form.driverLicenceNumber,
        driverLicenceExpiry: form.driverLicenceExpiry,
        vehicleMake: form.vehicleMake,
        vehicleModel: form.vehicleModel,
        vehicleYear: Number(form.vehicleYear),
        vehicleColour: form.vehicleColour,
        vehiclePlateNumber: form.vehiclePlateNumber,
        notes: form.notes || undefined
      });
      setSuccess(response?.data?.message ?? "Ride Captain application submitted. KariGO will review your details before Ride dispatch activation.");
      setForm(driverInitial);
    } catch {
      setError("We could not submit your Ride Captain application right now. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  }

  return <form className="form-card" id="ride-captain-application" onSubmit={submit}>
    <h3>Ride Captain Application</h3>
    <p>Register for Ride Captain review while KariGO verifies ride operations. Approval is required and this form does not activate live ride dispatch.</p>
    <div className="form-grid">
      <label>Full name<input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
      <label>Phone number<input required value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} /></label>
      <label>Email optional<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
      <label>Address<input required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
      <label>City<select required value={form.city} onChange={(event) => {
        const city = event.target.value;
        setForm({ ...form, city, state: stateForCity(city) });
      }}>{launchCityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label>State<select required value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })}>{launchStateOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label>Driving licence number<input required value={form.driverLicenceNumber} onChange={(event) => setForm({ ...form, driverLicenceNumber: event.target.value })} /></label>
      <label>Licence expiry date<input required placeholder="YYYY-MM-DD" value={form.driverLicenceExpiry} onChange={(event) => setForm({ ...form, driverLicenceExpiry: event.target.value })} /></label>
      <label>Vehicle plate number<input required value={form.vehiclePlateNumber} onChange={(event) => setForm({ ...form, vehiclePlateNumber: event.target.value })} /></label>
      <label>Vehicle make<input required value={form.vehicleMake} onChange={(event) => setForm({ ...form, vehicleMake: event.target.value })} /></label>
      <label>Vehicle model<input required value={form.vehicleModel} onChange={(event) => setForm({ ...form, vehicleModel: event.target.value })} /></label>
      <label>Vehicle year<input required inputMode="numeric" value={form.vehicleYear} onChange={(event) => setForm({ ...form, vehicleYear: event.target.value.replace(/\D/g, "").slice(0, 4) })} /></label>
      <label>Vehicle colour<input required value={form.vehicleColour} onChange={(event) => setForm({ ...form, vehicleColour: event.target.value })} /></label>
      <label>Vehicle type<select value={form.vehicleType} onChange={(event) => setForm({ ...form, vehicleType: event.target.value })}><option value="SEDAN">Sedan</option><option value="SUV">SUV</option><option value="MINI_BUS">Mini bus</option><option value="TRICYCLE">Tricycle</option><option value="OTHER">Other</option></select></label>
      <label>Vehicle ownership<select value={form.vehicleOwnership} onChange={(event) => setForm({ ...form, vehicleOwnership: event.target.value })}><option value="OWNER">Owner</option><option value="LEASED">Leased</option><option value="COMPANY_ASSIGNED">Company assigned</option><option value="OTHER">Other</option></select></label>
    </div>
    <label>Notes optional<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
    {success ? <p className="success">{success}</p> : null}
    {error ? <p className="error" role="alert">{error}</p> : null}
    <button disabled={loading}>{loading ? "Submitting..." : "Submit Ride Captain Application"}</button>
  </form>;
}
