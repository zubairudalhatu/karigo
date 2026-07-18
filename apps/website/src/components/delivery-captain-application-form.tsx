"use client";

import { FormEvent, useState } from "react";
import { ApplicantAccount, ApplicantOnboardingCard } from "./applicant-onboarding-card";
import { site } from "../lib/site";

type VehicleType = "MOTORCYCLE" | "BICYCLE" | "TRICYCLE" | "CAR" | "VAN" | "OTHER";

const vehicleOptions: Array<{ label: string; value: VehicleType }> = [
  { label: "Motorcycle", value: "MOTORCYCLE" },
  { label: "Bicycle", value: "BICYCLE" },
  { label: "Tricycle", value: "TRICYCLE" },
  { label: "Car", value: "CAR" },
  { label: "Van", value: "VAN" },
  { label: "Other", value: "OTHER" }
];

const launchCityOptions = [{ label: "Kano", value: "Kano" }, { label: "Abuja", value: "Abuja" }];
const launchStateOptions = [{ label: "Kano", value: "Kano" }, { label: "FCT", value: "FCT" }];

function stateForCity(city: string) {
  return city === "Abuja" ? "FCT" : "Kano";
}

const initial = {
  fullName: "",
  phoneNumber: "",
  email: "",
  city: "Kano",
  state: "Kano",
  address: "",
  preferredZone: "",
  vehicleType: "MOTORCYCLE" as VehicleType,
  vehiclePlateNumber: "",
  driverLicenceNumber: "",
  profilePhotoUrl: "",
  driverLicenceDocumentUrl: "",
  vehicleParticularsDocumentUrl: "",
  insuranceDocumentUrl: "",
  riderExperience: "",
  guarantorName: "",
  guarantorPhone: "",
  notes: "",
  declarationAccepted: false,
  privacyAccepted: false,
  contactConsentAccepted: false
};

export function DeliveryCaptainApplicationForm() {
  const [form, setForm] = useState(initial);
  const [accountReady, setAccountReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  function applyApplicantAccount(account: ApplicantAccount) {
    setAccountReady(true);
    setForm((current) => ({
      ...current,
      fullName: current.fullName || account.fullName,
      phoneNumber: account.phoneNumber,
      email: account.email || current.email
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");
    try {
      const response = await fetch(`${site.apiBaseUrl}/delivery-captain-applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          phoneNumber: form.phoneNumber,
          email: form.email || undefined,
          city: form.city,
          state: form.state,
          address: form.address,
          preferredZone: form.preferredZone || undefined,
          vehicleType: form.vehicleType,
          vehiclePlateNumber: form.vehiclePlateNumber || undefined,
          driverLicenceNumber: form.driverLicenceNumber || undefined,
          profilePhotoUrl: form.profilePhotoUrl || undefined,
          riderExperience: form.riderExperience || undefined,
          guarantorName: form.guarantorName,
          guarantorPhone: form.guarantorPhone,
          notes: form.notes || undefined,
          documents: [
            form.driverLicenceDocumentUrl ? {
              documentType: "DRIVER_LICENCE_IMAGE",
              documentName: "Driver licence image",
              documentUrl: form.driverLicenceDocumentUrl
            } : null,
            form.vehicleParticularsDocumentUrl ? {
              documentType: "VEHICLE_PARTICULARS",
              documentName: "Vehicle particulars",
              documentUrl: form.vehicleParticularsDocumentUrl
            } : null,
            form.insuranceDocumentUrl ? {
              documentType: "INSURANCE_DOCUMENT",
              documentName: "Insurance document",
              documentUrl: form.insuranceDocumentUrl
            } : null
          ].filter(Boolean),
          declarationAccepted: form.declarationAccepted,
          privacyAccepted: form.privacyAccepted,
          contactConsentAccepted: form.contactConsentAccepted
        })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
        throw new Error(message || "Application could not be submitted");
      }

      setSuccess("Your Delivery Captain application has been submitted. KariGO will review your details and contact you with the next steps.");
      setForm(initial);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not submit your application right now. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <ApplicantOnboardingCard
      kind="captain"
      title="Create your Captain account"
      helper="Delivery Captain applicants create an account first, verify their phone with OTP, then create a password before submitting application and document details."
      onReady={applyApplicantAccount}
    />
    {accountReady ? <form id="delivery-captain-application" className="form-card" onSubmit={submit}>
      <p className="eyebrow">Delivery Captain Application</p>
      <h2>Apply to deliver with KariGO in Kano or Abuja.</h2>
      <p className="muted">Application details are linked to your verified Captain account. Approval can activate the same account for delivery login, but dispatch, payouts and ride access remain separately controlled.</p>
      <div className="form-grid">
        <label>Full name<input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
        <label>Phone number<input required value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} /></label>
        <label>Email optional<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label>City<select required value={form.city} onChange={(event) => {
          const city = event.target.value;
          setForm({ ...form, city, state: stateForCity(city) });
        }}>{launchCityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label>State<select required value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })}>{launchStateOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label>Preferred launch zone optional<input value={form.preferredZone} onChange={(event) => setForm({ ...form, preferredZone: event.target.value })} /></label>
        <label>Vehicle type<select required value={form.vehicleType} onChange={(event) => setForm({ ...form, vehicleType: event.target.value as VehicleType })}>{vehicleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label>Plate number optional<input value={form.vehiclePlateNumber} onChange={(event) => setForm({ ...form, vehiclePlateNumber: event.target.value })} /></label>
        <label>Driver licence number optional<input value={form.driverLicenceNumber} onChange={(event) => setForm({ ...form, driverLicenceNumber: event.target.value })} /></label>
      </div>
      <label>Residential address<textarea required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
      <label>Delivery experience optional<textarea value={form.riderExperience} onChange={(event) => setForm({ ...form, riderExperience: event.target.value })} /></label>
      <div className="form-grid">
        <label>Profile photo HTTPS link optional<input value={form.profilePhotoUrl} onChange={(event) => setForm({ ...form, profilePhotoUrl: event.target.value })} /></label>
        <label>Driver licence image HTTPS link optional<input value={form.driverLicenceDocumentUrl} onChange={(event) => setForm({ ...form, driverLicenceDocumentUrl: event.target.value })} /></label>
        <label>Vehicle particulars HTTPS link optional<input value={form.vehicleParticularsDocumentUrl} onChange={(event) => setForm({ ...form, vehicleParticularsDocumentUrl: event.target.value })} /></label>
        <label>Insurance document HTTPS link optional<input value={form.insuranceDocumentUrl} onChange={(event) => setForm({ ...form, insuranceDocumentUrl: event.target.value })} /></label>
      </div>
      <p className="muted">KariGO can collect documents during review if secure links are not ready. Do not submit passwords, OTPs or payment secrets.</p>
      <div className="form-grid">
        <label>Guarantor name<input required value={form.guarantorName} onChange={(event) => setForm({ ...form, guarantorName: event.target.value })} /></label>
        <label>Guarantor phone<input required value={form.guarantorPhone} onChange={(event) => setForm({ ...form, guarantorPhone: event.target.value })} /></label>
      </div>
      <label>Notes optional<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
      <label className="check-row"><input type="checkbox" checked={form.declarationAccepted} onChange={(event) => setForm({ ...form, declarationAccepted: event.target.checked })} /> I confirm these application details are accurate.</label>
      <label className="check-row"><input type="checkbox" checked={form.privacyAccepted} onChange={(event) => setForm({ ...form, privacyAccepted: event.target.checked })} /> I understand KariGO must review and verify this application before onboarding.</label>
      <label className="check-row"><input type="checkbox" checked={form.contactConsentAccepted} onChange={(event) => setForm({ ...form, contactConsentAccepted: event.target.checked })} /> KariGO may contact me about this Delivery Captain application.</label>
      {success ? <p className="success">{success}</p> : null}
      {error ? <p className="error" role="alert">{error}</p> : null}
      <button disabled={loading || !form.declarationAccepted || !form.privacyAccepted || !form.contactConsentAccepted}>{loading ? "Submitting..." : "Submit Delivery Captain Application"}</button>
    </form> : null}
    </>
  );
}
