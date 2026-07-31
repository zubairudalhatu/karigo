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
  const [actioning, setActioning] = useState("");

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
    if (nextStatus === "REJECTED" && !applicantVisibleNote?.trim() && !adminNote?.trim()) {
      setError("Rejecting a Delivery Captain application requires an applicant-visible or internal reason.");
      return;
    }
    if (!window.confirm(`Save ${nextStatus.replaceAll("_", " ")} for ${application.fullName}?`)) return;
    try {
      setError("");
      setMessage("");
      setActioning(application.id);
      await deliveryCaptainApplicationsApi.review(application.id, { status: nextStatus, applicantVisibleNote, adminNote });
      setMessage(nextStatus === "APPROVED"
        ? "Delivery Captain review saved. If the account-first applicant is verified, the linked Captain account can be activated for approved login. Dispatch and payouts remain controlled separately."
        : "Delivery Captain application review saved.");
      await load();
    } catch (e) {
      setError(friendlyError(e, "form"));
    } finally {
      setActioning("");
    }
  }

  async function openSecureDocument(application: DeliveryCaptainApplication, documentId: string) {
    try {
      setError("");
      const result = await deliveryCaptainApplicationsApi.documentView(application.id, documentId);
      window.open(result.viewUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(friendlyError(e, "form"));
    }
  }

  return <PortalShell>
    <h1>Delivery Captain Applications</h1>
    <p className="muted">Review Kano and Abuja Delivery Captain applications. Account-first applications show OTP and password readiness before approval. Approval does not activate payouts or KariGO Rides access.</p>
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
        <div className="notice">
          <strong>Residential location</strong>
          <p>{application.residentialLocation?.label || `${application.city}, ${application.state}`}</p>
          <strong>Operating areas</strong>
          {application.operatingAreas?.length ? application.operatingAreas.map((area) => <p key={area.label}>{area.label}</p>) : <p className="muted">No operating areas recorded.</p>}
          <p className="muted">Primary: {application.primaryOperatingArea?.label || "Not recorded"}</p>
        </div>
        <p>{application.phoneNumber}{application.email ? ` - ${application.email}` : ""}</p>
        <p>{application.vehicleType.replaceAll("_", " ")}{application.vehiclePlateNumber ? ` - ${application.vehiclePlateNumber}` : ""}</p>
        {application.driverLicenceNumber ? <p className="muted">Licence: {application.driverLicenceNumber}</p> : null}
        {application.applicantAccount ? <div className="notice">
          <strong>Applicant account</strong>
          <p><Badge>{application.applicantAccount.accountStatus}</Badge> <Badge>{application.applicantAccount.phoneVerified ? "PHONE VERIFIED" : "OTP PENDING"}</Badge> <Badge>{application.applicantAccount.passwordCreated ? "PASSWORD CREATED" : "PASSWORD PENDING"}</Badge></p>
          {application.applicantAccount.riderProfile ? <p className="muted">Captain profile: {application.applicantAccount.riderProfile.riderCode} - {application.applicantAccount.riderProfile.verificationStatus}</p> : <p className="muted">Captain profile will be created on approved account activation.</p>}
        </div> : <p className="muted">No account-first applicant is linked to this application.</p>}
        <p>Guarantor: {application.guarantorName} - {application.guarantorPhone}</p>
        {application.riderExperience ? <p className="muted">Experience: {application.riderExperience}</p> : null}
        {application.profilePhotoUrl ? <p><a href={application.profilePhotoUrl} target="_blank" rel="noreferrer">View profile photo</a></p> : null}
        {application.captainDocuments?.length ? <div className="notice"><strong>Secure uploaded documents</strong>{application.captainDocuments.map((document) => <p key={document.id}>
          <button className="secondary" onClick={() => void openSecureDocument(application, document.id)}>View secure file</button>{" "}
          {document.originalFileName} <Badge>{document.required ? "REQUIRED" : "OPTIONAL"}</Badge> <Badge>{document.reviewStatus}</Badge>
        </p>)}</div> : null}
        {application.documents?.length ? <div className="notice"><strong>Legacy document links</strong>{application.documents.map((document) => <p key={document.id}><a href={document.documentUrl} target="_blank" rel="noreferrer">{document.documentName || document.documentType}</a> <Badge>{document.verificationStatus}</Badge></p>)}</div> : null}
        {!application.documents?.length && !application.captainDocuments?.length ? <p className="muted">No application documents supplied yet.</p> : null}
        {application.notes ? <p className="muted">Applicant notes: {application.notes}</p> : null}
        {application.applicantVisibleNote ? <p>Applicant note: {application.applicantVisibleNote}</p> : null}
        {application.adminNote ? <p className="muted">Internal note: {application.adminNote}</p> : null}
        <p><Badge>{application.status}</Badge> <span className="muted">{application.deliveryOnly ? "Delivery-only review" : "Review"}</span></p>
        <p className="muted">{application.launchWarning}</p>
        <div className="filters">{reviewStatuses.map((nextStatus) => <button className="secondary" disabled={actioning === application.id || nextStatus === application.status} key={nextStatus} onClick={() => void review(application, nextStatus)}>{nextStatus.replaceAll("_", " ")}</button>)}</div>
      </article>) : <Empty>No Delivery Captain applications found.</Empty>}
    </section>}
  </PortalShell>;
}
