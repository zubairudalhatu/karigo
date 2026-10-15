"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AccountDeletionRequest,
  AccountDeletionStatus,
  accountDeletionApi
} from "../../src/api/account-deletion.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../src/components/portal";
import { collectionLoadError } from "../../src/lib/collections";
import { friendlyError } from "../../src/lib/errors";

const statusOptions: AccountDeletionStatus[] = ["REQUESTED", "BLOCKED", "IN_REVIEW", "PROCESSING", "COMPLETED", "CANCELLED"];
const actionStatuses: AccountDeletionStatus[] = ["IN_REVIEW", "BLOCKED", "PROCESSING", "COMPLETED", "CANCELLED"];

function label(value?: string | null) {
  return value ? value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Not recorded";
}

function dateLabel(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Not recorded";
}

function scopeSummary(request: AccountDeletionRequest) {
  const parts = [];
  if (request.user.hasCustomerProfile) parts.push("Customer");
  if (request.user.hasCaptainProfile) parts.push("Captain");
  if (request.user.hasPartnerProfile) parts.push("Partner");
  return parts.length ? parts.join(", ") : "Base user account";
}

export default function AccountDeletionRequestsPage() {
  const [requests, setRequests] = useState<AccountDeletionRequest[]>([]);
  const [selected, setSelected] = useState<AccountDeletionRequest | null>(null);
  const [filters, setFilters] = useState({ status: "", accountType: "", search: "" });
  const [adminNote, setAdminNote] = useState("");
  const [retentionApproval, setRetentionApproval] = useState("");
  const [externalCleanupEvidence, setExternalCleanupEvidence] = useState("");
  const [erasureConfirmation, setErasureConfirmation] = useState("");
  const [reconciledNoticeProviderId, setReconciledNoticeProviderId] = useState("");
  const [noIdentifiableLegalHoldConfirmed, setNoIdentifiableLegalHoldConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const counts = useMemo(() => requests.reduce<Record<string, number>>((summary, request) => {
    summary[request.status] = (summary[request.status] ?? 0) + 1;
    return summary;
  }, {}), [requests]);

  async function load(nextFilters = filters) {
    setLoading(true);
    setError("");
    try {
      const data = await accountDeletionApi.list(nextFilters);
      setRequests(data);
      if (selected) {
        setSelected(data.find((item) => item.id === selected.id) ?? null);
      }
    } catch (e) {
      setRequests([]);
      setError(collectionLoadError(e, "account deletion requests"));
    } finally {
      setLoading(false);
    }
  }

  async function open(request: AccountDeletionRequest) {
    setError("");
    try {
      setSelected(await accountDeletionApi.detail(request.id));
      setAdminNote(request.adminNote ?? "");
      setRetentionApproval(""); setExternalCleanupEvidence(""); setErasureConfirmation(""); setReconciledNoticeProviderId("");
      setNoIdentifiableLegalHoldConfirmed(false);
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  async function updateStatus(status: AccountDeletionStatus) {
    if (!selected) return;
    const permanentCustomer = selected.accountType === "CUSTOMER" && selected.erasureVersion === 1;
    if (permanentCustomer && status === "COMPLETED" && (erasureConfirmation !== "DELETE_CUSTOMER_DATA" || !retentionApproval || !externalCleanupEvidence || !noIdentifiableLegalHoldConfirmed)) {
      setError("Enter the exact permanent-erasure confirmation and approved retention/external-cleanup evidence references."); return;
    }
    if (adminNote.trim().length < 3) {
      setError("A safe admin note of at least 3 characters is required.");
      return;
    }
    const warning = status === "PROCESSING"
      ? "Processing will revoke active refresh sessions and take the relevant account surface offline. Continue?"
      : status === "COMPLETED"
        ? permanentCustomer ? "Permanently erase Customer personal data, send one completion confirmation and retain only minimized, justified records? This cannot be undone."
          : "Complete the reviewed legacy scope? Customer erasure requires the new governed lifecycle."
        : `Move this request to ${label(status)}?`;
    if (!window.confirm(warning)) return;
    setActioning(true);
    setError("");
    setMessage("");
    try {
      const updated = await accountDeletionApi.updateStatus(selected.id, { status, adminNote,
        ...(permanentCustomer && status === "COMPLETED" ? { confirmCustomerErasure: erasureConfirmation, retentionApproval, externalCleanupEvidence, noIdentifiableLegalHoldConfirmed,
          ...(reconciledNoticeProviderId ? { reconciledNoticeProviderId } : {}) } : {}) });
      setSelected(updated);
      setMessage(`Request ${updated.requestReference} updated to ${label(updated.status)}.`);
      await load();
    } catch (e) {
      setError(friendlyError(e, "form"));
    } finally {
      setActioning(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <PortalShell>
      <header className="topbar">
        <div>
          <p className="muted">Governance and account controls</p>
          <h1>Account Deletion Requests</h1>
        </div>
        <button className="secondary" onClick={() => void load()} disabled={loading}>Refresh</button>
      </header>
      <p className="muted">
        Review customer deletion, Captain access deactivation, Partner business access deletion and complete-account requests. This workflow preserves financial, order, ride, settlement, security and audit records. It does not provide unguarded permanent deletion.
      </p>
      {message ? <p className="success">{message}</p> : null}
      <ErrorMessage>{error}</ErrorMessage>

      <section className="grid">
        <article className="card"><span className="muted">Loaded requests</span><p className="metric">{requests.length}</p></article>
        <article className="card"><span className="muted">Requested</span><p className="metric">{counts.REQUESTED ?? 0}</p></article>
        <article className="card"><span className="muted">Blocked</span><p className="metric">{counts.BLOCKED ?? 0}</p></article>
        <article className="card"><span className="muted">Processing</span><p className="metric">{counts.PROCESSING ?? 0}</p></article>
        <article className="card"><span className="muted">Overdue — escalate</span><p className="metric">{requests.filter(r => r.erasureVersion === 1 && r.status !== "COMPLETED" && r.deadlineAt && new Date(r.deadlineAt) < new Date()).length}</p></article>
      </section>

      <section className="section">
        <div className="filters">
          <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option value="">All statuses</option>
            {statusOptions.map((status) => <option key={status} value={status}>{label(status)}</option>)}
          </select>
          <select value={filters.accountType} onChange={(event) => setFilters({ ...filters, accountType: event.target.value })}>
            <option value="">All account types</option>
            <option value="CUSTOMER">Customer</option>
            <option value="CAPTAIN">Captain access</option>
            <option value="PARTNER">Partner business access</option>
            <option value="COMPLETE_ACCOUNT">Complete account</option>
          </select>
          <input placeholder="Reference, name, phone or email" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
          <button onClick={() => void load()}>Apply filters</button>
        </div>
      </section>

      {loading ? <Loading /> : (
        <section className="detail-grid">
          <div className="section">
            {requests.length ? <table className="table">
              <thead><tr><th>Reference</th><th>Account</th><th>User</th><th>Requested</th><th>Status</th><th>Blockers</th><th>Action</th></tr></thead>
              <tbody>{requests.map((request) => (
                <tr key={request.id}>
                  <td>{request.requestReference}</td>
                  <td>{request.accountTypeLabel}</td>
                  <td>{request.user.fullName}<br /><span className="muted">{request.user.phoneNumber}</span></td>
                  <td>{dateLabel(request.requestedAt)}</td>
                  <td><Badge>{request.status}</Badge></td>
                  <td>{request.blockers.length ? request.blockers.length : "None"}</td>
                  <td><button className="secondary" onClick={() => void open(request)}>Open</button></td>
                </tr>
              ))}</tbody>
            </table> : <Empty>No account deletion requests match the selected filters.</Empty>}
          </div>

          <aside className="card review-panel">
            <h2>Request detail</h2>
            {selected ? (
              <>
                <p><strong>{selected.requestReference}</strong></p>
                <p><Badge>{selected.status}</Badge> <Badge>{selected.accountTypeLabel}</Badge></p>
                <div className="item"><span>User</span><strong>{selected.user.fullName}</strong></div>
                <div className="item"><span>Phone</span><strong>{selected.user.phoneNumber}</strong></div>
                <div className="item"><span>Email</span><strong>{selected.user.email ?? "Not recorded"}</strong></div>
                <div className="item"><span>Current role</span><strong>{selected.user.role}</strong></div>
                <div className="item"><span>Account status</span><strong>{selected.user.accountStatus}</strong></div>
                <div className="item"><span>Available scopes</span><strong>{scopeSummary(selected)}</strong></div>
                <div className="item"><span>Requested</span><strong>{dateLabel(selected.requestedAt)}</strong></div>
                <div className="item"><span>Processing started</span><strong>{dateLabel(selected.processingStartedAt)}</strong></div>
                <div className="item"><span>Completed</span><strong>{dateLabel(selected.completedAt)}</strong></div>
                <div className="item"><span>Operational state</span><strong>
                  Partner online: {selected.operationalIndicators.partnerOnline ? "Yes" : "No"}; Delivery online: {selected.operationalIndicators.captainDeliveryOnline ? "Yes" : "No"}; Ride online: {selected.operationalIndicators.captainRideOnline ? "Yes" : "No"}
                </strong></div>
                <p className="muted">Reason: {selected.reason ?? "No reason supplied."}</p>
                {selected.blockers.length ? (
                  <div>
                    <h3>Current blockers</h3>
                    <ul>
                      {selected.blockers.map((blocker) => (
                        <li key={blocker.code}>{label(blocker.code)}: {blocker.message} ({blocker.count})</li>
                      ))}
                    </ul>
                  </div>
                ) : <p className="muted">{selected.erasureVersion === 1 ? "Completion rechecks balances, unresolved purchases/work, disputes, assets and legal/retention approval. A listed request is not completion approval." : "No active blockers reported by backend."}</p>}
                <label className="field">
                  <span>Internal admin note</span>
                  <textarea value={adminNote} onChange={(event) => setAdminNote(event.target.value)} placeholder="Required audit note. Do not enter OTPs, secrets or payment credentials." />
                </label>
                <div className="actions">
                  {selected.erasureVersion === 1 ? <div>
                    <p>Deadline: {dateLabel(selected.deadlineAt)}. Cleanup issue: {selected.cleanupErrorCode ?? "None"}. Exact retention durations: LEGAL REVIEW REQUIRED.</p>
                    <label><input type="checkbox" checked={noIdentifiableLegalHoldConfirmed} onChange={e => setNoIdentifiableLegalHoldConfirmed(e.target.checked)} /> Legal/business review confirms no unresolved hold requiring identifiable Customer data.</label>
                    <label className="field"><span>Approved retention-basis reference</span><input value={retentionApproval} onChange={e => setRetentionApproval(e.target.value)} placeholder="Evidence reference only; no personal data" /></label>
                    <label className="field"><span>Verified external cleanup reference</span><input value={externalCleanupEvidence} onChange={e => setExternalCleanupEvidence(e.target.value)} placeholder="Owned assets/provider cleanup evidence" /></label>
                    <label className="field"><span>Type DELETE_CUSTOMER_DATA</span><input value={erasureConfirmation} onChange={e => setErasureConfirmation(e.target.value)} /></label>
                    <label className="field"><span>Existing Resend notice ID, only for ambiguous-send reconciliation</span><input value={reconciledNoticeProviderId} onChange={e => setReconciledNoticeProviderId(e.target.value)} /></label>
                  </div> : null}
                  {actionStatuses.map((status) => (
                    <button
                      key={status}
                      className={status === "COMPLETED" || status === "CANCELLED" ? "secondary" : undefined}
                      disabled={actioning || selected.status === status || (selected.accountType === "CUSTOMER" && (selected.erasureVersion !== 1 || status === "CANCELLED"))}
                      onClick={() => void updateStatus(status)}
                    >
                      {label(status)}
                    </button>
                  ))}
                </div>
                <p className="muted">New Customer requests disable account access immediately. COMPLETED requires successful personal-data cleanup and one confirmed notice. Legacy Customer requests need a separately approved remediation plan; deployment does not process them automatically.</p>
              </>
            ) : <p className="muted">Open a request to review blockers and record a status action.</p>}
          </aside>
        </section>
      )}
    </PortalShell>
  );
}
