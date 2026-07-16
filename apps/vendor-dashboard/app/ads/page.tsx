"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { adsApi, VendorAdsResponse } from "../../src/api/ads.api";
import { DashboardShell, Empty, ErrorMessage, StatusBadge } from "../../src/components/dashboard";
import { friendlyError } from "../../src/lib/errors";

const emptyForm = {
  title: "",
  body: "",
  imageUrl: "",
  ctaLabel: "",
  ctaUrl: "",
  requestedBudgetKobo: "0"
};

function money(value: number) {
  return new Intl.NumberFormat("en-NG", { currency: "NGN", style: "currency", maximumFractionDigits: 0 }).format(value / 100);
}

export default function VendorAdsPage() {
  const [data, setData] = useState<VendorAdsResponse | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await adsApi.dashboard());
    } catch (err) {
      setError(friendlyError(err, "dashboard"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const summary = useMemo(() => ({
    total: data?.campaigns.length ?? 0,
    active: data?.campaigns.filter((campaign) => campaign.status === "ACTIVE").length ?? 0,
    submitted: data?.campaigns.filter((campaign) => ["SUBMITTED", "UNDER_REVIEW"].includes(campaign.status)).length ?? 0
  }), [data]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await adsApi.create({
        title: form.title,
        body: form.body,
        imageUrl: form.imageUrl || undefined,
        ctaLabel: form.ctaLabel || undefined,
        ctaUrl: form.ctaUrl || undefined,
        requestedBudgetKobo: Number(form.requestedBudgetKobo || 0)
      });
      setForm(emptyForm);
      setMessage("Ad request submitted for KariGO Admin review.");
      await load();
    } catch (err) {
      setError(friendlyError(err, "form"));
    } finally {
      setSaving(false);
    }
  }

  return <DashboardShell>
    <header className="topbar">
      <div>
        <p className="muted">Vendor growth</p>
        <h1>Ads</h1>
        <p className="muted">Request labelled homepage ad placements. KariGO Admin approval is required and live ad billing remains disabled.</p>
      </div>
      <button className="secondary" onClick={() => void load()}>Refresh</button>
    </header>
    <section className="grid">
      <div className="card"><p className="muted">Available ad credit</p><p className="metric">{money(data?.creditAccount.availableKobo ?? 0)}</p></div>
      <div className="card"><p className="muted">Reserved credit</p><p className="metric">{money(data?.creditAccount.reservedKobo ?? 0)}</p></div>
      <div className="card"><p className="muted">Campaigns</p><p className="metric">{summary.total}</p></div>
    </section>
    <ErrorMessage>{error}</ErrorMessage>
    {message ? <p className="success">{message}</p> : null}
    {data?.guardrails ? <p className="notice">{data.guardrails.note}</p> : null}
    <section className="product-layout">
      <form className="card product-form" onSubmit={(event) => void submit(event)}>
        <h2>Request ad placement</h2>
        <input placeholder="Campaign title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
        <textarea placeholder="Short ad message" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} required />
        <input placeholder="Image URL, optional" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} />
        <input placeholder="CTA label, optional" value={form.ctaLabel} onChange={(event) => setForm({ ...form, ctaLabel: event.target.value })} />
        <input placeholder="CTA URL, optional" value={form.ctaUrl} onChange={(event) => setForm({ ...form, ctaUrl: event.target.value })} />
        <input placeholder="Requested ad credit budget in kobo" type="number" min="0" value={form.requestedBudgetKobo} onChange={(event) => setForm({ ...form, requestedBudgetKobo: event.target.value })} />
        <p className="muted">Submitting this form does not charge your wallet or collect real money. KariGO Admin reviews every campaign before it can appear in the Customer App.</p>
        <button disabled={saving}>{saving ? "Submitting..." : "Submit ad request"}</button>
      </form>
      <section className="section">
        {loading ? <div className="loading"><span className="spinner" />Loading ad campaigns...</div> : data?.campaigns.length ? data.campaigns.map((campaign) => <article className="card" key={campaign.id}>
          <StatusBadge>{campaign.status}</StatusBadge>
          <h3>{campaign.title}</h3>
          <p>{campaign.body}</p>
          <p className="muted">{campaign.campaignReference} - Requested {money(campaign.requestedBudgetKobo)} - Reserved {money(campaign.reservedCreditKobo)}</p>
          {campaign.adminNote ? <p className="notice">{campaign.adminNote}</p> : null}
          {campaign.rejectionReason ? <p className="error">{campaign.rejectionReason}</p> : null}
        </article>) : <Empty>No ad campaign requests yet. Submit your first campaign for review.</Empty>}
      </section>
    </section>
  </DashboardShell>;
}
