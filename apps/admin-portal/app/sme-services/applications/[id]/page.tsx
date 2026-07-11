"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ServiceProviderApplicationStatus, SmeProviderApplication, smeServicesApi } from "../../../../src/api/sme-services.api";
import { Badge, ErrorMessage, Loading, PortalShell } from "../../../../src/components/portal";
import { friendlyError } from "../../../../src/lib/errors";

const reviewStatuses: ServiceProviderApplicationStatus[] = ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED", "APPROVED", "REJECTED"];

function date(value?: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function SmeProviderApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [application, setApplication] = useState<SmeProviderApplication | null>(null);
  const [status, setStatus] = useState<ServiceProviderApplicationStatus>("UNDER_REVIEW");
  const [reviewNote, setReviewNote] = useState("");
  const [providerNote, setProviderNote] = useState("");
  const [verificationNote, setVerificationNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setError("");
    try {
      const item = await smeServicesApi.providerApplication(id);
      setApplication(item);
      setStatus(item.status === "CONVERTED_TO_PROVIDER" ? "APPROVED" : item.status);
      setReviewNote(item.reviewNote ?? "");
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  useEffect(() => { void load(); }, [id]);

  async function updateStatus() {
    if (!window.confirm("Update this SME Services provider application review status? This does not create provider login, dispatch, payment collection, payout automation or medical booking.")) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await smeServicesApi.updateProviderApplicationStatus(id, status, reviewNote || undefined);
      setApplication(updated);
      setMessage("Service provider application review status updated.");
    } catch (e) {
      setError(friendlyError(e, "form"));
    } finally {
      setSaving(false);
    }
  }

  async function approveCreateProvider() {
    if (!application) return;
    if (application.serviceType === "HEALTH_PROFESSIONAL") {
      setError("Health professional applications remain readiness-only and cannot be converted to live service providers yet.");
      return;
    }
    if (!window.confirm("Create an internal SME Services provider record from this application? This remains manual review only and does not activate live dispatch, payment collection, payout automation or provider login.")) return;
    setConverting(true);
    setError("");
    setMessage("");
    try {
      const updated = await smeServicesApi.approveCreateProviderFromApplication(id, {
        reviewNote: reviewNote || "Approved for internal provider onboarding review.",
        providerNote: providerNote || undefined,
        verificationNote: verificationNote || undefined
      });
      setApplication(updated);
      setMessage("Service provider record has been created from this application.");
    } catch (e) {
      setError(friendlyError(e, "form"));
    } finally {
      setConverting(false);
    }
  }

  if (!application && !error) return <PortalShell><Loading /></PortalShell>;

  return <PortalShell>
    <h1>{application?.applicationReference ?? "SME provider application"}</h1>
    <p className="muted">Review applicant details before any internal provider record is created. Customers never see applicant identification details, private contact notes or review notes from this page.</p>
    <div className="top-actions">
      <Link className="button-link" href="/sme-services/applications">Back to SME Provider Applications</Link>
      <Link className="button-link secondary" href="/sme-services/providers">Provider directory</Link>
    </div>
    <p className="success">{message}</p>
    <ErrorMessage>{error}</ErrorMessage>
    {application ? <div className="detail-grid">
      <section className="section">
        <article className="card">
          <h2>{application.fullName}</h2>
          <p><Badge>{application.status}</Badge> {application.serviceType === "HEALTH_PROFESSIONAL" ? <Badge>Readiness Only</Badge> : null}</p>
          <p>{application.businessName || "Independent provider"} - {application.serviceType.replaceAll("_", " ")}</p>
          <p className="muted">{application.city}, {application.state}</p>
        </article>
        <article className="card">
          <h2>Applicant contact</h2>
          <p><strong>Phone:</strong> {application.phoneNumber}</p>
          <p><strong>Email:</strong> {application.email || "Not provided"}</p>
          <p><strong>Service areas:</strong> {application.serviceAreas.length ? application.serviceAreas.join(", ") : "Not set"}</p>
          <p><strong>Address:</strong> {application.address || "Not provided"}</p>
        </article>
        <article className="card">
          <h2>Experience and readiness</h2>
          <p><strong>Experience:</strong> {application.experienceSummary || "Not provided"}</p>
          <p><strong>Tools / equipment:</strong> {application.toolsOrEquipment || "Not provided"}</p>
          <p><strong>Availability:</strong> {application.availability || "Not provided"}</p>
        </article>
        <article className="card">
          <h2>Verification details</h2>
          <p><strong>Identification type:</strong> {application.identificationType || "Not provided"}</p>
          <p><strong>Identification number:</strong> {application.identificationNumber || "Not provided"}</p>
          <p><strong>Submitted:</strong> {date(application.submittedAt)}</p>
          <p><strong>Reviewed:</strong> {date(application.reviewedAt)}</p>
          <p><strong>Reviewed by:</strong> {application.reviewedByAdmin?.fullName || "Not reviewed"}</p>
        </article>
        {application.convertedProvider ? <article className="card">
          <h2>Converted provider record</h2>
          <p><strong>Provider code:</strong> {application.convertedProvider.providerCode}</p>
          <p><strong>Status:</strong> <Badge>{application.convertedProvider.status}</Badge></p>
          <Link className="button secondary" href={`/sme-services/providers/${application.convertedProvider.id}`}>Open provider record</Link>
        </article> : null}
      </section>
      <aside className="card review-panel">
        <h2>Review application</h2>
        <p className="muted">Status changes do not dispatch providers or collect service payments.</p>
        <label>Status<select value={status} disabled={application.status === "CONVERTED_TO_PROVIDER"} onChange={(e) => setStatus(e.target.value as ServiceProviderApplicationStatus)}>
          {reviewStatuses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
        </select></label>
        <label>Review note<textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Internal review note visible to admin users only." /></label>
        <button disabled={saving || application.status === "CONVERTED_TO_PROVIDER"} onClick={() => void updateStatus()}>{saving ? "Saving..." : "Update review status"}</button>
        <hr />
        <h2>Approve and create provider record</h2>
        <p className="muted">This creates a pending internal provider record for manual onboarding review only. It does not create provider login, live dispatch, payment collection, payout automation or medical booking.</p>
        <label>Provider note<textarea value={providerNote} onChange={(e) => setProviderNote(e.target.value)} placeholder="Internal provider directory note." /></label>
        <label>Verification note<textarea value={verificationNote} onChange={(e) => setVerificationNote(e.target.value)} placeholder="ID, service and readiness checks completed." /></label>
        {application.serviceType === "HEALTH_PROFESSIONAL" ? <p className="muted">Health professional applications remain readiness-only until future legal, compliance and operations approval.</p> : null}
        <button
          disabled={converting || application.status === "CONVERTED_TO_PROVIDER" || application.status === "REJECTED" || application.serviceType === "HEALTH_PROFESSIONAL"}
          onClick={() => void approveCreateProvider()}
        >
          {converting ? "Creating..." : "Create provider record"}
        </button>
      </aside>
    </div> : null}
  </PortalShell>;
}
