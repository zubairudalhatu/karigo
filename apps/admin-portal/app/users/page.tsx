"use client";

import { useEffect, useState } from "react";
import { AdminUserSummary, managementApi } from "../../src/api/management.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../src/components/portal";
import { collectionLoadError } from "../../src/lib/collections";
import { friendlyError } from "../../src/lib/errors";

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState("");

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      setUsers(await managementApi.users());
    } catch (e) {
      setUsers([]);
      setLoadError(collectionLoadError(e, "users"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function updateCustomerLifecycle(user: AdminUserSummary, action: "SUSPEND" | "REACTIVATE") {
    const reason = window.prompt(`${action === "SUSPEND" ? "Suspend" : "Reactivate"} ${user.fullName}? Enter the mandatory reason.`);
    if (!reason?.trim() || reason.trim().length < 5) {
      setError("A reason of at least 5 characters is required.");
      return;
    }
    const warning = action === "SUSPEND"
      ? "Suspension blocks authenticated ordering, rides, utilities and financial actions. Order, wallet and support history is preserved."
      : "Reactivation restores the Customer account to approved active access.";
    if (!window.confirm(`${warning}\n\nContinue?`)) return;
    try {
      setError("");
      setMessage("");
      setActioning(user.id);
      await managementApi.updateCustomerLifecycle(user.id, action, reason);
      setMessage(`${user.fullName} ${action === "SUSPEND" ? "suspended" : "reactivated"} with audit reason recorded.`);
      await load();
    } catch (e) {
      setError(friendlyError(e, "form"));
    } finally {
      setActioning("");
    }
  }

  return <PortalShell>
    <h1>Users</h1>
    <p className="muted">Customer account lifecycle controls are audited and reason-required. This page does not add Customer approval; it only supports suspension and reactivation for relevant Customer accounts.</p>
    {message ? <p className="success">{message}</p> : null}
    <ErrorMessage>{error}</ErrorMessage>
    <div className="actions"><button className="secondary" onClick={() => void load()}>{loading ? "Refreshing..." : "Refresh"}</button></div>
    <section className="section">
      {loading ? <Loading /> : loadError ? <div className="empty" role="alert"><strong>Users could not be loaded</strong><span>{loadError}</span><button className="secondary" onClick={() => void load()}>Retry</button></div> : users.length ? users.map((user) => <article className="card" key={user.id}>
        <strong>{user.fullName}</strong>
        <p className="muted">{user.phoneNumber} - {user.email ?? "No email recorded"}</p>
        <p><Badge>{user.role}</Badge> {user.adminRole ? <Badge>{user.adminRole}</Badge> : null} <Badge>{user.accountStatus}</Badge></p>
        {user.role === "CUSTOMER" && user.accountStatus === "ACTIVE" ? <p className="notice">Suspending this Customer blocks new authenticated service usage while preserving order, wallet, utility and support history.</p> : null}
        <div className="actions">
          {user.role === "CUSTOMER" && user.accountStatus === "ACTIVE" ? <button className="secondary" disabled={actioning === user.id} onClick={() => void updateCustomerLifecycle(user, "SUSPEND")}>Suspend Customer</button> : null}
          {user.role === "CUSTOMER" && user.accountStatus === "SUSPENDED" ? <button className="secondary" disabled={actioning === user.id} onClick={() => void updateCustomerLifecycle(user, "REACTIVATE")}>Reactivate Customer</button> : null}
        </div>
      </article>) : <Empty>No users found.</Empty>}
    </section>
  </PortalShell>;
}
