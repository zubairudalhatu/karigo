"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminWalletDetail, AdminWalletTopUp, walletsApi, WalletLedgerDirection, WalletStatus } from "../../src/api/wallets.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../src/components/portal";
import { friendlyError, money } from "../../src/lib/errors";

const statusFilters: Array<{ label: string; value: WalletStatus | "ALL" }> = [
  { label: "All wallets", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Suspended", value: "SUSPENDED" },
  { label: "Closed", value: "CLOSED" }
];

const adjustmentDirections: Array<{ label: string; value: WalletLedgerDirection }> = [
  { label: "Credit adjustment", value: "CREDIT" },
  { label: "Debit adjustment", value: "DEBIT" }
];

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString() : "Not yet";
const statusLabel = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const topUpStatusLabel = (value: string) => {
  switch (value) {
    case "PENDING": return "Pending verification";
    case "SUCCESSFUL": return "Verified and credited";
    case "FAILED": return "Failed";
    case "CANCELLED": return "Cancelled/expired";
    default: return statusLabel(value);
  }
};
const topUpLedgerStatusLabel = (value?: string | null) => {
  switch (value) {
    case "PENDING": return "Pending verification";
    case "POSTED": return "Verified and credited";
    case "FAILED": return "Failed";
    case "CANCELLED": return "Cancelled/expired";
    default: return value ? statusLabel(value) : "";
  }
};

export default function WalletsPage() {
  const [status, setStatus] = useState<WalletStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<Awaited<ReturnType<typeof walletsApi.list>> | null>(null);
  const [topUps, setTopUps] = useState<AdminWalletTopUp[]>([]);
  const [detail, setDetail] = useState<AdminWalletDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");
  const [direction, setDirection] = useState<WalletLedgerDirection>("CREDIT");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [internalNote, setInternalNote] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([
      walletsApi.list({ status, search }),
      walletsApi.topUps()
    ])
      .then(([wallets, topUpData]) => {
        setData(wallets);
        setTopUps(topUpData.items);
      })
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [status]);

  async function openDetail(walletId: string) {
    setDetailLoading(true);
    setError("");
    setFormError("");
    setMessage("");
    try {
      setDetail(await walletsApi.detail(walletId));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setDetailLoading(false);
    }
  }

  async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Enter a positive adjustment amount.");
      return;
    }
    if (!reason.trim()) {
      setFormError("Enter a clear adjustment reason.");
      return;
    }
    if (!window.confirm(`Record ${direction.toLowerCase()} adjustment of ${money(parsedAmount)} for ${detail.customer.user.fullName}? This does not call a payment provider.`)) return;

    setFormError("");
    setMessage("");
    try {
      const result = await walletsApi.adjustment(detail.id, {
        direction,
        amount: parsedAmount,
        reason,
        idempotencyKey: idempotencyKey || undefined,
        internalNote: internalNote || undefined
      });
      const next = await walletsApi.detail(detail.id);
      setDetail(next);
      setMessage(result.duplicate ? "Duplicate adjustment ignored because the idempotency key already exists." : "Wallet adjustment recorded. No live top-up, withdrawal or payment provider action was triggered.");
      setAmount("");
      setReason("");
      setInternalNote("");
      await walletsApi.list({ status, search }).then(setData);
    } catch (e) {
      setFormError(friendlyError(e, "form"));
    }
  }

  const summary = data?.summary ?? { totalWallets: 0, activeWallets: 0, suspendedWallets: 0, closedWallets: 0, totalAvailableBalance: 0 };

  return (
    <PortalShell>
      <header className="topbar">
        <div>
          <p className="muted">Customer finance foundation</p>
          <h1>Wallets</h1>
        </div>
        <button className="secondary" onClick={load} disabled={loading}>Refresh</button>
      </header>
      <p className="muted">View customer wallet balances and ledger activity. Manual adjustments are controlled admin ledger entries only; this page does not activate live top-up, withdrawals, automatic refunds, wallet checkout, referral rewards or subscription billing.</p>
      <p className="muted">Wallet top-up records are read-only here. Credits must come only from backend provider verification or a verified webhook; this page does not manually mark provider payments successful.</p>
      <p className="success">{message}</p>
      <ErrorMessage>{error}</ErrorMessage>

      <section className="grid">
        <div className="card"><p className="muted">Total wallets</p><p className="metric">{summary.totalWallets}</p></div>
        <div className="card"><p className="muted">Active wallets</p><p className="metric">{summary.activeWallets}</p></div>
        <div className="card"><p className="muted">Suspended/closed</p><p className="metric">{summary.suspendedWallets + summary.closedWallets}</p></div>
        <div className="card"><p className="muted">Listed balance</p><p className="metric">{money(summary.totalAvailableBalance)}</p></div>
      </section>

      <section className="section">
        <div className="filters">
          <select value={status} onChange={(event) => setStatus(event.target.value as WalletStatus | "ALL")} aria-label="Wallet status filter">
            {statusFilters.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
          </select>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer name, phone or email" />
          <button className="secondary" onClick={load} disabled={loading}>Search</button>
        </div>
      </section>

      <section className="section">
        <h2>Wallet top-up records</h2>
        <p className="muted">Recent wallet top-up payments. Raw provider payloads and secrets are never shown.</p>
        {topUps.length ? (
          <table className="table">
            <thead><tr><th>Customer</th><th>Amount</th><th>Reference</th><th>Status</th><th>Provider</th><th>Created</th><th>Verified</th><th>Safe note</th></tr></thead>
            <tbody>
              {topUps.map((topUp) => (
                <tr key={topUp.id}>
                  <td>{topUp.customer.user.fullName}<br /><small className="muted">{topUp.customer.user.phoneNumber}</small></td>
                  <td>{money(topUp.amount)}</td>
                  <td>{topUp.reference}</td>
                  <td><Badge>{topUpStatusLabel(topUp.status)}</Badge>{topUp.ledgerStatus ? <><br /><small className="muted">Ledger: {topUpLedgerStatusLabel(topUp.ledgerStatus)}</small></> : null}</td>
                  <td>{topUp.provider}</td>
                  <td>{formatDate(topUp.createdAt)}</td>
                  <td>{formatDate(topUp.verifiedAt)}</td>
                  <td>{topUp.safeFailureReason ?? "No failure recorded."}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty>No wallet top-up records yet.</Empty>}
      </section>

      <section className="detail-grid">
        <div>
          {loading ? <Loading /> : data?.items.length ? (
            <table className="table">
              <thead><tr><th>Customer</th><th>Phone</th><th>Status</th><th>Available balance</th><th>Ledger balance</th><th>Last activity</th><th>Action</th></tr></thead>
              <tbody>
                {data.items.map((wallet) => (
                  <tr key={wallet.id}>
                    <td>{wallet.customer.user.fullName}</td>
                    <td>{wallet.customer.user.phoneNumber}</td>
                    <td><Badge>{wallet.status}</Badge></td>
                    <td>{money(wallet.availableBalance)}</td>
                    <td>{money(wallet.ledgerBalance)}</td>
                    <td>{formatDate(wallet.lastActivityAt)}</td>
                    <td><button className="secondary" onClick={() => void openDetail(wallet.id)}>Review</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty>No customer wallets found yet. Wallets are created when customers first open their wallet.</Empty>}
        </div>

        <aside className="card review-panel">
          {detailLoading ? <Loading /> : detail ? (
            <>
              <h2>{detail.customer.user.fullName}</h2>
              <p className="muted">{detail.customer.user.phoneNumber} - {detail.customer.user.email ?? "No email"}</p>
              <p><Badge>{detail.status}</Badge></p>
              <div className="item"><span>Available balance</span><strong>{money(detail.availableBalance)}</strong></div>
              <div className="item"><span>Ledger balance</span><strong>{money(detail.ledgerBalance)}</strong></div>
              <div className="item"><span>Currency</span><strong>{detail.currency}</strong></div>
              <div className="item"><span>Last activity</span><strong>{formatDate(detail.lastActivityAt)}</strong></div>

              <form className="section" onSubmit={submitAdjustment}>
                <h3>Controlled manual adjustment</h3>
                <p className="muted">Use only for approved staging/admin corrections. This does not trigger provider payments, withdrawals, refunds or rewards.</p>
                <ErrorMessage>{formError}</ErrorMessage>
                <label>Direction<select value={direction} onChange={(event) => setDirection(event.target.value as WalletLedgerDirection)}>
                  {adjustmentDirections.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select></label>
                <label>Amount NGN<input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0.00" /></label>
                <label>Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Approved manual wallet correction reason" /></label>
                <label>Idempotency key optional<input value={idempotencyKey} onChange={(event) => setIdempotencyKey(event.target.value)} placeholder="Optional unique reference for retry safety" /></label>
                <label>Internal note optional<textarea value={internalNote} onChange={(event) => setInternalNote(event.target.value)} placeholder="Admin-only note. Do not enter secrets, OTPs or payment credentials." /></label>
                <button disabled={detail.status !== "ACTIVE"}>Record manual adjustment</button>
              </form>

              <h3>Recent ledger</h3>
              {detail.ledgerEntries.length ? detail.ledgerEntries.map((entry) => (
                <div className="item" key={entry.id}>
                  <span>{statusLabel(entry.entryType)} - {formatDate(entry.postedAt ?? entry.createdAt)}<br /><small className="muted">{entry.reference}</small></span>
                  <strong>{entry.direction === "CREDIT" ? "+" : "-"}{money(entry.amount)}</strong>
                </div>
              )) : <p className="muted">No wallet ledger entries yet.</p>}
            </>
          ) : <Empty>Select a wallet to inspect balance, recent ledger entries and controlled adjustment tools.</Empty>}
        </aside>
      </section>
    </PortalShell>
  );
}
