"use client";

import { FormEvent, useEffect, useState } from "react";
import { DashboardShell, Empty, ErrorMessage, Loading, StatusBadge } from "../../src/components/dashboard";
import { payoutAccountApi, PayoutAccountPayload, VendorPayoutAccount } from "../../src/api/payout-account.api";
import { friendlyError } from "../../src/lib/errors";

const initialForm: PayoutAccountPayload = {
  accountName: "",
  bankName: "",
  bankCode: "",
  accountNumber: "",
  confirmAccountNumber: ""
};

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString() : "Not yet";

function AccountSummary({ account, onEdit }: { account: VendorPayoutAccount; onEdit: () => void }) {
  const isVerified = account.status === "VERIFIED";
  const needsCorrection = account.status === "REJECTED" || account.status === "NEEDS_UPDATE";

  return (
    <article className="card payout-card">
      <div className="settlement-main">
        <div>
          <p className="muted">Payout account</p>
          <h2>{account.bankName}</h2>
          <p>{account.accountName}</p>
          <p className="muted">{account.maskedAccountNumber}{account.bankCode ? ` · ${account.bankCode}` : ""}</p>
        </div>
        <StatusBadge>{account.status}</StatusBadge>
      </div>
      {isVerified ? <p className="success">Verified on {formatDate(account.verifiedAt)}. This account is ready for future settlements.</p> : null}
      {account.status === "PENDING_VERIFICATION" ? <p className="notice">KariGO is reviewing your payout account details.</p> : null}
      {needsCorrection && account.vendorVisibleNote ? <p className="error">{account.vendorVisibleNote}</p> : null}
      <div className="settlement-meta">
        <span>Submitted: {formatDate(account.submittedAt)}</span>
        <span>Last updated: {formatDate(account.lastUpdatedAt)}</span>
        <span>Verified: {formatDate(account.verifiedAt)}</span>
      </div>
      <button onClick={onEdit}>{isVerified ? "Update payout account" : "Update details"}</button>
    </article>
  );
}

export default function PayoutAccountPage() {
  const [account, setAccount] = useState<VendorPayoutAccount | null>(null);
  const [form, setForm] = useState<PayoutAccountPayload>(initialForm);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    payoutAccountApi.get()
      .then((next) => {
        setAccount(next);
        if (!next) setEditing(true);
      })
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  function startEdit() {
    setForm({
      accountName: account?.accountName ?? "",
      bankName: account?.bankName ?? "",
      bankCode: account?.bankCode ?? "",
      accountNumber: "",
      confirmAccountNumber: ""
    });
    setMessage("");
    setEditing(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const saved = account ? await payoutAccountApi.update(form) : await payoutAccountApi.create(form);
      setAccount(saved);
      setEditing(false);
      setForm(initialForm);
      setMessage("Payout account submitted for verification.");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell>
      <header className="topbar">
        <div>
          <p className="muted">Settlement readiness</p>
          <h1>Payout account</h1>
        </div>
        <button className="secondary" onClick={load} disabled={loading}>Retry</button>
      </header>

      <p className="muted">Add the bank account KariGO should use for future settlement payments. Verification does not send money and does not create a cash-out action.</p>
      <p className="success">{message}</p>
      <ErrorMessage>{error}</ErrorMessage>

      {loading ? <Loading /> : (
        <section className="section">
          {!account && !editing ? (
            <Empty>No payout account yet. Add the bank account KariGO should use for future settlement payments.</Empty>
          ) : null}

          {account && !editing ? <AccountSummary account={account} onEdit={startEdit} /> : null}

          {editing ? (
            <form className="card payout-form" onSubmit={submit}>
              <h2>{account ? "Update payout account" : "Set up your payout account"}</h2>
              <p className="muted">Creating or changing details sends the account back to pending verification.</p>
              <label>Account name<input value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} required maxLength={120} /></label>
              <label>Bank name<input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} required maxLength={120} /></label>
              <label>Bank code optional<input value={form.bankCode} onChange={(e) => setForm({ ...form, bankCode: e.target.value })} maxLength={30} /></label>
              <label>Account number<input inputMode="numeric" pattern="[0-9]{10}" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} required /></label>
              <label>Confirm account number<input inputMode="numeric" pattern="[0-9]{10}" value={form.confirmAccountNumber} onChange={(e) => setForm({ ...form, confirmAccountNumber: e.target.value })} required /></label>
              <div className="actions">
                <button disabled={saving}>{saving ? "Submitting..." : account ? "Submit updated details" : "Add payout account"}</button>
                {account ? <button type="button" className="secondary" onClick={() => setEditing(false)} disabled={saving}>Cancel</button> : null}
              </div>
            </form>
          ) : null}
        </section>
      )}
    </DashboardShell>
  );
}
