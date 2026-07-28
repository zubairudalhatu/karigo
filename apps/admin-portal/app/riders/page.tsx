"use client";

import { useEffect, useState } from "react";
import { AdminRiderSummary, managementApi } from "../../src/api/management.api";
import { Badge, Empty, ErrorMessage, PortalShell } from "../../src/components/portal";
import { friendlyError } from "../../src/lib/errors";

export default function RidersPage() {
  const [riders, setRiders] = useState<AdminRiderSummary[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setRiders(await managementApi.riders());
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function updateLifecycle(rider: AdminRiderSummary, action: "SUSPEND" | "REACTIVATE") {
    const reason = window.prompt(`${action === "SUSPEND" ? "Suspend" : "Reactivate"} ${rider.user.fullName}? Enter the mandatory reason.`);
    if (!reason?.trim() || reason.trim().length < 5) {
      setError("A reason of at least 5 characters is required.");
      return;
    }
    const warning = action === "SUSPEND"
      ? "Suspension blocks Captain app operational access, new assignment acceptance and online status. Completed delivery history is preserved."
      : "Reactivation restores approved Captain access, but the Captain remains offline until they choose to go online.";
    if (!window.confirm(`${warning}\n\nContinue?`)) return;
    try {
      setError("");
      setMessage("");
      setActioning(rider.id);
      await managementApi.updateRiderLifecycle(rider.id, action, reason);
      setMessage(`${rider.user.fullName} ${action === "SUSPEND" ? "suspended" : "reactivated"} with audit reason recorded.`);
      await load();
    } catch (e) {
      setError(friendlyError(e, "form"));
    } finally {
      setActioning("");
    }
  }

  return <PortalShell>
    <h1>Captains</h1>
    <p className="muted">Review Delivery Captain operational status. Lifecycle actions require a reason, create Admin audit records, revoke active sessions on suspension, and do not activate payouts or KariGO Rides.</p>
    {message ? <p className="success">{message}</p> : null}
    <ErrorMessage>{error}</ErrorMessage>
    <div className="actions"><button className="secondary" onClick={() => void load()}>{loading ? "Refreshing..." : "Refresh"}</button></div>
    <section className="section">
      {riders.length ? riders.map((rider) => <article className="card" key={rider.id}>
        <strong>{rider.user.fullName}</strong>
        <p className="muted">{rider.riderCode} - {rider.phoneNumber} - {rider.vehicleType ?? "Vehicle not set"}</p>
        <p><Badge>{rider.verificationStatus}</Badge> <Badge>{rider.availabilityStatus}</Badge> <Badge>{rider.user.accountStatus}</Badge></p>
        {rider.verificationStatus === "ACTIVE" ? <p className="notice">Suspending this Captain blocks app operational access and assignment acceptance. Existing delivery history remains available for operations review.</p> : null}
        <div className="actions">
          {rider.verificationStatus === "ACTIVE" ? <button className="secondary" disabled={actioning === rider.id} onClick={() => void updateLifecycle(rider, "SUSPEND")}>Suspend Captain</button> : null}
          {rider.verificationStatus === "SUSPENDED" ? <button className="secondary" disabled={actioning === rider.id} onClick={() => void updateLifecycle(rider, "REACTIVATE")}>Reactivate Captain</button> : null}
        </div>
      </article>) : <Empty>No captains found.</Empty>}
    </section>
  </PortalShell>;
}
