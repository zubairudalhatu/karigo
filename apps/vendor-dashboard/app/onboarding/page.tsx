"use client";

import { FormEvent, useEffect, useState } from "react";
import { vendorApi, VendorOnboardingDocument } from "../../src/api/vendor.api";
import { DashboardShell, Empty, ErrorMessage, StatusBadge } from "../../src/components/dashboard";
import { friendlyError } from "../../src/lib/errors";

const initialForm = { documentType: "CAC_CERTIFICATE", documentName: "", documentUrl: "" };

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Not reviewed";
}

export default function VendorOnboardingPage() {
  const [documents, setDocuments] = useState<VendorOnboardingDocument[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setDocuments(await vendorApi.onboardingDocuments());
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await vendorApi.uploadOnboardingDocument({
        documentType: form.documentType,
        documentName: form.documentName || undefined,
        documentUrl: form.documentUrl
      });
      setMessage("Onboarding document submitted for KariGO review.");
      setForm(initialForm);
      await load();
    } catch (e) {
      setError(friendlyError(e, "form"));
    } finally {
      setSaving(false);
    }
  }

  return <DashboardShell>
    <h1>Vendor onboarding</h1>
    <p className="muted">Submit verification document references for KariGO Admin review. Upload private files only to the approved secure storage location and paste the controlled document URL here.</p>
    <p className="success">{message}</p>
    <ErrorMessage>{error}</ErrorMessage>

    <section className="grid two">
      <form className="card" onSubmit={(event) => void submit(event)}>
        <h2>Submit document</h2>
        <label>Document type
          <select value={form.documentType} onChange={(event) => setForm((current) => ({ ...current, documentType: event.target.value }))}>
            <option value="CAC_CERTIFICATE">CAC certificate</option>
            <option value="BUSINESS_PERMIT">Business permit</option>
            <option value="OWNER_ID">Owner ID</option>
            <option value="FOOD_SAFETY_OR_HEALTH_PERMIT">Food safety or health permit</option>
            <option value="STORE_PHOTO">Store photo</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
        <label>Display name
          <input value={form.documentName} onChange={(event) => setForm((current) => ({ ...current, documentName: event.target.value }))} placeholder="Example: CAC certificate 2026" />
        </label>
        <label>Secure document URL
          <input required value={form.documentUrl} onChange={(event) => setForm((current) => ({ ...current, documentUrl: event.target.value }))} placeholder="https://..." />
        </label>
        <p className="muted">Do not paste passwords, OTPs, payment secrets or private identity numbers in this form.</p>
        <button disabled={saving}>{saving ? "Submitting..." : "Submit for review"}</button>
      </form>

      <section className="card">
        <h2>Review status</h2>
        {loading ? <p className="muted">Loading documents...</p> : documents.length ? documents.map((document) => <article className="list-card" key={document.id}>
          <strong>{document.documentName || document.documentType}</strong>
          <p><StatusBadge>{document.verificationStatus}</StatusBadge></p>
          <p className="muted">Uploaded {formatDate(document.uploadedAt)}</p>
          <p className="muted">Reviewed {formatDate(document.reviewedAt)}</p>
          <p><a href={document.documentUrl} target="_blank" rel="noreferrer">Open document reference</a></p>
          {document.adminNote ? <p className="notice">{document.adminNote}</p> : null}
        </article>) : <Empty>No onboarding documents yet. Submit the required document references when KariGO operations requests them.</Empty>}
      </section>
    </section>
  </DashboardShell>;
}
