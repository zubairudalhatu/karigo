"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { vendorApi, VendorProfile } from "../../src/api/vendor.api";
import { DashboardShell, ErrorMessage, Loading } from "../../src/components/dashboard";
import { friendlyError } from "../../src/lib/errors";
import { authApi } from "../../src/api/auth.api";

type VendorProfileUpdatePayload = Pick<
  VendorProfile,
  "businessName" | "description" | "phoneNumber" | "email" | "address" | "city" | "state" | "openingTime" | "closingTime" | "logoUrl" | "coverImageUrl" | "isOpen"
>;

function profileUpdatePayload(profile: VendorProfile): VendorProfileUpdatePayload {
  return {
    businessName: profile.businessName,
    description: profile.description ?? "",
    phoneNumber: profile.phoneNumber,
    email: profile.email ?? "",
    address: profile.address,
    city: profile.city,
    state: profile.state,
    openingTime: profile.openingTime ?? undefined,
    closingTime: profile.closingTime ?? undefined,
    logoUrl: profile.logoUrl ?? "",
    coverImageUrl: profile.coverImageUrl ?? "",
    isOpen: profile.isOpen
  };
}

export default function Profile() {
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);
  const [saving, setSaving] = useState(false);
  const [phoneChange, setPhoneChange] = useState({ newPhoneNumber: "", currentPassword: "", otp: "", requestId: "" });

  async function submitPhoneChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess("");
    try {
      if (!phoneChange.requestId) { const result = await authApi.startPhoneChange(phoneChange); setPhoneChange({ ...phoneChange, requestId: result.requestId }); setSuccess(`Verification code sent to ${result.newPhoneNumberMasked}.`); }
      else { await authApi.confirmPhoneChange({ requestId: phoneChange.requestId, otp: phoneChange.otp }); setSuccess("Phone changed. Existing sessions were revoked; sign in again."); }
    } catch (cause) { setError(friendlyError(cause, "form")); }
  }

  useEffect(() => {
    vendorApi.profile().then(setProfile).catch((e) => setError(friendlyError(e)));
  }, []);

  if (!profile && !error) return <DashboardShell><Loading /></DashboardShell>;

  async function handleUpload(event: ChangeEvent<HTMLInputElement>, purpose: "logo" | "cover") {
    const file = event.target.files?.[0];
    if (!file || !profile) return;
    setUploading(purpose);
    setError("");
    setSuccess("");
    try {
      const uploaded = await vendorApi.uploadFile(file, purpose);
      setProfile({ ...profile, [purpose === "logo" ? "logoUrl" : "coverImageUrl"]: uploaded.url });
      setSuccess(`${purpose === "logo" ? "Logo" : "Cover image"} uploaded. Save profile to keep this change.`);
    } catch (err) {
      setError(friendlyError(err, "form"));
    } finally {
      setUploading(null);
      event.target.value = "";
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      setError("");
      setSuccess("");
      setProfile(await vendorApi.update(profileUpdatePayload(profile)));
      setSuccess("Business profile updated.");
    } catch (err) {
      setError(friendlyError(err, "form"));
    } finally {
      setSaving(false);
    }
  }

  return <DashboardShell>
    <header className="topbar"><div><p className="muted">Business settings</p><h1>Profile</h1></div></header>
    <ErrorMessage>{error}</ErrorMessage>
    {success ? <p className="success">{success}</p> : null}
    {profile ? <form className="card profile-form" onSubmit={(event) => void submit(event)}>
      <label>Business name<input value={profile.businessName} onChange={(event) => setProfile({ ...profile, businessName: event.target.value })} /></label>
      <label>Description<textarea value={profile.description ?? ""} onChange={(event) => setProfile({ ...profile, description: event.target.value })} /></label>
      <label>Business contact phone<input value={profile.phoneNumber} onChange={(event) => setProfile({ ...profile, phoneNumber: event.target.value })} /></label>
      <label>Email<input value={profile.email ?? ""} onChange={(event) => setProfile({ ...profile, email: event.target.value })} /></label>
      <label>Address<input value={profile.address} onChange={(event) => setProfile({ ...profile, address: event.target.value })} /></label>
      <label>City<input value={profile.city} onChange={(event) => setProfile({ ...profile, city: event.target.value })} /></label>
      <section className="upload-grid">
        <div className="upload-box">
          <strong>Logo</strong>
          {profile.logoUrl ? <img className="brand-preview" src={profile.logoUrl} alt="Vendor logo preview" /> : <p className="muted">No logo uploaded yet.</p>}
          <label className="file-drop">Upload logo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void handleUpload(event, "logo")} /></label>
          <input value={profile.logoUrl ?? ""} placeholder="Logo URL" onChange={(event) => setProfile({ ...profile, logoUrl: event.target.value })} />
        </div>
        <div className="upload-box">
          <strong>Cover image</strong>
          {profile.coverImageUrl ? <img className="cover-preview" src={profile.coverImageUrl} alt="Vendor cover preview" /> : <p className="muted">No cover image uploaded yet.</p>}
          <label className="file-drop">Upload cover image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void handleUpload(event, "cover")} /></label>
          <input value={profile.coverImageUrl ?? ""} placeholder="Cover image URL" onChange={(event) => setProfile({ ...profile, coverImageUrl: event.target.value })} />
        </div>
      </section>
      <p className="muted">Images are stored by KariGO for your vendor profile. Do not upload documents containing passwords, OTPs, payment secrets or private identity numbers.</p>
      <label className="check-row"><input type="checkbox" checked={profile.isOpen} onChange={(event) => setProfile({ ...profile, isOpen: event.target.checked })} /> Store open</label>
      {uploading ? <p className="muted">Uploading {uploading === "logo" ? "logo" : "cover image"}...</p> : null}
      <button disabled={saving || Boolean(uploading)}>{saving ? "Saving..." : "Save profile"}</button>
    </form> : null}
    <form className="card profile-form" onSubmit={(event) => void submitPhoneChange(event)}><h2>Change verified account phone</h2><p className="muted">This guided security flow is separate from the public business contact. It verifies the new number, revokes sessions and places payout/security actions on a 24-hour hold.</p>{!phoneChange.requestId ? <><label>New phone number<input required value={phoneChange.newPhoneNumber} onChange={(event) => setPhoneChange({ ...phoneChange, newPhoneNumber: event.target.value })} /></label><label>Current password<input required type="password" value={phoneChange.currentPassword} onChange={(event) => setPhoneChange({ ...phoneChange, currentPassword: event.target.value })} /></label></> : <label>Verification code<input required inputMode="numeric" maxLength={6} value={phoneChange.otp} onChange={(event) => setPhoneChange({ ...phoneChange, otp: event.target.value.replace(/\D/g, "") })} /></label>}<button>{phoneChange.requestId ? "Verify and change number" : "Send verification code"}</button><p className="muted">Lost the old SIM? Contact KariGO Support for an audited identity review. Support cannot bypass verification.</p></form>
  </DashboardShell>;
}
