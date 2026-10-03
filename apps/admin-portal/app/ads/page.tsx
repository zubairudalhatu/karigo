"use client";

import { useEffect, useState } from "react";
import { AdCampaignStatus, AdSponsorType, adsApi, AdminAdCampaign, AdminAdsResponse } from "../../src/api/ads.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../src/components/portal";
import { friendlyError } from "../../src/lib/errors";

const actions: Partial<Record<AdCampaignStatus, AdCampaignStatus[]>> = {
  DRAFT: ["SUBMITTED", "CANCELLED"], SUBMITTED: ["UNDER_REVIEW", "CANCELLED"], UNDER_REVIEW: ["CHANGES_REQUESTED", "APPROVED", "REJECTED"],
  CHANGES_REQUESTED: ["SUBMITTED", "CANCELLED"], APPROVED: ["SCHEDULED", "ACTIVE", "CANCELLED"], SCHEDULED: ["ACTIVE", "PAUSED", "EXPIRED", "CANCELLED"],
  ACTIVE: ["PAUSED", "COMPLETED", "EXPIRED", "CANCELLED"], PAUSED: ["ACTIVE", "COMPLETED", "EXPIRED", "CANCELLED"]
};
const sponsorTypes: AdSponsorType[] = ["EXTERNAL", "VENDOR"];

const emptyForm = {
  sponsorType: "EXTERNAL" as AdSponsorType,
  vendorId: "",
  advertiserName: "",
  advertiserContactName: "",
  advertiserEmail: "",
  advertiserPhone: "",
  title: "",
  body: "",
  imageUrl: "",
  ctaLabel: "",
  ctaUrl: "",
  requestedBudgetKobo: "0",
  status: "DRAFT" as AdCampaignStatus
};

function money(value: number) {
  return new Intl.NumberFormat("en-NG", { currency: "NGN", style: "currency", maximumFractionDigits: 0 }).format(value / 100);
}

function date(value?: string | null) {
  return value ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not set";
}

export default function AdminAdsPage() {
  const [data, setData] = useState<AdminAdsResponse | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [creditVendorId, setCreditVendorId] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDescription, setCreditDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await adsApi.list());
    } catch (e) {
      setError(friendlyError(e, "dashboard"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function createAd() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await adsApi.create({
        sponsorType: form.sponsorType,
        vendorId: form.sponsorType === "VENDOR" ? form.vendorId || undefined : undefined,
        advertiserName: form.sponsorType === "EXTERNAL" ? form.advertiserName : undefined,
        advertiserContactName: form.advertiserContactName || undefined,
        advertiserEmail: form.advertiserEmail || undefined,
        advertiserPhone: form.advertiserPhone || undefined,
        title: form.title,
        body: form.body,
        imageUrl: form.imageUrl || undefined,
        ctaLabel: form.ctaLabel || undefined,
        ctaUrl: form.ctaUrl || undefined,
        requestedBudgetKobo: Number(form.requestedBudgetKobo || 0),
      });
      setForm(emptyForm);
      setMessage("Ad campaign has been created for admin review.");
      await load();
    } catch (e) {
      setError(friendlyError(e, "form"));
    } finally {
      setSaving(false);
    }
  }

  async function updateAd(campaign: AdminAdCampaign, status: AdCampaignStatus) {
    setMessage("");
    setError("");
    try {
      const reason = ["CHANGES_REQUESTED", "REJECTED"].includes(status) ? window.prompt("Required review reason")?.trim() : undefined;
      if (["CHANGES_REQUESTED", "REJECTED"].includes(status) && !reason) return;
      await adsApi.action(campaign.id, status, reason);
      setMessage(`${campaign.campaignReference} updated.`);
      await load();
    } catch (e) {
      setError(friendlyError(e, "form"));
    }
  }

  async function editCampaign(campaign: AdminAdCampaign) {
    const title = window.prompt("Campaign title", campaign.title)?.trim();
    if (!title) return;
    const body = window.prompt("Campaign message", campaign.body)?.trim();
    if (!body) return;
    const changeReason = window.prompt("Audit note for this admin edit")?.trim();
    if (!changeReason) return;
    setMessage("");
    setError("");
    try {
      await adsApi.update(campaign.id, { title, body, changeReason });
      setMessage(`${campaign.campaignReference} edited by KariGO Admin with an audit note.`);
      await load();
    } catch (e) {
      setError(friendlyError(e, "form"));
    }
  }

  async function grantCredit() {
    if (!creditVendorId.trim() || !creditAmount.trim()) {
      setError("Enter a vendor ID and controlled ad credit amount.");
      return;
    }
    setMessage("");
    setError("");
    try {
      await adsApi.grantVendorCredit(creditVendorId.trim(), {
        amountKobo: Number(creditAmount),
        description: creditDescription || undefined
      });
      setCreditAmount("");
      setCreditDescription("");
      setMessage("Controlled vendor ad credit has been granted.");
    } catch (e) {
      setError(friendlyError(e, "form"));
    }
  }

  return <PortalShell>
    <h1>Ads</h1>
    <p className="muted">Manage labelled customer-home ad placements for vendors and external advertisers. Automatic ad billing remains disabled; wallet top-up is controlled separately through backend payment readiness flags.</p>
    <ErrorMessage>{error}</ErrorMessage>
    {message ? <p className="success">{message}</p> : null}
    <div className="grid">
      <article className="card"><span className="muted">Total campaigns</span><p className="metric">{data?.summary.total ?? 0}</p></article>
      <article className="card"><span className="muted">Submitted / review</span><p className="metric">{(data?.summary.submitted ?? 0) + (data?.summary.underReview ?? 0)}</p></article>
      <article className="card"><span className="muted">Approved / active</span><p className="metric">{(data?.summary.approved ?? 0) + (data?.summary.active ?? 0)}</p></article>
      <article className="card"><span className="muted">Rejected</span><p className="metric">{data?.summary.rejected ?? 0}</p></article>
    </div>
    <section className="card section">
      <h2>Create ad campaign</h2>
      <div className="form-grid">
        <label>Sponsor type<select value={form.sponsorType} onChange={(e) => setForm({ ...form, sponsorType: e.target.value as AdSponsorType })}>{sponsorTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        {form.sponsorType === "VENDOR" ? <label>Vendor ID<input value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })} placeholder="Vendor UUID" /></label> : <label>Advertiser name<input value={form.advertiserName} onChange={(e) => setForm({ ...form, advertiserName: e.target.value })} /></label>}
        <label>Contact name<input value={form.advertiserContactName} onChange={(e) => setForm({ ...form, advertiserContactName: e.target.value })} /></label>
        <label>Contact email<input value={form.advertiserEmail} onChange={(e) => setForm({ ...form, advertiserEmail: e.target.value })} /></label>
        <label>Contact phone<input value={form.advertiserPhone} onChange={(e) => setForm({ ...form, advertiserPhone: e.target.value })} /></label>
        <label>Initial state<input value="DRAFT — submit through governed actions" readOnly /></label>
        <label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label>Image URL<input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></label>
        <label>CTA label<input value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} /></label>
        <label>CTA URL<input value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} /></label>
        <label>Requested budget (kobo)<input type="number" min="0" value={form.requestedBudgetKobo} onChange={(e) => setForm({ ...form, requestedBudgetKobo: e.target.value })} /></label>
      </div>
      <label>Body<textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label>
      <button disabled={saving} onClick={() => void createAd()}>{saving ? "Saving..." : "Create campaign"}</button>
    </section>
    <section className="card section">
      <h2>Grant controlled vendor ad credit</h2>
      <p className="muted">This is an internal pilot balance only. It does not charge a payment card, fund a wallet or trigger live billing.</p>
      <div className="form-grid">
        <label>Vendor ID<input value={creditVendorId} onChange={(e) => setCreditVendorId(e.target.value)} placeholder="Vendor UUID" /></label>
        <label>Amount (kobo)<input type="number" min="1" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} /></label>
      </div>
      <label>Description<input value={creditDescription} onChange={(e) => setCreditDescription(e.target.value)} placeholder="Pilot ad credit grant" /></label>
      <button className="secondary" onClick={() => void grantCredit()}>Grant controlled credit</button>
    </section>
    {loading ? <Loading /> : <section className="section">
      {data?.items.length ? data.items.map((campaign) => <article className="card" key={campaign.id}>
        <div className="top-actions">
          <span><strong>{campaign.campaignReference}</strong> <Badge>{campaign.status}</Badge></span>
          <span className="top-actions"><button className="secondary" onClick={() => void editCampaign(campaign)}>Edit during review</button>{(actions[campaign.status] ?? []).map((item) => <button className="secondary" key={item} onClick={() => void updateAd(campaign, item)}>{item.replaceAll("_", " ")}</button>)}</span>
        </div>
        <h3>{campaign.title}</h3>
        <p>{campaign.body}</p>
        <p className="muted">Sponsor: {campaign.sponsorName} ({campaign.sponsorType})</p>
        <p className="muted">Requested {money(campaign.requestedBudgetKobo)} - Reserved {money(campaign.reservedCreditKobo)} - Created {date(campaign.createdAt)}</p>
        <p className="muted">Revision {campaign.currentRevisionNumber} · Remaining {money(campaign.remainingBudgetKobo)} · {campaign.revisions.length} revision(s) · Edited by KariGO Admin when an audited edit appears below · Last edited {date(campaign.updatedAt)}</p>
        {campaign.auditEvents.slice(0, 3).map((event) => <p className="muted" key={event.id}>{date(event.createdAt)} · {event.action} {event.fromStatus && event.toStatus ? `${event.fromStatus} → ${event.toStatus}` : ""}</p>)}
        {campaign.rejectionReason ? <p className="error">{campaign.rejectionReason}</p> : null}
      </article>) : <Empty>No ad campaigns yet.</Empty>}
    </section>}
  </PortalShell>;
}
