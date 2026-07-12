"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SmeServicesOperationsSummary, smeServicesApi } from "../../../src/api/sme-services.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../../src/components/portal";
import { friendlyError } from "../../../src/lib/errors";

function date(value: string) {
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function Guardrail({ label, enabled }: { label: string; enabled: boolean }) {
  return <article className="card">
    <span className="muted">{label}</span>
    <p><Badge>{enabled ? "Enabled" : "Disabled"}</Badge></p>
  </article>;
}

export default function SmeServicesSummaryPage() {
  const [summary, setSummary] = useState<SmeServicesOperationsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setSummary(await smeServicesApi.summary());
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  async function downloadPilotReport() {
    setExporting(true);
    setError("");
    setMessage("");
    try {
      const report = await smeServicesApi.report();
      const blob = new Blob([report.markdown], { type: report.mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = report.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage("SME Services pilot report generated.");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return <PortalShell>
    <h1>SME Services operations summary</h1>
    <p className="muted">Internal pilot dashboard for request review, provider application review and provider directory activity. This page does not activate live dispatch, payment collection, provider payouts, provider login or medical booking.</p>
    <div className="top-actions">
      <Link className="button-link" href="/sme-services">Customer requests</Link>
      <Link className="button-link secondary" href="/sme-services/applications">Provider applications</Link>
      <Link className="button-link secondary" href="/sme-services/providers">Provider directory</Link>
      <button className="secondary" onClick={() => void load()}>Refresh</button>
      <button onClick={() => void downloadPilotReport()} disabled={exporting}>{exporting ? "Generating..." : "Download pilot report"}</button>
    </div>
    <p className="success">{message}</p>
    <ErrorMessage>{error}</ErrorMessage>
    {loading ? <Loading /> : summary ? <>
      <section className="section">
        <h2>Customer requests</h2>
        <div className="grid">
          <article className="card"><span className="muted">Total requests</span><p className="metric">{summary.requests.total}</p></article>
          <article className="card"><span className="muted">Active requests</span><p className="metric">{summary.requests.active}</p></article>
          <article className="card"><span className="muted">Matching / assigned</span><p className="metric">{summary.requests.providerMatching + summary.requests.providerAssigned}</p></article>
          <article className="card"><span className="muted">Completed / cancelled</span><p className="metric">{summary.requests.completed + summary.requests.cancelled}</p></article>
        </div>
      </section>

      <section className="section">
        <h2>Provider applications</h2>
        <div className="grid">
          <article className="card"><span className="muted">Applications</span><p className="metric">{summary.providerApplications.total}</p></article>
          <article className="card"><span className="muted">Pending review</span><p className="metric">{summary.providerApplications.pending}</p></article>
          <article className="card"><span className="muted">Approved / converted</span><p className="metric">{summary.providerApplications.approved + summary.providerApplications.convertedToProvider}</p></article>
          <article className="card"><span className="muted">Health readiness</span><p className="metric">{summary.providerApplications.healthProfessionalReadiness}</p></article>
        </div>
      </section>

      <section className="section">
        <h2>Provider directory</h2>
        <div className="grid">
          <article className="card"><span className="muted">Providers</span><p className="metric">{summary.providers.total}</p></article>
          <article className="card"><span className="muted">Approved</span><p className="metric">{summary.providers.approved}</p></article>
          <article className="card"><span className="muted">Pending review</span><p className="metric">{summary.providers.pendingReview}</p></article>
          <article className="card"><span className="muted">Readiness-only</span><p className="metric">{summary.providers.readinessOnly}</p></article>
        </div>
      </section>

      <section className="section">
        <h2>Operational guardrails</h2>
        <p className="muted">{summary.guardrails.note}</p>
        <div className="grid">
          <Guardrail label="Live dispatch" enabled={summary.guardrails.liveDispatchEnabled} />
          <Guardrail label="Live payments" enabled={summary.guardrails.livePaymentsEnabled} />
          <Guardrail label="Provider login" enabled={summary.guardrails.providerLoginEnabled} />
          <Guardrail label="Provider payout" enabled={summary.guardrails.providerPayoutEnabled} />
        </div>
      </section>

      <section className="detail-grid">
        <article className="card">
          <h2>Recent customer requests</h2>
          {summary.recent.requests.length ? summary.recent.requests.map((request) => <Link className="item" href={`/sme-services/${request.id}`} key={request.id}>
            <span><strong>{request.reference}</strong> - {request.title}</span>
            <span><Badge>{request.status}</Badge> {request.readinessOnly ? <Badge>Readiness Only</Badge> : null}</span>
            <span className="muted">{request.customerName} - Updated {date(request.updatedAt)}</span>
          </Link>) : <Empty>No recent SME Services requests.</Empty>}
        </article>

        <article className="card">
          <h2>Recent provider applications</h2>
          {summary.recent.applications.length ? summary.recent.applications.map((application) => <Link className="item" href={`/sme-services/applications/${application.id}`} key={application.id}>
            <span><strong>{application.reference}</strong> - {application.title}</span>
            <span><Badge>{application.status}</Badge> {application.serviceType === "HEALTH_PROFESSIONAL" ? <Badge>Readiness Only</Badge> : null}</span>
            <span className="muted">Submitted {date(application.submittedAt)}</span>
          </Link>) : <Empty>No recent SME provider applications.</Empty>}
        </article>

        <article className="card">
          <h2>Recent provider records</h2>
          {summary.recent.providers.length ? summary.recent.providers.map((provider) => <Link className="item" href={`/sme-services/providers/${provider.id}`} key={provider.id}>
            <span><strong>{provider.reference}</strong> - {provider.title}</span>
            <span><Badge>{provider.status}</Badge> {provider.readinessOnly ? <Badge>Readiness Only</Badge> : null}</span>
            <span className="muted">{provider.city}, {provider.state} - Updated {date(provider.updatedAt)}</span>
          </Link>) : <Empty>No recent SME provider records.</Empty>}
        </article>
      </section>
    </> : null}
  </PortalShell>;
}
