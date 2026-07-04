"use client";

import { useEffect, useState } from "react";
import { vendorApplicationsApi, VendorApplication } from "../../src/api/vendor-applications.api";
import { Badge, Empty, ErrorMessage, PortalShell } from "../../src/components/portal";
import { friendlyError } from "../../src/lib/errors";

const reviewStatuses = ["UNDER_REVIEW", "CHANGES_REQUESTED", "PROVISIONALLY_APPROVED", "APPROVED", "REJECTED"];

export default function VendorApplicationsPage() {
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setApplications(await vendorApplicationsApi.list());
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  useEffect(() => { void load(); }, []);

  async function review(id: string, status: string) {
    const notes = window.prompt(`Review note for ${status.toLowerCase().replaceAll("_", " ")}`) ?? undefined;
    await vendorApplicationsApi.review(id, status, notes);
    setMessage("Vendor application review saved. Storefront publication remains manual.");
    await load();
  }

  return <PortalShell>
    <h1>Vendor Applications</h1>
    <p className="muted">Review public vendor applications. Approval does not automatically publish a storefront, activate payouts, approve promotions or enable pharmacy scope.</p>
    <p className="success">{message}</p>
    <ErrorMessage>{error}</ErrorMessage>
    <section className="section">
      {applications.length ? applications.map((application) => <article className="card" key={application.id}>
        <strong>{application.businessName}</strong>
        <p className="muted">{application.reference} · {application.businessCategory} · {application.city}, {application.state}</p>
        <p>{application.contactFullName} · {application.contactEmail}</p>
        <p><Badge>{application.status}</Badge></p>
        <div className="filters">{reviewStatuses.map((status) => <button key={status} className="secondary" onClick={() => void review(application.id, status)}>{status.replaceAll("_", " ")}</button>)}</div>
      </article>) : <Empty>No vendor applications found.</Empty>}
    </section>
  </PortalShell>;
}
