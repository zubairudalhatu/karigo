"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell, Empty, ErrorMessage, Loading, StatusBadge } from "../../src/components/dashboard";
import { friendlyError, money } from "../../src/lib/errors";
import { settlementsApi, VendorSettlement, VendorSettlementFilter, VendorSettlementsResult } from "../../src/api/settlements.api";

const filters: Array<{ label: string; value: VendorSettlementFilter }> = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Paid", value: "PAID" }
];

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString() : "Not yet paid";

function SettlementCard({ settlement }: { settlement: VendorSettlement }) {
  return (
    <article className="card settlement-card">
      <div className="settlement-main">
        <div>
          <p className="muted">Order</p>
          <strong className="wrap">{settlement.orderNumber}</strong>
          <p className="muted">Created {formatDate(settlement.createdAt)}</p>
        </div>
        <div className="settlement-amount">
          <StatusBadge>{settlement.settlementStatus}</StatusBadge>
          <strong>{money(settlement.settlementAmount)}</strong>
        </div>
      </div>
      <div className="settlement-meta">
        <span>Completed: {formatDate(settlement.orderCompletedAt)}</span>
        <span>Gross subtotal: {money(settlement.grossOrderSubtotal)}</span>
        <span>Delivery fee: {money(settlement.deliveryFee ?? 0)}</span>
        <span>KariGO fee: {money(settlement.platformFee)}</span>
        <span>Paid: {formatDate(settlement.paidAt)}</span>
        {settlement.payoutReference ? <span className="wrap">Reference: {settlement.payoutReference}</span> : null}
      </div>
    </article>
  );
}

export default function Settlements() {
  const [status, setStatus] = useState<VendorSettlementFilter>("ALL");
  const [data, setData] = useState<VendorSettlementsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    settlementsApi.list(status)
      .then(setData)
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [status]);

  const summary = useMemo(() => data?.summary ?? { totalSettlements: 0, pendingPayout: 0, paidOut: 0 }, [data]);

  return (
    <DashboardShell>
      <header className="topbar">
        <div>
          <p className="muted">Payout history</p>
          <h1>Settlements</h1>
        </div>
        <div className="filters">
          <select value={status} onChange={(event) => setStatus(event.target.value as VendorSettlementFilter)} aria-label="Settlement status filter">
            {filters.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
          </select>
          <button className="secondary" onClick={load} disabled={loading}>Retry</button>
        </div>
      </header>

      <ErrorMessage>{error}</ErrorMessage>

      <section className="grid">
        <div className="card"><p className="muted">Total settlements</p><p className="metric">{summary.totalSettlements}</p></div>
        <div className="card"><p className="muted">Pending payout</p><p className="metric">{money(summary.pendingPayout)}</p></div>
        <div className="card"><p className="muted">Paid out</p><p className="metric">{money(summary.paidOut)}</p></div>
      </section>

      {loading ? <Loading /> : (
        <section className="section">
          {data?.items.length ? data.items.map((settlement) => <SettlementCard key={settlement.id} settlement={settlement} />) : (
            <Empty>No settlements yet. Completed and eligible orders will appear here.</Empty>
          )}
        </section>
      )}
    </DashboardShell>
  );
}
