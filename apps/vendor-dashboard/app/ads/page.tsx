"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdPerformanceRange, adsApi, VendorAdCampaign, VendorAdsResponse } from "../../src/api/ads.api";
import { DashboardShell, Empty, ErrorMessage, StatusBadge } from "../../src/components/dashboard";
import { friendlyError } from "../../src/lib/errors";

const emptyForm = { title: "", body: "", ctaLabel: "", ctaUrl: "", creativeAltText: "", requestedBudgetKobo: "", dailyBudgetKobo: "", startsAt: "", endsAt: "", cityCodes: "", serviceCategories: "" };
type View = "Overview" | "Campaigns" | "Create campaign" | "Drafts" | "Under review" | "Active" | "Completed" | "Performance" | "Ad credit";
function money(value: number) { return new Intl.NumberFormat("en-NG", { currency: "NGN", style: "currency", maximumFractionDigits: 0 }).format(value / 100); }
function date(value?: string | null) { return value ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(value)) : "Not set"; }

export default function VendorAdsPage() {
  const [data, setData] = useState<VendorAdsResponse | null>(null);
  const [view, setView] = useState<View>("Overview");
  const [form, setForm] = useState(emptyForm);
  const [creative, setCreative] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [range, setRange] = useState<AdPerformanceRange>("DAYS_7");

  async function load(nextRange: AdPerformanceRange = range) { setLoading(true); setError(""); try { setData(await adsApi.dashboard(nextRange)); } catch (err) { setError(friendlyError(err, "dashboard")); } finally { setLoading(false); } }
  useEffect(() => { void load(range); }, [range]);
  useEffect(() => { if (!creative) { setPreview(""); return; } const url = URL.createObjectURL(creative); setPreview(url); return () => URL.revokeObjectURL(url); }, [creative]);
  const campaigns = useMemo(() => {
    const viewStatuses: Partial<Record<View, string[]>> = {
      Drafts: ["DRAFT", "CHANGES_REQUESTED"],
      "Under review": ["SUBMITTED", "UNDER_REVIEW"],
      Active: ["APPROVED", "SCHEDULED", "ACTIVE", "PAUSED"],
      Completed: ["COMPLETED", "EXPIRED", "REJECTED", "CANCELLED"]
    };
    return data?.campaigns.filter((campaign) => (statusFilter === "ALL" || campaign.status === statusFilter) && (!viewStatuses[view] || viewStatuses[view]?.includes(campaign.status))) ?? [];
  }, [data, statusFilter, view]);
  const maxChartValue = Math.max(1, ...(data?.performance.buckets ?? []).map((item) => Math.max(item.impressions, item.clicks)));
  const totals = useMemo(() => (data?.campaigns ?? []).reduce((sum, item) => ({ impressions: sum.impressions + item.analytics.impressions, clicks: sum.clicks + item.analytics.clicks, spend: sum.spend + item.analytics.spendKobo }), { impressions: 0, clicks: 0, spend: 0 }), [data]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage(""); setError("");
    try {
      const campaign = await adsApi.create({ title: form.title, body: form.body, ctaLabel: form.ctaLabel || undefined, ctaUrl: form.ctaUrl || undefined, creativeAltText: form.creativeAltText || undefined, requestedBudgetKobo: Number(form.requestedBudgetKobo), dailyBudgetKobo: form.dailyBudgetKobo ? Number(form.dailyBudgetKobo) : undefined, startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined, endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined, targeting: { cityCodes: form.cityCodes.split(",").map((item) => item.trim()).filter(Boolean), serviceCategories: form.serviceCategories.split(",").map((item) => item.trim()).filter(Boolean) } });
      if (creative) await adsApi.uploadCreative(campaign.id, creative);
      setForm(emptyForm); setCreative(null); setMessage("Draft saved. Preview it, then submit it for KariGO review when ready."); setView("Campaigns"); await load();
    } catch (err) { setError(friendlyError(err, "form")); } finally { setSaving(false); }
  }

  async function action(campaign: VendorAdCampaign, status: "SUBMITTED" | "PAUSED" | "ACTIVE" | "CANCELLED") {
    setError(""); setMessage("");
    try { await adsApi.action(campaign.id, status); setMessage(`${campaign.campaignReference} moved to ${status.replaceAll("_", " ")}.`); await load(); }
    catch (err) { setError(friendlyError(err, "form")); }
  }

  async function editCampaign(campaign: VendorAdCampaign) {
    const title = window.prompt("Campaign title", campaign.title)?.trim();
    if (!title) return;
    const body = window.prompt("Campaign message", campaign.body)?.trim();
    if (!body) return;
    const changeReason = window.prompt("What changed?")?.trim();
    if (!changeReason) return;
    setError(""); setMessage("");
    try {
      await adsApi.update(campaign.id, { title, body, changeReason });
      setMessage(`${campaign.campaignReference} saved as a new audited revision.`);
      await load();
    } catch (err) { setError(friendlyError(err, "form")); }
  }

  return <DashboardShell>
    <header className="topbar"><div><p className="muted">Vendor growth</p><h1>Ads Manager</h1><p className="muted">Create, review and measure clearly labelled first-party KariGO campaigns.</p></div><button className="secondary" onClick={() => void load()}>Refresh</button></header>
    <nav className="top-actions" aria-label="Ads Manager sections">{(["Overview", "Campaigns", "Create campaign", "Drafts", "Under review", "Active", "Completed", "Performance", "Ad credit"] as View[]).map((item) => <button className={view === item ? "" : "secondary"} key={item} onClick={() => setView(item)}>{item}</button>)}</nav>
    <ErrorMessage>{error}</ErrorMessage>{message ? <p className="success">{message}</p> : null}{data?.guardrails ? <p className="notice">KariGO Admin approval is required before delivery. This controlled pilot does not charge your wallet or collect real money. {data.guardrails.note}</p> : null}
    {view === "Overview" ? <><section className="grid"><div className="card"><p className="muted">Available ad credit</p><p className="metric">{money(data?.creditAccount.availableKobo ?? 0)}</p></div><div className="card"><p className="muted">Active campaigns</p><p className="metric">{data?.campaigns.filter((item) => item.status === "ACTIVE").length ?? 0}</p></div><div className="card"><p className="muted">Impressions</p><p className="metric">{totals.impressions.toLocaleString()}</p></div><div className="card"><p className="muted">Clicks</p><p className="metric">{totals.clicks.toLocaleString()}</p></div></section><section className="card section"><h2>Recent performance</h2><p>Spend {money(totals.spend)} · CTR {totals.impressions ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : "0.00"}%</p><p className="muted">Reach is intentionally omitted because KariGO does not use a cross-site advertising identifier.</p></section></> : null}
    {view === "Performance" ? <section className="card section"><div className="top-actions"><div><h2>Performance</h2><p className="muted">Daily reporting in {data?.performance.timezone ?? "Africa/Lagos"}.</p></div><div className="top-actions" role="group" aria-label="Performance date range">{([["TODAY","Today"],["DAYS_7","7 days"],["DAYS_30","30 days"],["LIFETIME","Campaign lifetime"]] as const).map(([value,label]) => <button key={value} className={range === value ? "" : "secondary"} aria-pressed={range === value} onClick={() => setRange(value)}>{label}</button>)}</div></div>{data?.performance.buckets.length ? <div role="img" aria-label={`Daily ad performance for ${range.toLowerCase().replaceAll("_"," ")}`} style={{ display: "grid", gridTemplateColumns: `repeat(${data.performance.buckets.length}, minmax(18px, 1fr))`, gap: 6, alignItems: "end", minHeight: 220, overflowX: "auto" }}>{data.performance.buckets.map((bucket) => <div key={bucket.date} title={`${bucket.date}: ${bucket.impressions} impressions, ${bucket.clicks} clicks, ${bucket.ctr}% CTR`} style={{ minWidth: 18, display: "grid", gap: 3, alignItems: "end" }}><div style={{ height: Math.max(2, bucket.impressions / maxChartValue * 150), background: "#3157c8", borderRadius: 4 }} /><div style={{ height: Math.max(2, bucket.clicks / maxChartValue * 150), background: "#19a974", borderRadius: 4 }} /><small className="muted">{bucket.date.slice(5)}</small></div>)}</div> : <Empty>No ad activity exists in this range.</Empty>}{data?.campaigns.map((campaign) => <details key={campaign.id} className="card"><summary><strong>{campaign.title}</strong> · {campaign.analytics.impressions.toLocaleString()} impressions · {campaign.analytics.clicks.toLocaleString()} clicks · {campaign.analytics.ctr}% CTR</summary><div className="table" role="region" aria-label={`${campaign.title} daily performance`} tabIndex={0}><table><thead><tr><th>Date</th><th>Impressions</th><th>Clicks</th><th>CTR</th><th>Spend</th></tr></thead><tbody>{campaign.performance?.buckets.map((bucket) => <tr key={bucket.date}><td>{bucket.date}</td><td>{bucket.impressions}</td><td>{bucket.clicks}</td><td>{bucket.ctr}%</td><td>{money(bucket.spendKobo)}</td></tr>)}</tbody></table></div></details>)}<p className="muted">Blue: impressions · Green: clicks. {data?.performance.spendPolicy}</p></section> : null}
    {view === "Create campaign" ? <form className="card product-form" onSubmit={(event) => void submit(event)}><h2>Create campaign draft</h2><label>Campaign title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} required /></label><label>Message<textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} maxLength={280} required /></label><label>Upload creative image<input type="file" accept="image/jpeg,image/png" onChange={(e) => setCreative(e.target.files?.[0] ?? null)} /></label><p className="muted">JPEG or PNG, up to 5 MB, at least 600×300, landscape ratio 1.2:1–2.2:1. Metadata is stripped where supported.</p>{preview ? <img className="cover-preview" src={preview} alt="Creative preview" /> : null}<label>Creative description<input value={form.creativeAltText} onChange={(e) => setForm({ ...form, creativeAltText: e.target.value })} maxLength={180} /></label><div className="form-grid"><label>CTA label<select value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}><option value="">Informational — no CTA</option>{["Shop now","Learn more","Order now","Visit store","Book now","Get started"].map((item) => <option key={item}>{item}</option>)}</select></label><label>HTTPS destination<input type="url" placeholder="https://" value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} /></label></div><div className="form-grid"><label>Total budget (kobo)<input type="number" min="1" value={form.requestedBudgetKobo} onChange={(e) => setForm({ ...form, requestedBudgetKobo: e.target.value })} required /></label><label>Daily budget (kobo, optional)<input type="number" min="1" value={form.dailyBudgetKobo} onChange={(e) => setForm({ ...form, dailyBudgetKobo: e.target.value })} /></label><label>Start<input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></label><label>End<input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></label></div><div className="form-grid"><label>City/service areas<input placeholder="Kano, Abuja" value={form.cityCodes} onChange={(e) => setForm({ ...form, cityCodes: e.target.value })} /></label><label>KariGO categories<input placeholder="FOOD, GROCERY" value={form.serviceCategories} onChange={(e) => setForm({ ...form, serviceCategories: e.target.value })} /></label></div><p className="muted">This saves a draft and does not charge a card. Controlled ad credit is reserved only after review.</p><button disabled={saving}>{saving ? "Saving..." : "Save draft"}</button></form> : null}
    {["Campaigns", "Drafts", "Under review", "Active", "Completed"].includes(view) ? <section className="section"><div className="top-actions"><h2>{view}</h2><label>Status <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option>ALL</option>{["DRAFT","SUBMITTED","UNDER_REVIEW","CHANGES_REQUESTED","APPROVED","SCHEDULED","ACTIVE","PAUSED","COMPLETED","EXPIRED","REJECTED","CANCELLED"].map((item) => <option key={item}>{item}</option>)}</select></label></div>{loading ? <div className="loading"><span className="spinner" />Loading campaigns...</div> : campaigns.length ? campaigns.map((campaign) => <article className="card" key={campaign.id}><div className="top-actions"><span><StatusBadge>{campaign.status}</StatusBadge> Revision {campaign.currentRevisionNumber}</span><span>{date(campaign.startsAt)} – {date(campaign.endsAt)}</span></div><h3>{campaign.title}</h3><p>{campaign.body}</p><div className="grid"><p><strong>{campaign.analytics.impressions.toLocaleString()}</strong><br /><span className="muted">Impressions</span></p><p><strong>{campaign.analytics.clicks.toLocaleString()}</strong><br /><span className="muted">Clicks</span></p><p><strong>{campaign.analytics.ctr}%</strong><br /><span className="muted">CTR</span></p><p><strong>{money(campaign.remainingBudgetKobo)}</strong><br /><span className="muted">Remaining</span></p></div><p className="muted">{campaign.campaignReference} · Total {money(campaign.requestedBudgetKobo)} · Daily {campaign.dailyBudgetKobo ? money(campaign.dailyBudgetKobo) : "Not set"} · Reserved {money(campaign.reservedCreditKobo)}</p><div className="top-actions">{!["COMPLETED","EXPIRED","REJECTED","CANCELLED"].includes(campaign.status) ? <button className="secondary" onClick={() => void editCampaign(campaign)}>Edit / new revision</button> : null}{["DRAFT","CHANGES_REQUESTED"].includes(campaign.status) ? <button onClick={() => void action(campaign, "SUBMITTED")}>Submit for review</button> : null}{campaign.pendingRevisionStatus && ["DRAFT","CHANGES_REQUESTED"].includes(campaign.pendingRevisionStatus) ? <button onClick={() => void action(campaign, "SUBMITTED")}>Submit replacement for review</button> : null}{campaign.status === "ACTIVE" ? <button className="secondary" onClick={() => void action(campaign, "PAUSED")}>Pause</button> : null}{campaign.status === "PAUSED" ? <button onClick={() => void action(campaign, "ACTIVE")}>Resume</button> : null}{["DRAFT","SUBMITTED","CHANGES_REQUESTED"].includes(campaign.status) ? <button className="secondary" onClick={() => void action(campaign, "CANCELLED")}>Cancel</button> : null}</div>{campaign.adminNote ? <p className="notice">{campaign.adminNote}</p> : null}{campaign.rejectionReason ? <p className="error">{campaign.rejectionReason}</p> : null}</article>) : <Empty>No campaigns match this view.</Empty>}</section> : null}
    {view === "Ad credit" ? <section className="card section"><h2>Ad credit summary</h2><p>Available {money(data?.creditAccount.availableKobo ?? 0)}</p><p>Reserved {money(data?.creditAccount.reservedKobo ?? 0)}</p><p>Lifetime granted {money(data?.creditAccount.lifetimeGrantedKobo ?? 0)}</p><p>Lifetime spent {money(data?.creditAccount.lifetimeSpentKobo ?? 0)}</p><p className="notice">Ad credit is a controlled internal balance. No card charging or wallet top-up is enabled.</p></section> : null}
  </DashboardShell>;
}
