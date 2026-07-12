"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { SmeServicesPilotDecisionStatus, SmeServicesPilotLaunchControl, smeServicesApi } from "../../../src/api/sme-services.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../../src/components/portal";
import { friendlyError } from "../../../src/lib/errors";

const decisionLabels: Record<SmeServicesPilotDecisionStatus, string> = {
  NOT_REVIEWED: "Not reviewed",
  GO_INTERNAL_PILOT: "Go for internal pilot",
  CONDITIONAL_GO: "Conditional go",
  NO_GO: "No-go",
  DEFERRED: "Deferred"
};

function date(value?: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function SmeServicesPilotLaunchControlPage() {
  const [control, setControl] = useState<SmeServicesPilotLaunchControl | null>(null);
  const [decisionStatus, setDecisionStatus] = useState<SmeServicesPilotDecisionStatus>("DEFERRED");
  const [decisionTitle, setDecisionTitle] = useState("");
  const [decisionSummary, setDecisionSummary] = useState("");
  const [conditions, setConditions] = useState("");
  const [blockers, setBlockers] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const options = useMemo(() => {
    const configured = control?.decisionOptions?.length ? control.decisionOptions : ["GO_INTERNAL_PILOT", "CONDITIONAL_GO", "NO_GO", "DEFERRED"];
    return configured as SmeServicesPilotDecisionStatus[];
  }, [control]);
  const readiness = control?.readiness;
  const goBlocked = decisionStatus === "GO_INTERNAL_PILOT" && readiness?.status !== "READY_FOR_INTERNAL_PILOT";

  async function load() {
    setLoading(true);
    setError("");
    try {
      setControl(await smeServicesApi.pilotLaunchControl());
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  async function recordDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const data = await smeServicesApi.recordPilotLaunchDecision({
        decisionStatus,
        decisionTitle,
        decisionSummary,
        conditions,
        blockers
      });
      setControl(data);
      setMessage("SME Services pilot launch decision has been recorded.");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return <PortalShell>
    <h1>SME Services launch control</h1>
    <p className="muted">Internal Go/No-Go decision record after the SME Services Pilot Readiness Checklist review. Recording a decision does not activate live dispatch, payments, payouts, provider login, provider app access, push notifications, medical booking or public provider contact sharing.</p>
    <div className="top-actions">
      <Link className="button-link" href="/sme-services/readiness">Pilot readiness</Link>
      <Link className="button-link secondary" href="/sme-services/summary">Operations summary</Link>
      <Link className="button-link secondary" href="/sme-services/participants">Pilot participants</Link>
      <Link className="button-link secondary" href="/sme-services/invitation-templates">Invitation templates</Link>
      <Link className="button-link secondary" href="/sme-services">Customer requests</Link>
      <button className="secondary" onClick={() => void load()}>Refresh</button>
    </div>
    <p className="success">{message}</p>
    <ErrorMessage>{error}</ErrorMessage>
    {loading ? <Loading /> : control ? <>
      <section className="grid">
        <article className="card"><span className="muted">Current decision</span><p><Badge>{decisionLabels[control.status]}</Badge></p></article>
        <article className="card"><span className="muted">Readiness status</span><p><Badge>{control.readiness.status}</Badge></p></article>
        <article className="card"><span className="muted">Required completed</span><p className="metric">{control.readiness.requiredCompleted}/{control.readiness.requiredTotal}</p></article>
        <article className="card"><span className="muted">Approved providers</span><p className="metric">{control.readiness.systemSnapshot.approvedProviders}</p></article>
      </section>

      <section className="detail-grid">
        <article className="card">
          <h2>Latest decision</h2>
          {control.latestDecision ? <>
            <p><Badge>{decisionLabels[control.latestDecision.decisionStatus]}</Badge></p>
            <p><strong>{control.latestDecision.decisionTitle ?? "No title recorded"}</strong></p>
            <p className="muted">{control.latestDecision.decisionSummary ?? "No summary recorded."}</p>
            {control.latestDecision.conditions ? <p><strong>Conditions:</strong> {control.latestDecision.conditions}</p> : null}
            {control.latestDecision.blockers ? <p><strong>Blockers:</strong> {control.latestDecision.blockers}</p> : null}
            <p className="muted">Recorded {date(control.latestDecision.recordedAt)} with readiness snapshot {control.latestDecision.requiredCompletedSnapshot}/{control.latestDecision.requiredTotalSnapshot} required items complete.</p>
          </> : <Empty>No pilot launch decision has been recorded yet.</Empty>}
        </article>

        <article className="card">
          <h2>Safety guardrails</h2>
          <p className="muted">{control.safetyNote}</p>
          <p><Badge>Live dispatch {control.guardrails.liveDispatchEnabled ? "enabled" : "disabled"}</Badge></p>
          <p><Badge>Live payments {control.guardrails.livePaymentsEnabled ? "enabled" : "disabled"}</Badge></p>
          <p><Badge>Provider login {control.guardrails.providerLoginEnabled ? "enabled" : "disabled"}</Badge></p>
          <p><Badge>Medical booking {control.guardrails.medicalBookingEnabled ? "enabled" : "disabled"}</Badge></p>
        </article>
      </section>

      <section className="card">
        <h2>Record Go/No-Go decision</h2>
        <form onSubmit={(event) => void recordDecision(event)}>
          <label>Decision status
            <select value={decisionStatus} onChange={(event) => setDecisionStatus(event.target.value as SmeServicesPilotDecisionStatus)}>
              {options.map((option) => <option key={option} value={option}>{decisionLabels[option]}</option>)}
            </select>
          </label>
          {goBlocked ? <p className="error">Go for internal pilot requires the readiness checklist status to be READY_FOR_INTERNAL_PILOT. Record Conditional go, No-go, or Deferred until required items are complete.</p> : null}
          <label>Decision title<input value={decisionTitle} onChange={(event) => setDecisionTitle(event.target.value)} placeholder="Example: Conditional approval for controlled internal pilot" /></label>
          <label>Decision summary<textarea value={decisionSummary} onChange={(event) => setDecisionSummary(event.target.value)} placeholder="Summarise the management decision. Do not enter credentials, OTPs, payment secrets, provider private contact details or medical details." /></label>
          <label>Conditions<textarea value={conditions} onChange={(event) => setConditions(event.target.value)} placeholder="Optional conditions before pilot invitations begin." /></label>
          <label>Blockers<textarea value={blockers} onChange={(event) => setBlockers(event.target.value)} placeholder="Optional blockers or reasons for no-go/defer." /></label>
          <button disabled={saving || goBlocked}>{saving ? "Recording..." : "Record decision"}</button>
        </form>
      </section>

      <section className="card">
        <h2>Decision history</h2>
        {control.history.length ? control.history.map((decision) => <article className="item" key={decision.id}>
          <span><strong>{decisionLabels[decision.decisionStatus]}</strong> - {decision.decisionTitle ?? "Untitled decision"}</span>
          <span className="muted">Recorded {date(decision.recordedAt)}. Snapshot: {decision.requiredCompletedSnapshot}/{decision.requiredTotalSnapshot} required items complete, {decision.approvedProvidersSnapshot} approved providers, {decision.activeRequestsSnapshot} active requests.</span>
        </article>) : <Empty>No Go/No-Go decision history yet.</Empty>}
      </section>
    </> : null}
  </PortalShell>;
}
