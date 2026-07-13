"use client";

import { FormEvent, useState } from "react";
import { site } from "../lib/site";

type Category = "RESTAURANT" | "GROCERIES" | "MARKET_ITEMS" | "PHARMACY" | "SME_SERVICES" | "OTHER_MARKETPLACE_VENDOR";

const categoryOptions: Array<{ label: string; value: Category }> = [
  { label: "Restaurant", value: "RESTAURANT" },
  { label: "Grocery store", value: "GROCERIES" },
  { label: "Market seller", value: "MARKET_ITEMS" },
  { label: "Pharmacy pending approval", value: "PHARMACY" },
  { label: "Service provider", value: "SME_SERVICES" },
  { label: "Other marketplace vendor", value: "OTHER_MARKETPLACE_VENDOR" }
];

const kanoPilotLocation = [{ label: "Kano", value: "Kano" }];

const initial = {
  businessName: "",
  contactFullName: "",
  businessPhoneNumber: "",
  businessEmail: "",
  businessCategory: "RESTAURANT" as Category,
  businessAddress: "",
  city: "Kano",
  state: "Kano",
  businessDescription: "",
  websiteOrSocialLink: "",
  notes: "",
  declarationAccepted: false,
  privacyAccepted: false,
  contactConsentAccepted: false
};

export function VendorApplicationForm() {
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
      const response = await fetch(`${site.apiBaseUrl}/vendor-applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessCategory: form.businessCategory,
          businessName: form.businessName,
          businessType: form.businessCategory.replaceAll("_", " ").toLowerCase(),
          businessDescription: form.businessDescription,
          businessAddress: form.businessAddress,
          state: form.state,
          city: form.city,
          businessPhoneNumber: form.businessPhoneNumber,
          businessEmail: form.businessEmail,
          websiteOrSocialLink: form.websiteOrSocialLink || undefined,
          contactFullName: form.contactFullName,
          contactRole: "Owner/Manager",
          contactPhoneNumber: form.businessPhoneNumber,
          contactEmail: form.businessEmail,
          preferredContactMethod: "PHONE",
          deliveryReadiness: "Submitted from public KariGO website",
          deliveryPreference: "KariGO review required",
          catalogueCategory: form.businessCategory,
          existingDelivery: form.notes || undefined,
          declarationAccepted: form.declarationAccepted,
          privacyAccepted: form.privacyAccepted,
          contactConsentAccepted: form.contactConsentAccepted
        })
      });

      if (!response.ok) {
        throw new Error("Application could not be submitted");
      }
      setSuccess("Your vendor application has been submitted. KariGO will review your details and contact you with the next steps.");
      setForm(initial);
    } catch {
      setError("We could not submit your application right now. Please check your details and try again, or contact KariGO directly.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <p className="muted">Vendor applications are currently open for Kano only during the controlled pilot.</p>
      <div className="form-grid">
        <label>Business name<input required value={form.businessName} onChange={(event) => setForm({ ...form, businessName: event.target.value })} /></label>
        <label>Contact person name<input required value={form.contactFullName} onChange={(event) => setForm({ ...form, contactFullName: event.target.value })} /></label>
        <label>Phone number<input required value={form.businessPhoneNumber} onChange={(event) => setForm({ ...form, businessPhoneNumber: event.target.value })} /></label>
        <label>Email<input required type="email" value={form.businessEmail} onChange={(event) => setForm({ ...form, businessEmail: event.target.value })} /></label>
        <label>Business category<select value={form.businessCategory} onChange={(event) => setForm({ ...form, businessCategory: event.target.value as Category })}>{categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label>City<select required value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })}>{kanoPilotLocation.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label>State<select required value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })}>{kanoPilotLocation.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label>Website or social link optional<input value={form.websiteOrSocialLink} onChange={(event) => setForm({ ...form, websiteOrSocialLink: event.target.value })} /></label>
      </div>
      <label>Business address<textarea required value={form.businessAddress} onChange={(event) => setForm({ ...form, businessAddress: event.target.value })} /></label>
      <label>Description<textarea required value={form.businessDescription} onChange={(event) => setForm({ ...form, businessDescription: event.target.value })} /></label>
      <label>Notes optional<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
      <label className="check-row"><input type="checkbox" checked={form.declarationAccepted} onChange={(event) => setForm({ ...form, declarationAccepted: event.target.checked })} /> I confirm these business details are accurate.</label>
      <label className="check-row"><input type="checkbox" checked={form.privacyAccepted} onChange={(event) => setForm({ ...form, privacyAccepted: event.target.checked })} /> I understand KariGO must review this application before onboarding.</label>
      <label className="check-row"><input type="checkbox" checked={form.contactConsentAccepted} onChange={(event) => setForm({ ...form, contactConsentAccepted: event.target.checked })} /> KariGO may contact me about this application.</label>
      {success ? <p className="success">{success}</p> : null}
      {error ? <p className="error" role="alert">{error}</p> : null}
      <button disabled={loading || !form.declarationAccepted || !form.privacyAccepted || !form.contactConsentAccepted}>{loading ? "Submitting..." : "Submit Vendor Application"}</button>
    </form>
  );
}
