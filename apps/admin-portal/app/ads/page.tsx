"use client";

import { useCallback, useEffect, useState } from "react";
import { AdCampaignStatus, AdPerformanceRange, AdSponsorType, adsApi, AdminAdCampaign, AdminAdRevisionPresentation, AdminAdsResponse } from "../../src/api/ads.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../src/components/portal";
import { friendlyError } from "../../src/lib/errors";
import { creativePreviewSrc } from "../../src/lib/ad-creative-path";

const actions: Partial<Record<AdCampaignStatus, AdCampaignStatus[]>> = {
  DRAFT: ["SUBMITTED", "CANCELLED"], SUBMITTED: ["UNDER_REVIEW", "CANCELLED"], UNDER_REVIEW: ["CHANGES_REQUESTED", "APPROVED", "REJECTED"],
  CHANGES_REQUESTED: ["SUBMITTED", "CANCELLED"], APPROVED: ["SCHEDULED", "ACTIVE", "CANCELLED"], SCHEDULED: ["ACTIVE", "PAUSED", "EXPIRED", "CANCELLED"],
  ACTIVE: ["PAUSED", "COMPLETED", "EXPIRED", "CANCELLED"], PAUSED: ["ACTIVE", "COMPLETED", "EXPIRED", "CANCELLED"]
};
const sponsorTypes: AdSponsorType[] = ["EXTERNAL", "VENDOR"];
const ranges: Array<{ value: AdPerformanceRange; label: string }> = [
  { value: "TODAY", label: "Today" }, { value: "DAYS_7", label: "7 days" }, { value: "DAYS_30", label: "30 days" }, { value: "LIFETIME", label: "Lifetime" }
];

function availableActions(campaign: AdminAdCampaign) {
  if (campaign.pendingRevisionStatus === "DRAFT" || campaign.pendingRevisionStatus === "CHANGES_REQUESTED") return ["SUBMITTED" as AdCampaignStatus];
  if (campaign.pendingRevisionStatus === "SUBMITTED") return ["UNDER_REVIEW" as AdCampaignStatus];
  if (campaign.pendingRevisionStatus === "UNDER_REVIEW") return ["CHANGES_REQUESTED", "APPROVED", "REJECTED"] as AdCampaignStatus[];
  return actions[campaign.status] ?? [];
}

const emptyForm = { sponsorType: "EXTERNAL" as AdSponsorType, vendorId: "", advertiserName: "", advertiserContactName: "", advertiserEmail: "", advertiserPhone: "", title: "", body: "", ctaLabel: "", ctaUrl: "", requestedBudgetKobo: "0" };
const money = (value: number) => new Intl.NumberFormat("en-NG", { currency: "NGN", style: "currency", maximumFractionDigits: 0 }).format(value / 100);
const date = (value?: string | null) => value ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not set";
const destination = (value?: string | null) => { try { return value ? new URL(value).hostname : "Not set"; } catch { return "Invalid destination"; } };
const duration = (start?: string | null, end?: string | null) => {
  if (!start || !end) return "Open-ended";
  const days = Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000));
  return `${days} day${days === 1 ? "" : "s"}`;
};

function ReviewSurface({ campaign }: { campaign: AdminAdCampaign }) {
  const revision: AdminAdRevisionPresentation | null | undefined = campaign.reviewRevision ?? campaign.approvedRevision;
  const buckets = campaign.performance?.buckets ?? [];
  const max = Math.max(1, ...buckets.map((item) => Math.max(item.impressions, item.clicks)));
  return <div className="ad-review-grid">
    <section className="ad-panel creative-panel" aria-label="Creative preview">
      <h4>Creative preview</h4>
      {creativePreviewSrc(revision?.imageUrl) ? <div className="creative-frame"><img src={creativePreviewSrc(revision?.imageUrl)} alt={revision?.creativeAltText || `${revision?.title || campaign.title} advertising creative`} /></div> : <div className="creative-empty">No creative is attached to this revision.</div>}
      <div className="creative-copy"><strong>{revision?.title ?? campaign.title}</strong><p>{revision?.body ?? campaign.body}</p></div>
      <dl className="detail-list"><div><dt>CTA</dt><dd>{revision?.ctaLabel || "Not set"}</dd></div><div><dt>Destination</dt><dd>{destination(revision?.ctaUrl)}</dd></div><div><dt>Placement</dt><dd>{(revision?.placementSurface || "Not set").replaceAll("_", " ")}</dd></div></dl>
    </section>
    <section className="ad-panel" aria-label="Campaign schedule">
      <h4>Schedule and budget</h4>
      <dl className="detail-list"><div><dt>Starts</dt><dd>{revision?.startsAt ? date(revision.startsAt) : "Starts when activated"}</dd></div><div><dt>Ends</dt><dd>{revision?.endsAt ? date(revision.endsAt) : "No fixed end"}</dd></div><div><dt>Duration</dt><dd>{duration(revision?.startsAt, revision?.endsAt)}</dd></div><div><dt>Daily budget</dt><dd>{revision?.dailyBudgetKobo ? money(revision.dailyBudgetKobo) : "No daily cap"}</dd></div><div><dt>Requested</dt><dd>{money(revision?.requestedBudgetKobo ?? campaign.requestedBudgetKobo)}</dd></div><div><dt>Reserved</dt><dd>{money(campaign.reservedCreditKobo)}</dd></div></dl>
      <h4>Targeting</h4><p className="muted">Cities: {revision?.targeting?.cityCodes?.join(", ") || "All eligible cities"}</p><p className="muted">Services: {revision?.targeting?.serviceCategories?.join(", ") || "All eligible services"}</p>
    </section>
    <section className="ad-panel performance-panel" aria-label="Campaign performance">
      <h4>Performance · {campaign.performance?.range.replaceAll("_", " ") || "selected range"}</h4>
      <div className="ad-metrics"><div><span>Impressions</span><strong>{campaign.analytics.impressions.toLocaleString()}</strong></div><div><span>Clicks</span><strong>{campaign.analytics.clicks.toLocaleString()}</strong></div><div><span>CTR</span><strong>{campaign.analytics.ctr.toFixed(2)}%</strong></div><div><span>Spend</span><strong>{money(campaign.analytics.spendKobo)}</strong></div><div><span>Remaining</span><strong>{money(campaign.remainingBudgetKobo)}</strong></div></div>
      {buckets.length ? <div className="ad-chart" role="img" aria-label="Impressions and clicks over the selected reporting range">{buckets.map((item) => <div className="ad-chart-column" key={item.date} title={`${item.date}: ${item.impressions} impressions, ${item.clicks} clicks`}><div className="ad-chart-bars"><i style={{ height: `${Math.max(2, item.impressions / max * 100)}%` }} /><i className="clicks" style={{ height: `${Math.max(2, item.clicks / max * 100)}%` }} /></div><small>{item.date.slice(5)}</small></div>)}</div> : <p className="muted">No delivery events in this range.</p>}
    </section>
  </div>;
}

export default function AdminAdsPage() {
  const [data, setData] = useState<AdminAdsResponse | null>(null);
  const [range, setRange] = useState<AdPerformanceRange>("DAYS_7");
  const [form, setForm] = useState(emptyForm);
  const [creditVendorId, setCreditVendorId] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDescription, setCreditDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => { setLoading(true); setError(""); try { setData(await adsApi.list(range)); } catch (e) { setError(friendlyError(e, "dashboard")); } finally { setLoading(false); } }, [range]);
  useEffect(() => { void load(); }, [load]);

  async function createAd() { setSaving(true); setMessage(""); setError(""); try { await adsApi.create({ sponsorType: form.sponsorType, vendorId: form.sponsorType === "VENDOR" ? form.vendorId || undefined : undefined, advertiserName: form.sponsorType === "EXTERNAL" ? form.advertiserName : undefined, advertiserContactName: form.advertiserContactName || undefined, advertiserEmail: form.advertiserEmail || undefined, advertiserPhone: form.advertiserPhone || undefined, title: form.title, body: form.body, ctaLabel: form.ctaLabel || undefined, ctaUrl: form.ctaUrl || undefined, requestedBudgetKobo: Number(form.requestedBudgetKobo || 0) }); setForm(emptyForm); setMessage("Ad campaign has been created for admin review."); await load(); } catch (e) { setError(friendlyError(e, "form")); } finally { setSaving(false); } }
  async function updateAd(campaign: AdminAdCampaign, status: AdCampaignStatus) { setMessage(""); setError(""); try { const reason = ["CHANGES_REQUESTED", "REJECTED"].includes(status) ? window.prompt("Required review reason")?.trim() : undefined; if (["CHANGES_REQUESTED", "REJECTED"].includes(status) && !reason) return; await adsApi.action(campaign.id, status, reason); setMessage(`${campaign.campaignReference} updated.`); await load(); } catch (e) { setError(friendlyError(e, "form")); } }
  async function editCampaign(campaign: AdminAdCampaign) { const title = window.prompt("Campaign title", campaign.reviewRevision?.title ?? campaign.title)?.trim(); if (!title) return; const body = window.prompt("Campaign message", campaign.reviewRevision?.body ?? campaign.body)?.trim(); if (!body) return; const changeReason = window.prompt("Audit note for this admin edit")?.trim(); if (!changeReason) return; setMessage(""); setError(""); try { await adsApi.update(campaign.id, { title, body, changeReason }); setMessage(`${campaign.campaignReference} edited by KariGO Admin with an audit note.`); await load(); } catch (e) { setError(friendlyError(e, "form")); } }
  async function grantCredit() { if (!creditVendorId.trim() || !creditAmount.trim()) { setError("Enter a vendor ID and controlled ad credit amount."); return; } setMessage(""); setError(""); try { await adsApi.grantVendorCredit(creditVendorId.trim(), { amountKobo: Number(creditAmount), description: creditDescription || undefined }); setCreditAmount(""); setCreditDescription(""); setMessage("Controlled vendor ad credit has been granted."); } catch (e) { setError(friendlyError(e, "form")); } }

  return <PortalShell><h1>Ads</h1><p className="muted">Review campaign creative, destination, schedule, targeting, budget and delivery before using governed actions. Automatic ad billing remains disabled; wallet top-up is controlled separately through payment readiness controls.</p><ErrorMessage>{error}</ErrorMessage>{message ? <p className="success">{message}</p> : null}
    <div className="grid"><article className="card"><span className="muted">Total campaigns</span><p className="metric">{data?.summary.total ?? 0}</p></article><article className="card"><span className="muted">Submitted / review</span><p className="metric">{(data?.summary.submitted ?? 0) + (data?.summary.underReview ?? 0)}</p></article><article className="card"><span className="muted">Approved / active</span><p className="metric">{(data?.summary.approved ?? 0) + (data?.summary.active ?? 0)}</p></article><article className="card"><span className="muted">Rejected</span><p className="metric">{data?.summary.rejected ?? 0}</p></article></div>
    <section className="card section"><h2>Create ad campaign</h2><p className="muted">Create campaign copy here. Durable creative images use the validated campaign upload workflow; arbitrary image URLs are not accepted.</p><div className="form-grid"><label>Sponsor type<select value={form.sponsorType} onChange={(e) => setForm({ ...form, sponsorType: e.target.value as AdSponsorType })}>{sponsorTypes.map((item) => <option key={item}>{item}</option>)}</select></label>{form.sponsorType === "VENDOR" ? <label>Vendor ID<input value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })} /></label> : <label>Advertiser name<input value={form.advertiserName} onChange={(e) => setForm({ ...form, advertiserName: e.target.value })} /></label>}<label>Contact name<input value={form.advertiserContactName} onChange={(e) => setForm({ ...form, advertiserContactName: e.target.value })} /></label><label>Contact email<input value={form.advertiserEmail} onChange={(e) => setForm({ ...form, advertiserEmail: e.target.value })} /></label><label>Contact phone<input value={form.advertiserPhone} onChange={(e) => setForm({ ...form, advertiserPhone: e.target.value })} /></label><label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label>CTA label<input value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} /></label><label>CTA URL<input value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} /></label><label>Requested budget (kobo)<input type="number" min="0" value={form.requestedBudgetKobo} onChange={(e) => setForm({ ...form, requestedBudgetKobo: e.target.value })} /></label></div><label>Body<textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label><button disabled={saving} onClick={() => void createAd()}>{saving ? "Saving..." : "Create campaign"}</button></section>
    <section className="card section"><h2>Grant controlled vendor ad credit</h2><p className="muted">Internal pilot balance only; this does not charge a card or trigger billing.</p><div className="form-grid"><label>Vendor ID<input value={creditVendorId} onChange={(e) => setCreditVendorId(e.target.value)} /></label><label>Amount (kobo)<input type="number" min="1" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} /></label></div><label>Description<input value={creditDescription} onChange={(e) => setCreditDescription(e.target.value)} /></label><button className="secondary" onClick={() => void grantCredit()}>Grant controlled credit</button></section>
    <section className="section"><div className="ad-toolbar"><h2>Campaign review</h2><div className="range-tabs" aria-label="Performance range">{ranges.map((item) => <button key={item.value} className={range === item.value ? "active" : "secondary"} aria-pressed={range === item.value} onClick={() => setRange(item.value)}>{item.label}</button>)}</div></div>{loading ? <Loading /> : data?.items.length ? data.items.map((campaign) => <article className="card ad-review-card" key={campaign.id}><div className="top-actions"><span><strong>{campaign.campaignReference}</strong> <Badge>{campaign.status}</Badge>{campaign.pendingRevisionStatus ? <> Review revision <Badge>{campaign.pendingRevisionStatus}</Badge></> : null}</span><span className="top-actions"><button className="secondary" onClick={() => void editCampaign(campaign)}>Edit / new revision</button>{availableActions(campaign).map((item) => <button className="secondary" key={item} onClick={() => void updateAd(campaign, item)}>{item.replaceAll("_", " ")}</button>)}</span></div><p className="muted">Sponsor: {campaign.sponsorName} ({campaign.sponsorType}) · Revision {campaign.reviewRevision?.revisionNumber ?? campaign.currentRevisionNumber} · Created {date(campaign.createdAt)}</p><ReviewSurface campaign={campaign} /><details><summary>Revision and audit history</summary>{campaign.revisions.map((revision) => <p className="muted" key={revision.id}>Revision {revision.revisionNumber} · {revision.createdByType} · {date(revision.createdAt)}{revision.changeReason ? ` · ${revision.changeReason}` : ""}</p>)}{campaign.auditEvents.map((event) => <p className="muted" key={event.id}>{date(event.createdAt)} · {event.action} {event.fromStatus && event.toStatus ? `${event.fromStatus} → ${event.toStatus}` : ""}</p>)}</details>{campaign.rejectionReason ? <p className="error">{campaign.rejectionReason}</p> : null}</article>) : <Empty>No ad campaigns yet.</Empty>}</section>
  </PortalShell>;
}
