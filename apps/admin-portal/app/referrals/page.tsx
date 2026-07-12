"use client";

import { useEffect, useState } from "react";
import { CustomerReferralStatus, referralsApi, ReferralRewardRule, ReferralRewardType } from "../../src/api/referrals.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../src/components/portal";
import { friendlyError, money } from "../../src/lib/errors";

const statusFilters: Array<{ label: string; value: CustomerReferralStatus | "ALL" }> = [
  { label: "All referrals", value: "ALL" },
  { label: "Registered", value: "REGISTERED" },
  { label: "Account activated", value: "ACCOUNT_ACTIVATED" },
  { label: "First valid transaction", value: "FIRST_VALID_TRANSACTION_COMPLETED" },
  { label: "Eligible", value: "ELIGIBLE_FOR_REWARD" },
  { label: "Reward review pending", value: "REWARD_REVIEW_PENDING" },
  { label: "Reward approved", value: "REWARD_APPROVED" },
  { label: "Ineligible", value: "INELIGIBLE" },
  { label: "Cancelled", value: "CANCELLED" }
];
const reviewStatuses: Array<{ label: string; value: CustomerReferralStatus }> = [
  { label: "Eligible for manual reward review", value: "ELIGIBLE_FOR_REWARD" },
  { label: "Reward review pending", value: "REWARD_REVIEW_PENDING" },
  { label: "Reward approved / reserved for future fulfilment", value: "REWARD_APPROVED" },
  { label: "Ineligible", value: "INELIGIBLE" },
  { label: "Cancelled", value: "CANCELLED" }
];
const rewardTypeFilters: Array<{ label: string; value: ReferralRewardType | "ALL" }> = [
  { label: "All reward types", value: "ALL" },
  { label: "Manual review", value: "MANUAL_REVIEW" },
  { label: "Wallet credit", value: "WALLET_CREDIT" },
  { label: "Promo code", value: "PROMO_CODE" },
  { label: "Airtime", value: "AIRTIME" },
  { label: "Data", value: "DATA" }
];

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString() : "Not yet";
const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function ReferralsPage() {
  const [status, setStatus] = useState<CustomerReferralStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [rewardType, setRewardType] = useState<ReferralRewardType | "ALL">("ALL");
  const [data, setData] = useState<Awaited<ReturnType<typeof referralsApi.list>> | null>(null);
  const [rules, setRules] = useState<ReferralRewardRule[]>([]);
  const [selectedReferral, setSelectedReferral] = useState<Awaited<ReturnType<typeof referralsApi.detail>> | null>(null);
  const [reviewStatus, setReviewStatus] = useState<CustomerReferralStatus>("REWARD_REVIEW_PENDING");
  const [reviewRewardRuleId, setReviewRewardRuleId] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [error, setError] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([
      referralsApi.list({ status, search }),
      referralsApi.rewardRules({ isActive: "ALL", rewardType })
    ])
      .then(([nextData, nextRules]) => {
        setData(nextData);
        setRules(nextRules);
      })
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setLoading(false));
  };

  const openReview = async (referralId: string) => {
    setReviewLoading(true);
    setReviewError("");
    setReviewSuccess("");
    try {
      const referral = await referralsApi.detail(referralId);
      const safeReviewStatus = reviewStatuses.some((option) => option.value === referral.status)
        ? referral.status
        : "REWARD_REVIEW_PENDING";
      setSelectedReferral(referral);
      setReviewStatus(safeReviewStatus);
      setReviewRewardRuleId(referral.rewardRule?.id ?? "");
      setReviewNote(referral.adminNote ?? "");
    } catch (e) {
      setReviewError(friendlyError(e, "form"));
    } finally {
      setReviewLoading(false);
    }
  };

  const saveReview = async () => {
    if (!selectedReferral) return;
    setReviewLoading(true);
    setReviewError("");
    setReviewSuccess("");
    try {
      const updated = await referralsApi.review(selectedReferral.id, {
        status: reviewStatus,
        rewardRuleId: reviewRewardRuleId || null,
        adminNote: reviewNote.trim() || undefined
      });
      setSelectedReferral(updated);
      setData((current) => current ? {
        ...current,
        items: current.items.map((item) => item.id === updated.id ? updated : item)
      } : current);
      setReviewSuccess("Referral review decision saved. Reward remains reserved only; no wallet credit, airtime, data, promo, free delivery or message was issued.");
      void load();
    } catch (e) {
      setReviewError(friendlyError(e, "form"));
    } finally {
      setReviewLoading(false);
    }
  };

  useEffect(() => { load(); }, [status, rewardType]);

  const summary = data?.summary ?? {
    total: 0,
    registered: 0,
    accountActivated: 0,
    eligibleForReward: 0,
    rewardReviewPending: 0,
    rewardApproved: 0,
    rewardsIssued: 0,
    automaticRewardFulfillmentEnabled: false
  };

  return <PortalShell>
    <header className="topbar">
      <div>
        <p className="muted">Referral tracking</p>
        <h1>Referrals</h1>
      </div>
      <button className="secondary" onClick={load} disabled={loading}>Refresh</button>
    </header>

    <p className="muted">Track referral codes, referred customers and reward-rule configuration. This page does not issue rewards, credit wallets, send airtime/data, issue promo codes or send SMS/email/WhatsApp/push notifications.</p>
    <ErrorMessage>{error}</ErrorMessage>

    <section className="grid">
      <SummaryCard label="Total referrals" value={summary.total} />
      <SummaryCard label="Registered" value={summary.registered} />
      <SummaryCard label="Activated" value={summary.accountActivated} />
      <SummaryCard label="Eligible" value={summary.eligibleForReward} />
      <SummaryCard label="Pending review" value={summary.rewardReviewPending} />
      <SummaryCard label="Approved/reserved" value={summary.rewardApproved} />
      <div className="card"><p className="muted">Auto fulfillment</p><p className="metric">{summary.automaticRewardFulfillmentEnabled ? "On" : "Off"}</p></div>
    </section>

    <section className="section">
      <div className="filters">
        <select value={status} onChange={(event) => setStatus(event.target.value as CustomerReferralStatus | "ALL")} aria-label="Referral status filter">
          {statusFilters.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
        </select>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search code, referrer or referred customer" />
        <button className="secondary" onClick={load} disabled={loading}>Search</button>
      </div>
    </section>

    <section className="section">
      <h2>Referral records</h2>
      {loading ? <Loading /> : data?.items.length ? (
        <table className="table">
          <thead><tr><th>Code</th><th>Referrer</th><th>Referred customer</th><th>Status</th><th>Created</th><th>Activated</th><th>Reward</th><th>Review</th></tr></thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.referralCode}</strong></td>
                <td>{item.referrerCustomer.user.fullName}<br /><small className="muted">{item.referrerCustomer.user.phoneNumber}</small></td>
                <td>{item.referredCustomer.user.fullName}<br /><small className="muted">{item.referredCustomer.user.phoneNumber}</small></td>
                <td><Badge>{item.status}</Badge></td>
                <td>{formatDate(item.createdAt)}</td>
                <td>{formatDate(item.accountActivatedAt)}</td>
                <td>{item.fulfillmentEnabled ? "Enabled" : "Tracking only"}</td>
                <td><button className="secondary" onClick={() => void openReview(item.id)} disabled={reviewLoading}>Review</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <Empty>No referral records found yet. Customer registrations using referral codes will appear here.</Empty>}
    </section>

    <section className="section detail-grid">
      <div className="card">
        <p className="muted">Manual qualification review</p>
        <h2>Referral review decision</h2>
        <p className="muted">Mark eligibility and reserve a future reward decision for management follow-up. This workflow does not issue any wallet credit, airtime, data, promo code, free delivery reward or notification.</p>
        {selectedReferral ? (
          <div className="section">
            <div className="item"><span>Referral code</span><strong>{selectedReferral.referralCode}</strong></div>
            <div className="item"><span>Referrer</span><strong>{selectedReferral.referrerCustomer.user.fullName}</strong></div>
            <div className="item"><span>Referred customer</span><strong>{selectedReferral.referredCustomer.user.fullName}</strong></div>
            <div className="item"><span>Current status</span><Badge>{selectedReferral.status}</Badge></div>
            <div className="item"><span>Eligible at</span><strong>{formatDate(selectedReferral.eligibleAt)}</strong></div>
            <div className="item"><span>Reviewed at</span><strong>{formatDate(selectedReferral.rewardReviewedAt)}</strong></div>
            <div className="item"><span>Reward reserved</span><strong>{selectedReferral.status === "REWARD_APPROVED" ? "Yes, future fulfilment only" : "No"}</strong></div>
          </div>
        ) : <Empty>Select a referral record to review eligibility and reserve a manual reward decision.</Empty>}
      </div>

      <div className="card review-panel">
        <h2>Save review</h2>
        <label>Status decision
          <select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as CustomerReferralStatus)} disabled={!selectedReferral || reviewLoading}>
            {reviewStatuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>Reward rule reference
          <select value={reviewRewardRuleId} onChange={(event) => setReviewRewardRuleId(event.target.value)} disabled={!selectedReferral || reviewLoading}>
            <option value="">No rule selected</option>
            {rules.map((rule) => <option key={rule.id} value={rule.id}>{rule.name} ({label(rule.rewardType)})</option>)}
          </select>
        </label>
        <label>Internal admin note
          <textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} disabled={!selectedReferral || reviewLoading} placeholder="Record why this referral is eligible, pending, approved/reserved, ineligible or cancelled." />
        </label>
        <ErrorMessage>{reviewError}</ErrorMessage>
        {reviewSuccess ? <p className="success">{reviewSuccess}</p> : null}
        <button onClick={() => void saveReview()} disabled={!selectedReferral || reviewLoading}>{reviewLoading ? "Saving..." : "Save review decision"}</button>
      </div>
    </section>

    <section className="section">
      <div className="topbar">
        <div>
          <p className="muted">Configuration visibility</p>
          <h2>Reward rules</h2>
        </div>
        <select value={rewardType} onChange={(event) => setRewardType(event.target.value as ReferralRewardType | "ALL")} aria-label="Referral reward type filter">
          {rewardTypeFilters.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
        </select>
      </div>
      {loading ? <Loading /> : rules.length ? (
        <table className="table">
          <thead><tr><th>Rule</th><th>Trigger</th><th>Reward type</th><th>Referrer value</th><th>Minimum</th><th>Status</th><th>Fulfillment</th></tr></thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td><strong>{rule.name}</strong><br /><small className="muted">{rule.description ?? "No description"}</small></td>
                <td>{label(rule.trigger)}</td>
                <td>{label(rule.rewardType)}</td>
                <td>{money(rule.referrerRewardValue)} {rule.currency}</td>
                <td>{rule.minimumTransactionAmount ? money(rule.minimumTransactionAmount) : "Not set"}</td>
                <td><Badge>{rule.isActive ? "ACTIVE" : "INACTIVE"}</Badge></td>
                <td>{rule.fulfillmentEnabled ? "Enabled" : "Disabled"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <Empty>No referral reward rules configured yet. Rules are configuration records only until reward fulfillment is approved.</Empty>}
    </section>
  </PortalShell>;
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <div className="card"><p className="muted">{label}</p><p className="metric">{value}</p></div>;
}
