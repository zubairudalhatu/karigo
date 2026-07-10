"use client";

import { useEffect, useState } from "react";
import type { UtilityTransactionStatus } from "@karigo/shared-types";
import { utilitiesApi, AdminUtilityTransaction } from "../../src/api/utilities.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../src/components/portal";
import { friendlyError } from "../../src/lib/errors";

const moneyKobo = (value: number) => `NGN ${(value / 100).toLocaleString()}`;
const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const statuses: UtilityTransactionStatus[] = ["PENDING", "PROCESSING", "SUCCESSFUL", "FAILED", "CANCELLED"];

export default function AdminUtilitiesPage() {
  const [summary, setSummary] = useState({ totalTransactions: 0, pending: 0, successful: 0, failed: 0, totalTestValueKobo: 0 });
  const [transactions, setTransactions] = useState<AdminUtilityTransaction[]>([]);
  const [selected, setSelected] = useState<AdminUtilityTransaction | null>(null);
  const [filters, setFilters] = useState({ serviceType: "", status: "", search: "" });
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    setError("");
    try {
      const [nextSummary, nextTransactions] = await Promise.all([utilitiesApi.summary(), utilitiesApi.list(filters)]);
      setSummary(nextSummary);
      setTransactions(nextTransactions);
      if (selected) {
        const match = nextTransactions.find((transaction) => transaction.id === selected.id);
        setSelected(match ?? null);
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const applyFilters = async () => {
    setLoading(true);
    await load();
  };

  const openDetail = async (id: string) => {
    setError("");
    try {
      setSelected(await utilitiesApi.detail(id));
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  const overrideStatus = async (status: UtilityTransactionStatus) => {
    if (!selected) return;
    if (!window.confirm("Update this mock utility transaction status? No live fulfilment will occur.")) return;
    try {
      setSelected(await utilitiesApi.updateStatus(selected.id, status, note));
      setMessage("Utility transaction status updated for staging review.");
      setNote("");
      await load();
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  return <PortalShell>
    <h1>Utilities</h1>
    <p className="muted">Test-mode utility transaction monitoring. No live provider fulfilment occurs from this page.</p>
    <p className="success">{message}</p>
    <ErrorMessage>{error}</ErrorMessage>

    <section className="grid">
      <article className="card"><span className="muted">Total transactions</span><p className="metric">{summary.totalTransactions}</p></article>
      <article className="card"><span className="muted">Pending</span><p className="metric">{summary.pending}</p></article>
      <article className="card"><span className="muted">Successful</span><p className="metric">{summary.successful}</p></article>
      <article className="card"><span className="muted">Failed</span><p className="metric">{summary.failed}</p><span className="muted">Value: {moneyKobo(summary.totalTestValueKobo)}</span></article>
    </section>

    <section className="section">
      <div className="filters">
        <select value={filters.serviceType} onChange={(event) => setFilters({ ...filters, serviceType: event.target.value })}>
          <option value="">All services</option>
          <option value="AIRTIME">Airtime</option>
          <option value="DATA">Data</option>
          <option value="ELECTRICITY">Electricity</option>
          <option value="CABLE_TV">Cable TV</option>
        </select>
        <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
          <option value="">All statuses</option>
          {statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}
        </select>
        <input placeholder="Reference, customer or provider" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
        <button onClick={applyFilters}>Apply filters</button>
      </div>
    </section>

    {loading ? <Loading /> : <section className="detail-grid">
      <div className="section">
        {transactions.length ? <table className="table">
          <thead><tr><th>Reference</th><th>Customer</th><th>Service</th><th>Provider</th><th>Amount</th><th>Status</th><th>Created</th><th>Action</th></tr></thead>
          <tbody>{transactions.map((transaction) => <tr key={transaction.id}>
            <td>{transaction.reference}</td>
            <td>{transaction.customer.fullName}</td>
            <td>{label(transaction.serviceType)}</td>
            <td>{transaction.provider.name}</td>
            <td>{moneyKobo(transaction.totalKobo)}</td>
            <td><Badge>{transaction.status}</Badge></td>
            <td>{new Date(transaction.createdAt).toLocaleString()}</td>
            <td><button className="secondary" onClick={() => openDetail(transaction.id)}>Open</button></td>
          </tr>)}</tbody>
        </table> : <Empty>No utility transactions found for the selected filters.</Empty>}
      </div>

      <aside className="card review-panel">
        <h2>Transaction detail</h2>
        {selected ? <>
          <p><strong>{selected.reference}</strong></p>
          <p className="muted">Test-mode utility transaction. No live provider fulfilment occurred.</p>
          <div className="item"><span>Customer</span><strong>{selected.customer.fullName}</strong></div>
          <div className="item"><span>Service</span><strong>{label(selected.serviceType)}</strong></div>
          <div className="item"><span>Provider</span><strong>{selected.provider.name}</strong></div>
          {selected.product ? <div className="item"><span>Plan</span><strong>{selected.product.name}</strong></div> : null}
          <div className="item"><span>Recipient</span><strong>{selected.recipient}</strong></div>
          <div className="item"><span>Amount</span><strong>{moneyKobo(selected.amountKobo)}</strong></div>
          <div className="item"><span>Fee</span><strong>{moneyKobo(selected.convenienceFeeKobo)}</strong></div>
          <div className="item"><span>Total</span><strong>{moneyKobo(selected.totalKobo)}</strong></div>
          <div className="item"><span>Status</span><Badge>{selected.status}</Badge></div>
          {selected.mockToken ? <div className="item"><span>Mock token</span><strong>{selected.mockToken}</strong></div> : null}
          {selected.failureReason ? <p className="error">{selected.failureReason}</p> : null}
          <textarea placeholder="Staging override note" value={note} onChange={(event) => setNote(event.target.value)} />
          <div className="actions">
            <button onClick={() => overrideStatus("SUCCESSFUL")}>Mark successful</button>
            <button onClick={() => overrideStatus("FAILED")}>Mark failed</button>
            <button className="secondary" onClick={() => overrideStatus("CANCELLED")}>Cancel</button>
          </div>
        </> : <p className="muted">Open a transaction to review detail and staging-safe status controls.</p>}
      </aside>
    </section>}
  </PortalShell>;
}
