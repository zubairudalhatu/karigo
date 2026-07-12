"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SmeServicesPilotReadiness, SmeServicesPilotReadinessItem, smeServicesApi } from "../../../src/api/sme-services.api";
import { Badge, ErrorMessage, Loading, PortalShell } from "../../../src/components/portal";
import { friendlyError } from "../../../src/lib/errors";

function date(value?: string | null) {
  if (!value) return "Not completed";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function SmeServicesPilotReadinessPage() {
  const [readiness, setReadiness] = useState<SmeServicesPilotReadiness | null>(null);
  const [items, setItems] = useState<SmeServicesPilotReadinessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category))), [items]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await smeServicesApi.pilotReadiness();
      setReadiness(data);
      setItems(data.items);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  function updateItem(key: string, patch: Partial<Pick<SmeServicesPilotReadinessItem, "isCompleted" | "note">>) {
    setItems((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item));
  }

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const data = await smeServicesApi.updatePilotReadiness(items.map((item) => ({
        key: item.key,
        isCompleted: item.isCompleted,
        note: item.note ?? null
      })));
      setReadiness(data);
      setItems(data.items);
      setMessage("SME Services pilot readiness checklist saved.");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return <PortalShell>
    <h1>SME Services pilot readiness</h1>
    <p className="muted">Internal checklist before inviting real pilot customers and service providers. Completing this checklist does not activate live dispatch, payments, payouts, provider login, provider app access, public provider contact exposure or medical booking.</p>
    <div className="top-actions">
      <Link className="button-link" href="/sme-services/summary">Operations summary</Link>
      <Link className="button-link secondary" href="/sme-services/launch-control">Launch control</Link>
      <Link className="button-link secondary" href="/sme-services/participants">Pilot participants</Link>
      <Link className="button-link secondary" href="/sme-services">Customer requests</Link>
      <button className="secondary" onClick={() => void load()}>Refresh</button>
      <button disabled={saving || loading} onClick={() => void save()}>{saving ? "Saving..." : "Save checklist"}</button>
    </div>
    <p className="success">{message}</p>
    <ErrorMessage>{error}</ErrorMessage>
    {loading ? <Loading /> : readiness ? <>
      <section className="grid">
        <article className="card"><span className="muted">Pilot status</span><p><Badge>{readiness.status}</Badge></p></article>
        <article className="card"><span className="muted">Required completed</span><p className="metric">{readiness.requiredCompleted}/{readiness.requiredTotal}</p></article>
        <article className="card"><span className="muted">Approved providers</span><p className="metric">{readiness.systemSnapshot.approvedProviders}</p></article>
        <article className="card"><span className="muted">Pending applications</span><p className="metric">{readiness.systemSnapshot.pendingProviderApplications}</p></article>
      </section>

      <section className="section">
        <h2>System snapshot</h2>
        <div className="grid">
          <article className="card"><span className="muted">Active requests</span><p className="metric">{readiness.systemSnapshot.activeRequests}</p></article>
          <article className="card"><span className="muted">Provider directory ready</span><p><Badge>{readiness.systemSnapshot.approvedProvidersReady ? "Ready" : "Not ready"}</Badge></p></article>
          <article className="card"><span className="muted">Provider queue</span><p><Badge>{readiness.systemSnapshot.providerQueueReady ? "Clear" : "Pending review"}</Badge></p></article>
          <article className="card"><span className="muted">Health readiness records</span><p className="metric">{readiness.systemSnapshot.healthProfessionalReadinessApplications}</p></article>
        </div>
      </section>

      <section className="section">
        <h2>Checklist</h2>
        {categories.map((category) => <div className="section" key={category}>
          <h3>{category}</h3>
          {items.filter((item) => item.category === category).map((item) => <article className="card" key={item.key}>
            <label className="check-row">
              <input type="checkbox" checked={item.isCompleted} onChange={(e) => updateItem(item.key, { isCompleted: e.target.checked })} />
              <strong>{item.label}</strong>
              <Badge>{item.isRequired ? "Required" : "Optional"}</Badge>
            </label>
            <p className="muted">{item.description}</p>
            <label>Internal note<textarea value={item.note ?? ""} onChange={(e) => updateItem(item.key, { note: e.target.value })} placeholder="Internal operations note. Do not enter credentials, OTPs, payment details or sensitive health information." /></label>
            <p className="muted">Completed: {date(item.completedAt)}</p>
          </article>)}
        </div>)}
      </section>

      <section className="card">
        <h2>Safety note</h2>
        <p className="muted">{readiness.safetyNote}</p>
        <p className="muted">Current guardrails: live dispatch {readiness.guardrails.liveDispatchEnabled ? "enabled" : "disabled"}, live payments {readiness.guardrails.livePaymentsEnabled ? "enabled" : "disabled"}, provider login {readiness.guardrails.providerLoginEnabled ? "enabled" : "disabled"}, provider payout {readiness.guardrails.providerPayoutEnabled ? "enabled" : "disabled"}.</p>
      </section>
    </> : null}
  </PortalShell>;
}
