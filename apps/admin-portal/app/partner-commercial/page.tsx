"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminPartnerCommercialPolicy, partnerCommercialApi, UpdatePartnerCommercialPolicyInput } from "../../src/api/partner-commercial.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../src/components/portal";
import { friendlyError } from "../../src/lib/errors";

const money = (kobo: number | null) => kobo === null ? "FEE NOT CONFIGURED" : new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(kobo / 100);

function draftFrom(policy: AdminPartnerCommercialPolicy): UpdatePartnerCommercialPolicyInput {
  return {
    businessCategory: policy.businessCategory,
    commercialModel: policy.commercialModel,
    commissionRateBasisPoints: policy.commissionRateBasisPoints,
    onboardingFeeKobo: policy.onboardingFeeKobo,
    renewalFeeKobo: policy.renewalFeeKobo,
    publicTitle: policy.publicTitle,
    publicSummary: policy.publicSummary,
    policyVersion: `${policy.policyVersion}-next`,
    effectiveFrom: new Date().toISOString(),
    effectiveTo: null,
    isActive: true,
    publicOnboardingEnabled: policy.categoryPublicOnboardingEnabled,
    internalNote: ""
  };
}

export default function PartnerCommercialPoliciesPage() {
  const [policies, setPolicies] = useState<AdminPartnerCommercialPolicy[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<UpdatePartnerCommercialPolicyInput | null>(null);
  const [feeInput, setFeeInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try { setPolicies(await partnerCommercialApi.policies()); }
    catch (err) { setPolicies([]); setError(friendlyError(err, "dashboard")); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);
  const selected = useMemo(() => policies.find((policy) => policy.id === selectedId) ?? null, [policies, selectedId]);

  function begin(policy: AdminPartnerCommercialPolicy) {
    setSelectedId(policy.id);
    setDraft(draftFrom(policy));
    setFeeInput(policy.onboardingFeeKobo === null ? "" : String(policy.onboardingFeeKobo / 100));
    setMessage("");
    setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft || !selected) return;
    if (!window.confirm(`Create policy version ${draft.policyVersion} for ${draft.businessCategory}? Existing accepted agreements will not be changed.`)) return;
    const onboardingFeeKobo = draft.commercialModel === "ONBOARDING_FEE" ? (feeInput.trim() === "" ? null : Math.round(Number(feeInput) * 100)) : null;
    if (feeInput.trim() !== "" && (!Number.isFinite(onboardingFeeKobo) || (onboardingFeeKobo ?? -1) < 0)) { setError("Enter a valid onboarding fee or leave it blank for FEE NOT CONFIGURED."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      await partnerCommercialApi.createPolicyVersion({ ...draft, onboardingFeeKobo });
      setMessage("New policy version created and audited. Existing accepted agreements remain unchanged.");
      setDraft(null); setSelectedId(""); await load();
    } catch (err) { setError(friendlyError(err, "form")); }
    finally { setSaving(false); }
  }

  return <PortalShell>
    <h1>Partner Commercial Policies</h1>
    <p className="muted">Create versioned category terms. A new policy never edits an already accepted Partner agreement. Missing onboarding fee is not zero; it blocks payment and activation.</p>
    <p className="success">{message}</p><ErrorMessage>{error}</ErrorMessage>
    <section className="section">
      {loading ? <Loading /> : policies.length ? policies.map((policy) => <article className="card" key={policy.id}>
        <strong>{policy.publicTitle}</strong>
        <p><Badge>{policy.businessCategory}</Badge> <Badge>{policy.commercialModel}</Badge> <Badge>{policy.isActive ? "ACTIVE VERSION" : "HISTORICAL VERSION"}</Badge> <Badge>{policy.categoryPublicOnboardingEnabled ? "CATEGORY ENABLED" : "CATEGORY DISABLED"}</Badge></p>
        <p>{policy.commercialModel === "COMMISSION" ? `${policy.commissionPercent}% KariGO commission` : `0% sales/service commission · ${money(policy.onboardingFeeKobo)}`}</p>
        <p className="muted">Version {policy.policyVersion} · effective {new Date(policy.effectiveFrom).toLocaleString()}</p>
        <p className="muted">{policy.publicSummary}</p>
        <button className="secondary" onClick={() => begin(policy)}>Create new version</button>
      </article>) : <Empty>No Partner commercial policies found. Apply the reviewed additive migration before configuration.</Empty>}
    </section>
    {draft && selected ? <section className="section"><h2>New policy version</h2><form className="card form-grid" onSubmit={(event) => void submit(event)}>
      <p><strong>{draft.businessCategory}</strong> · locked launch model {draft.commercialModel}</p>
      <label>Policy version<input value={draft.policyVersion} onChange={(event) => setDraft({ ...draft, policyVersion: event.target.value })} required /></label>
      <label>Commission basis points<input type="number" min={0} max={10000} value={draft.commissionRateBasisPoints} onChange={(event) => setDraft({ ...draft, commissionRateBasisPoints: Number(event.target.value) })} required /></label>
      {draft.commercialModel === "ONBOARDING_FEE" ? <label>Onboarding fee (NGN)<input type="number" min={0} step="0.01" value={feeInput} onChange={(event) => setFeeInput(event.target.value)} placeholder="Leave blank: FEE NOT CONFIGURED" /></label> : null}
      <label>Public title<input value={draft.publicTitle} onChange={(event) => setDraft({ ...draft, publicTitle: event.target.value })} required /></label>
      <label>Public summary<textarea value={draft.publicSummary} onChange={(event) => setDraft({ ...draft, publicSummary: event.target.value })} required /></label>
      <label>Internal note<textarea value={draft.internalNote} onChange={(event) => setDraft({ ...draft, internalNote: event.target.value })} /></label>
      <label><input type="checkbox" checked={draft.publicOnboardingEnabled} onChange={(event) => setDraft({ ...draft, publicOnboardingEnabled: event.target.checked })} /> Category ready for public onboarding (global release flag remains independent)</label>
      <div className="actions"><button disabled={saving}>{saving ? "Saving..." : "Create audited version"}</button><button type="button" className="secondary" onClick={() => setDraft(null)}>Cancel</button></div>
    </form></section> : null}
  </PortalShell>;
}
