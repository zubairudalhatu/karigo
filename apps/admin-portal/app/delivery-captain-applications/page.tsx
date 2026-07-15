"use client";

import { useEffect, useState } from "react";
import {
  deliveryCaptainApplicationsApi,
  DeliveryCaptainApplication,
  DeliveryCaptainApplicationStatus
} from "../../src/api/delivery-captain-applications.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../src/components/portal";
import { friendlyError } from "../../src/lib/errors";

const statusOptions: Array<DeliveryCaptainApplicationStatus | "ALL"> = ["ALL", "SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED", "PROVISIONALLY_APPROVED", "APPROVED", "REJECTED"];
const reviewStatuses: DeliveryCaptainApplicationStatus[] = ["UNDER_REVIEW", "CHANGES_REQUESTED", "PROVISIONALLY_APPROVED", "APPROVED", "REJECTED"];

export default function DeliveryCaptainApplicationsPage() {
  const [applications, setApplications] = useState<DeliveryCaptainApplication[]>([]);
  const [status, setStatus] = useState<DeliveryCaptainApplicationStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setApplications(await deliveryCaptainApplicationsApi.list(status));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [status]);

  async function review(application: DeliveryCaptainApplication, nextStatus: DeliveryCaptainApplicationStatus) {
    const applicantVisibleNote = window.prompt("Applicant-visible note optional") ?? undefined;
    const adminNote = window.prompt("Internal admin note optional") ?? undefined;
    await deliveryCaptainApplicationsApi.review(application.id, { status: nextStatus, applicantVisibleNote, adminNote });
    setMessage("Delivery Captain application review saved. This does not activate login, dispatch or payouts.");
    await load();
  }

  return <PortalShell>
    <h1>Delivery Captain Applications</h1>
    <p className="muted">Review Kano Delivery Captain applications. Approval here is review-only and does not create a Captain account, activate dispatch, payouts or KariGO Rides access.</p>
    {message ? <p className="success">{message}</p> : null}
    <ErrorMessage>{error}</ErrorMessage>
    <div className="filters">
      <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as DeliveryCaptainApplicationStatus | "ALL")}>{statusOptions.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label>
      <button className="secondary" onClick={() => void load()}>Refresh</button>
    </div>
    {loading ? <Loading /> : <section className="section">
      {applications.length ? applications.map((application) => <article className="card" key={application.id}>
        <strong>{application.fullName} - {application.applicationReference}</strong>
        <p className="muted">{application.city}, {application.state}{application.preferredZone ? ` - ${application.preferredZone}` : ""} - submitted {new Date(application.createdAt).toLocaleString()}</p>
        <p>{application.phoneNumber}{application.email ? ` - ${application.email}` : ""}</p>
        <p>{application.vehicleType.replaceAll("_", " ")}{application.vehiclePlateNumber ? ` - ${application.vehiclePlateNumber}` : ""}</p>
        <p>Guarantor: {application.guarantorName} - {application.guarantorPhone}</p>
        {application.riderExperience ? <p className="muted">Experience: {application.riderExperience}</p> : null}
        {application.profilePhotoUrl ? <p><a href={application.profilePhotoUrl} target="_blank" rel="noreferrer">View profile photo</a></p> : null}
        {application.documents?.length ? <div className="notice"><strong>Documents</strong>{application.documents.map((document) => <p key={document.id}><a href={document.documentUrl} target="_blank" rel="noreferrer">{document.documentName || document.documentType}</a> <Badge>{document.verificationStatus}</Badge></p>)}</div> : <p className="muted">No application documents supplied yet.</p>}
        {application.notes ? <p className="muted">Applicant notes: {application.notes}</p> : null}
        {application.applicantVisibleNote ? <p>Applicant note: {application.applicantVisibleNote}</p> : null}
        {application.adminNote ? <p className="muted">Internal note: {application.adminNote}</p> : null}
        <p><Badge>{application.status}</Badge> <span className="muted">{application.deliveryOnly ? "Delivery-only review" : "Review"}</span></p>
        <p className="muted">{application.launchWarning}</p>
        <div className="filters">{reviewStatuses.map((nextStatus) => <button className="secondary" key={nextStatus} onClick={() => void review(application, nextStatus)}>{nextStatus.replaceAll("_", " ")}</button>)}</div>
      </article>) : <Empty>No Delivery Captain applications found.</Empty>}
    </section>}
  </PortalShell>;
}
