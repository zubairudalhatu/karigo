"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

  async function updateLifecycle(rider: AdminRiderSummary, action: "ACTIVATE" | "SUSPEND" | "REACTIVATE") {
    const actionLabel = action === "ACTIVATE" ? "Activate" : action === "SUSPEND" ? "Suspend" : "Reactivate";
    const reason = window.prompt(`${actionLabel} ${rider.user.fullName}? Enter the mandatory reason.`);
    if (!reason?.trim() || reason.trim().length < 5) {
      setError("A reason of at least 5 characters is required.");
      return;
    }
    const warning = action === "ACTIVATE"
      ? "Activation enables Delivery Captain operational access after approved application and document checks. The Captain remains offline until they choose to go online."
      : action === "SUSPEND"
      ? "Suspension blocks Captain app operational access, new assignment acceptance and online status. Completed delivery history is preserved."
      : "Reactivation restores approved Captain access, but the Captain remains offline until they choose to go online.";
    if (!window.confirm(`${warning}\n\nContinue?`)) return;
    try {
      setError("");
      setMessage("");
      setActioning(rider.id);
      await managementApi.updateRiderLifecycle(rider.id, action, reason);
      setMessage(`${rider.user.fullName} ${action === "ACTIVATE" ? "activated" : action === "SUSPEND" ? "suspended" : "reactivated"} with audit reason recorded.`);
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
        <p><Badge>{rider.verificationStatus}</Badge> <Badge>{rider.availabilityStatus}</Badge> <Badge>{rider.user.accountStatus}</Badge> <Badge>{rider.user.loginReady ? "LOGIN READY" : "LOGIN SETUP PENDING"}</Badge></p>
        <div className="notice">
          <strong>Captain modes</strong>
          <p>Delivery application: {rider.deliveryApplication ? <><Badge>{rider.deliveryApplication.status}</Badge> {rider.deliveryApplication.applicationReference}</> : <span className="muted">No Delivery application linked.</span>}</p>
          <p>Delivery profile: <Badge>{rider.verificationStatus}</Badge></p>
          <p>Ride application: {rider.rideApplication ? <><Badge>{rider.rideApplication.status}</Badge> {rider.rideApplication.applicationReference}</> : <span className="muted">No Ride application linked.</span>}</p>
          <p>Ride profile: {rider.rideProfile ? <><Badge>{rider.rideProfile.status}</Badge> {rider.rideProfile.isAvailableForTaxi ? "Available" : "Offline"}</> : <span className="muted">No Ride profile prepared.</span>}</p>
          <p className="muted">Operational modes: {rider.operationalModes?.length ? rider.operationalModes.join(", ") : "None active"}</p>
        </div>
        {rider.verificationStatus === "ACTIVE" ? <p className="notice">Suspending this Captain blocks app operational access and assignment acceptance. Existing delivery history remains available for operations review.</p> : null}
        {rider.verificationStatus === "PENDING_APPROVAL" && rider.deliveryApplication?.status !== "APPROVED" ? <p className="notice">Review the Delivery Captain application before operational activation can be considered.</p> : null}
        {rider.verificationStatus === "PENDING_APPROVAL" && rider.deliveryApplication?.status === "APPROVED" ? <p className="notice">Delivery profile is pending operational activation. Confirm approved documents and account readiness before activation.</p> : null}
        <div className="actions">
          {rider.deliveryApplication ? <Link className="secondary" href="/delivery-captain-applications">Open Delivery application</Link> : null}
          {rider.rideApplication ? <Link className="secondary" href="/taxi">Open Ride application</Link> : null}
          {rider.verificationStatus === "PENDING_APPROVAL" && rider.deliveryApplication?.status === "APPROVED" ? <button disabled={actioning === rider.id} onClick={() => void updateLifecycle(rider, "ACTIVATE")}>Activate Delivery Captain</button> : null}
          {rider.verificationStatus === "ACTIVE" ? <button className="secondary" disabled={actioning === rider.id} onClick={() => void updateLifecycle(rider, "SUSPEND")}>Suspend Captain</button> : null}
          {rider.verificationStatus === "SUSPENDED" ? <button className="secondary" disabled={actioning === rider.id} onClick={() => void updateLifecycle(rider, "REACTIVATE")}>Reactivate Captain</button> : null}
        </div>
      </article>) : <Empty>No captains found.</Empty>}
    </section>
  </PortalShell>;
}
