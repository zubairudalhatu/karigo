"use client";

import { FormEvent, useEffect, useState } from "react";
import { vendorPayoutAccountsApi, PayoutAccountFilter, ReviewPayoutAccountPayload, VendorPayoutAccountDetail, VendorPayoutAccountsResult } from "../../src/api/vendor-payout-accounts.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../src/components/portal";
import { friendlyError } from "../../src/lib/errors";

const filters: Array<{ label: string; value: PayoutAccountFilter }> = [
  { label: "All", value: "ALL" },
  { label: "Pending verification", value: "PENDING_VERIFICATION" },
  { label: "Verified", value: "VERIFIED" },
  { label: "Needs update", value: "NEEDS_UPDATE" },
  { label: "Rejected", value: "REJECTED" }
];

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString() : "Not yet";

export default function PayoutAccountsPage() {
  const [status, setStatus] = useState<PayoutAccountFilter>("ALL");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<VendorPayoutAccountsResult | null>(null);
  const [detail, setDetail] = useState<VendorPayoutAccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [vendorVisibleNote, setVendorVisibleNote] = useState("");
  const [internalNote, setInternalNote] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    vendorPayoutAccountsApi.list({ status, search })
      .then(setData)
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [status]);

  async function openDetail(id: string) {
    setDetailLoading(true);
    setError("");
    try {
      const next = await vendorPayoutAccountsApi.detail(id);
      setDetail(next);
      setVendorVisibleNote(next.vendorVisibleNote ?? "");
      setInternalNote(next.internalNote ?? "");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setDetailLoading(false);
    }
  }

  async function review(reviewStatus: ReviewPayoutAccountPayload["status"]) {
    if (!detail) return;
    if (!window.confirm(`Confirm ${reviewStatus.toLowerCase().replaceAll("_", " ")} for ${detail.vendor.businessName}? This does not transfer funds.`)) return;
    setError("");
    setMessage("");
    try {
      const next = await vendorPayoutAccountsApi.review(detail.id, { status: reviewStatus, vendorVisibleNote, internalNote });
      setDetail(next);
      setMessage("Payout account review saved. No funds were transferred.");
      await vendorPayoutAccountsApi.list({ status, search }).then(setData);
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await review("VERIFIED");
  }

  const summary = data?.summary ?? { pendingReview: 0, verifiedAccounts: 0, needsUpdate: 0, rejectedAccounts: 0 };

  return (
    <PortalShell>
      <header className="topbar">
        <div>
          <p className="muted">Finance readiness</p>
          <h1>Payout Accounts</h1>
        </div>
        <button className="secondary" onClick={load} disabled={loading}>Retry</button>
      </header>
      <p className="muted">Review vendor bank details for future settlement readiness. This page does not initiate bank transfers.</p>
      <p className="success">{message}</p>
      <ErrorMessage>{error}</ErrorMessage>

      <section className="grid">
        <div className="card"><p className="muted">Pending review</p><p className="metric">{summary.pendingReview}</p></div>
        <div className="card"><p className="muted">Verified accounts</p><p className="metric">{summary.verifiedAccounts}</p></div>
        <div className="card"><p className="muted">Needs update</p><p className="metric">{summary.needsUpdate}</p></div>
        <div className="card"><p className="muted">Rejected accounts</p><p className="metric">{summary.rejectedAccounts}</p></div>
      </section>

      <section className="section">
        <div className="filters">
          <select value={status} onChange={(event) => setStatus(event.target.value as PayoutAccountFilter)} aria-label="Payout account status filter">
            {filters.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
          </select>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vendor, bank or account name" />
          <button className="secondary" onClick={load} disabled={loading}>Search</button>
        </div>
      </section>

      <section className="detail-grid">
        <div>
          {loading ? <Loading /> : (
            data?.items.length ? (
              <table className="table">
                <thead><tr><th>Vendor</th><th>Bank</th><th>Masked account</th><th>Account name</th><th>Status</th><th>Submitted</th><th>Last updated</th><th>Action</th></tr></thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.vendor.businessName}</td>
                      <td>{item.bankName}</td>
                      <td>{item.maskedAccountNumber}</td>
                      <td>{item.accountName}</td>
                      <td><Badge>{item.status}</Badge></td>
                      <td>{formatDate(item.submittedAt)}</td>
                      <td>{formatDate(item.lastUpdatedAt)}</td>
                      <td><button className="secondary" onClick={() => void openDetail(item.id)}>Review</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <Empty>No payout accounts found.</Empty>
          )}
        </div>

        <aside className="card review-panel">
          {detailLoading ? <Loading /> : detail ? (
            <>
              <h2>{detail.vendor.businessName}</h2>
              <p className="muted">{detail.vendor.user.fullName} · {detail.vendor.phoneNumber}</p>
              <p><Badge>{detail.status}</Badge></p>
              <div className="item"><span>Bank</span><strong>{detail.bankName}</strong></div>
              <div className="item"><span>Bank code</span><strong>{detail.bankCode ?? "Not provided"}</strong></div>
              <div className="item"><span>Account name</span><strong>{detail.accountName}</strong></div>
              <div className="item"><span>Full account number</span><strong>{detail.accountNumber}</strong></div>
              <div className="item"><span>Submitted</span><strong>{formatDate(detail.submittedAt)}</strong></div>
              <div className="item"><span>Verified</span><strong>{formatDate(detail.verifiedAt)}</strong></div>

              <form className="section" onSubmit={submitReview}>
                <label>Vendor-visible note<textarea value={vendorVisibleNote} onChange={(event) => setVendorVisibleNote(event.target.value)} placeholder="Message visible to the vendor" /></label>
                <label>Internal note<textarea value={internalNote} onChange={(event) => setInternalNote(event.target.value)} placeholder="Admin-only note. Do not include account numbers." /></label>
                <div className="actions">
                  <button>Verify</button>
                  <button type="button" className="secondary" onClick={() => void review("NEEDS_UPDATE")}>Request update</button>
                  <button type="button" className="secondary" onClick={() => void review("REJECTED")}>Reject</button>
                </div>
              </form>

              <h3>Review history</h3>
              {detail.reviewHistory.length ? detail.reviewHistory.map((history) => (
                <p className="muted" key={history.id}>{history.action} · {history.adminUser.fullName} · {formatDate(history.createdAt)}</p>
              )) : <p className="muted">No review history yet.</p>}
            </>
          ) : <Empty>Select a payout account to review. Full account number appears only here.</Empty>}
        </aside>
      </section>
    </PortalShell>
  );
}
