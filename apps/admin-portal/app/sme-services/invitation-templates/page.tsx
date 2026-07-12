"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SmeServicesPilotInvitationPreview, SmeServicesPilotInvitationTemplatesResponse, smeServicesApi } from "../../../src/api/sme-services.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../../src/components/portal";
import { friendlyError } from "../../../src/lib/errors";

const initialForm = {
  templateKey: "",
  recipientName: "",
  pilotZone: "Kano selected pilot zones",
  pilotDate: "",
  serviceFocus: "SME Services",
  supportContact: "KariGO operations",
  customNote: ""
};

export default function SmeServicesPilotInvitationTemplatesPage() {
  const [data, setData] = useState<SmeServicesPilotInvitationTemplatesResponse | null>(null);
  const [form, setForm] = useState(initialForm);
  const [preview, setPreview] = useState<SmeServicesPilotInvitationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const selectedTemplate = useMemo(() => data?.templates.find((template) => template.key === form.templateKey) ?? null, [data, form.templateKey]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await smeServicesApi.pilotInvitationTemplates();
      setData(response);
      setForm((current) => ({ ...current, templateKey: current.templateKey || response.templates[0]?.key || "" }));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  async function generatePreview() {
    if (!form.templateKey) {
      setError("Select an invitation template first.");
      return;
    }
    setGenerating(true);
    setCopied(false);
    setError("");
    try {
      setPreview(await smeServicesApi.previewPilotInvitationTemplate(form));
    } catch (e) {
      setError(friendlyError(e, "form"));
    } finally {
      setGenerating(false);
    }
  }

  async function copyPreview() {
    if (!preview) return;
    await navigator.clipboard.writeText(`${preview.preview.subject}\n\n${preview.preview.messageText}`);
    setCopied(true);
  }

  useEffect(() => { void load(); }, []);

  return <PortalShell>
    <h1>SME Services invitation templates</h1>
    <p className="muted">Safe manual copy templates for SME Services pilot customers, service providers, internal observers, operations staff and support staff. This page does not send SMS, email, WhatsApp, push or in-app invitations, and it does not activate dispatch, payments, payouts, provider login, provider app access or medical booking.</p>
    <div className="top-actions">
      <Link className="button-link" href="/sme-services/participants">Pilot participants</Link>
      <Link className="button-link secondary" href="/sme-services/launch-control">Launch control</Link>
      <Link className="button-link secondary" href="/sme-services/readiness">Pilot readiness</Link>
      <button className="secondary" onClick={() => void load()}>Refresh</button>
    </div>
    <ErrorMessage>{error}</ErrorMessage>
    {loading ? <Loading /> : data ? <>
      <section className="grid">
        <article className="card"><span className="muted">Templates</span><p className="metric">{data.templates.length}</p></article>
        <article className="card"><span className="muted">Automated sending</span><p><Badge>{data.guardrails.automatedSendingEnabled ? "Enabled" : "Disabled"}</Badge></p></article>
        <article className="card"><span className="muted">Live dispatch</span><p><Badge>{data.guardrails.liveDispatchEnabled ? "Enabled" : "Disabled"}</Badge></p></article>
        <article className="card"><span className="muted">Provider app access</span><p><Badge>{data.guardrails.providerAppAccessEnabled ? "Enabled" : "Disabled"}</Badge></p></article>
      </section>

      <section className="detail-grid">
        <article className="card">
          <h2>Template details</h2>
          {selectedTemplate ? <>
            <p><Badge>{selectedTemplate.audience}</Badge></p>
            <p><strong>{selectedTemplate.title}</strong></p>
            <p className="muted">{selectedTemplate.description}</p>
            <p><strong>Subject:</strong> {selectedTemplate.subject}</p>
            <p><strong>Suggested channels:</strong> {selectedTemplate.suggestedChannels.join(", ")}</p>
            <p><strong>Required placeholders:</strong> {selectedTemplate.requiredVariables.join(", ")}</p>
            <p className="muted">{selectedTemplate.safetyNote}</p>
          </> : <Empty>Select a template to preview details.</Empty>}
        </article>

        <article className="card">
          <h2>Safety guardrails</h2>
          <p className="muted">{data.safetyNote}</p>
          <p className="muted">{data.guardrails.note}</p>
          <p><Badge>SMS {data.guardrails.smsEnabled ? "enabled" : "disabled"}</Badge></p>
          <p><Badge>Email {data.guardrails.emailEnabled ? "enabled" : "disabled"}</Badge></p>
          <p><Badge>WhatsApp {data.guardrails.whatsappEnabled ? "enabled" : "disabled"}</Badge></p>
          <p><Badge>Push {data.guardrails.pushEnabled ? "enabled" : "disabled"}</Badge></p>
        </article>
      </section>

      <section className="card section">
        <h2>Generate manual preview</h2>
        <div className="form-grid">
          <label>Template<select value={form.templateKey} onChange={(event) => {
            setPreview(null);
            setCopied(false);
            setForm({ ...form, templateKey: event.target.value });
          }}>
            {data.templates.map((template) => <option key={template.key} value={template.key}>{template.title}</option>)}
          </select></label>
          <label>Recipient name<input value={form.recipientName} onChange={(event) => setForm({ ...form, recipientName: event.target.value })} placeholder="Optional; defaults to there" /></label>
          <label>Pilot zone<input value={form.pilotZone} onChange={(event) => setForm({ ...form, pilotZone: event.target.value })} /></label>
          <label>Pilot date<input value={form.pilotDate} onChange={(event) => setForm({ ...form, pilotDate: event.target.value })} placeholder="Example: 20 July 2026" /></label>
          <label>Service focus<input value={form.serviceFocus} onChange={(event) => setForm({ ...form, serviceFocus: event.target.value })} /></label>
          <label>Support contact label<input value={form.supportContact} onChange={(event) => setForm({ ...form, supportContact: event.target.value })} placeholder="Use a role label, not private contact details" /></label>
        </div>
        <label>Additional note<textarea value={form.customNote} onChange={(event) => setForm({ ...form, customNote: event.target.value })} placeholder="Optional public-safe note. Do not enter passwords, OTPs, payment details, private provider contact details or sensitive medical information." /></label>
        <button disabled={generating} onClick={() => void generatePreview()}>{generating ? "Generating..." : "Generate preview"}</button>
      </section>

      <section className="card section">
        <h2>Manual message preview</h2>
        {preview ? <>
          <p><strong>{preview.preview.subject}</strong></p>
          <textarea readOnly value={preview.preview.messageText} rows={14} />
          <p className="muted">{preview.preview.copyInstructions}</p>
          <p className="muted">{preview.preview.safetyNote}</p>
          <button className="secondary" onClick={() => void copyPreview()}>{copied ? "Copied" : "Copy preview text"}</button>
        </> : <Empty>Generate a preview to copy manual invitation text.</Empty>}
      </section>
    </> : null}
  </PortalShell>;
}
