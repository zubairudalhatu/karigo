"use client";

import { useEffect, useState } from "react";
import { managementApi } from "../../src/api/management.api";
import { vendorApplicationsApi, VendorApplication, VendorApplicationTrashFilter } from "../../src/api/vendor-applications.api";
import { Badge, Empty, ErrorMessage, PortalShell } from "../../src/components/portal";
import { friendlyError } from "../../src/lib/errors";

const reviewStatuses = ["UNDER_REVIEW", "CHANGES_REQUESTED", "PROVISIONALLY_APPROVED", "APPROVED", "REJECTED"];
const trashReasons = ["duplicate", "test account", "created in error", "rejected onboarding", "inactive/closed", "other"];

function partnerTypeLabel(application: VendorApplication) {
  if (application.businessCategory === "SME_SERVICES") return "Service Provider";
  return "Product Seller / Marketplace Vendor";
}

export default function VendorApplicationsPage() {
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [trashFilter, setTrashFilter] = useState<VendorApplicationTrashFilter>("active");
  const [trashInputs, setTrashInputs] = useState<Record<string, { reason: string; note: string }>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load(filter: VendorApplicationTrashFilter = trashFilter) {
    try {
      setApplications(await vendorApplicationsApi.list(filter));
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  useEffect(() => { void load(trashFilter); }, [trashFilter]);

  function trashInput(applicationId: string) {
    return trashInputs[applicationId] ?? { reason: "duplicate", note: "" };
  }

  function updateTrashInput(applicationId: string, patch: Partial<{ reason: string; note: string }>) {
    setTrashInputs((current) => ({ ...current, [applicationId]: { ...trashInput(applicationId), ...patch } }));
  }

  async function review(id: string, status: string) {
    const notes = window.prompt(`Review note for ${status.toLowerCase().replaceAll("_", " ")}`) ?? undefined;
    try {
      setError("");
      setMessage("");
      await vendorApplicationsApi.review(id, status, notes);
      setMessage(status === "APPROVED"
        ? "Vendor application approved. A vendor account is linked and a password setup link is sent by approved email notification settings."
        : "Vendor application review saved. Storefront publication remains manual.");
      await load();
    } catch (e) {
      setError(friendlyError(e, "form"));
    }
  }

  async function resendActivationLink(application: VendorApplication) {
    if (!application.vendor) return;
    try {
      setError("");
      setMessage("");
      const result = await managementApi.createVendorActivationLink(application.vendor.id);
      setMessage(`Vendor activation link sent. It expires ${new Date(result.expiresAt).toLocaleString()}. ${result.deliveryWarning}`);
      await load();
    } catch (e) {
      setError(friendlyError(e, "form"));
    }
  }

  async function trashApplication(application: VendorApplication) {
    const input = trashInput(application.id);
    try {
      setError("");
      setMessage("");
      await vendorApplicationsApi.trash(application.id, input.reason, input.note || undefined);
      setMessage(`${application.businessName} was moved to Trash.`);
      await load();
    } catch (e) {
      setError(friendlyError(e, "form"));
    }
  }

  async function restoreApplication(application: VendorApplication) {
    const reason = window.prompt("Restore note optional") ?? undefined;
    try {
      setError("");
      setMessage("");
      await vendorApplicationsApi.restore(application.id, reason);
      setMessage(`${application.businessName} was restored from Trash.`);
      await load();
    } catch (e) {
      setError(friendlyError(e, "form"));
    }
  }

  async function permanentlyDeleteApplication(application: VendorApplication) {
    const confirmation = window.prompt(`Type DELETE to permanently delete ${application.businessName}. This is blocked if operational or financial history exists.`);
    if (confirmation !== "DELETE" && confirmation !== "PERMANENTLY DELETE") {
      setError("Permanent delete cancelled. Type DELETE to confirm.");
      return;
    }
    try {
      setError("");
      setMessage("");
      await vendorApplicationsApi.permanentlyDelete(application.id, confirmation);
      setMessage(`${application.businessName} was permanently deleted.`);
      await load();
    } catch (e) {
      setError(friendlyError(e, "form"));
    }
  }

  return <PortalShell>
    <h1>Vendor Applications</h1>
    <p className="muted">Review public partner applications for product sellers, SME service providers and mixed product/service operators. Approval does not automatically publish a storefront, activate payouts, approve promotions or enable pharmacy scope.</p>
    <p className="success">{message}</p>
    <ErrorMessage>{error}</ErrorMessage>
    <div className="filters">
      <label>
        Application view
        <select value={trashFilter} onChange={(event) => setTrashFilter(event.target.value as VendorApplicationTrashFilter)}>
          <option value="active">Active</option>
          <option value="trashed">Trashed</option>
          <option value="all">All</option>
        </select>
      </label>
    </div>
    <section className="section">
      {applications.length ? applications.map((application) => <article className="card" key={application.id}>
        <strong>{application.businessName}</strong>
        <p className="muted">{application.reference} - {application.businessCategory} - {application.city}, {application.state}</p>
        <p className="muted">Partner type: {partnerTypeLabel(application)}</p>
        <p>{application.contactFullName} - {application.contactEmail}</p>
        <p><Badge>{application.status}</Badge> {application.inTrash ? <Badge>TRASHED</Badge> : null}</p>
        {application.inTrash ? <div className="notice">
          <strong>Trash status</strong>
          <p>Reason: {application.trashReason ?? "Not recorded"}</p>
          <p className="muted">Moved to Trash: {application.deletedAt ? new Date(application.deletedAt).toLocaleString() : "Unknown"}</p>
          {application.trashNote ? <p className="muted">Trash note: {application.trashNote}</p> : null}
        </div> : null}
        {application.applicant ? <div className="notice">
          <strong>Applicant account</strong>
          <p>{application.applicant.fullName} - {application.applicant.phoneNumber}</p>
          <p><Badge>{application.applicant.accountStatus}</Badge> <Badge>{application.applicant.phoneVerified ? "PHONE VERIFIED" : "OTP PENDING"}</Badge> <Badge>{application.applicant.onboardingPasswordSetAt ? "PASSWORD CREATED" : "PASSWORD PENDING"}</Badge></p>
        </div> : <p className="muted">No account-first applicant is linked to this application.</p>}
        {application.vendor ? <div className="notice">
          <strong>Linked vendor account</strong>
          <p>{application.vendor.businessName} <Badge>{application.vendor.status}</Badge> <Badge>{application.vendor.user.accountStatus}</Badge></p>
          {application.vendor.activationInvitations?.[0] ? <p className="muted">Latest activation invitation: {application.vendor.activationInvitations[0].status} - expires {new Date(application.vendor.activationInvitations[0].expiresAt).toLocaleString()}</p> : <p className="muted">No activation invitation has been issued yet.</p>}
          {application.vendor.user.accountStatus !== "ACTIVE" ? <button className="secondary" onClick={() => void resendActivationLink(application)}>Send new activation link</button> : null}
        </div> : <p className="muted">No linked vendor account yet. Approving the application creates or links the Vendor account.</p>}
        {application.documents?.length ? <div className="notice"><strong>Documents</strong>{application.documents.map((document) => <p key={document.id}><a href={document.documentUrl} target="_blank" rel="noreferrer">{document.documentName || document.documentType}</a> <Badge>{document.verificationStatus}</Badge></p>)}</div> : <p className="muted">No application documents supplied yet.</p>}
        {!application.inTrash ? <div className="filters">{reviewStatuses.map((status) => <button key={status} className="secondary" onClick={() => void review(application.id, status)}>{status.replaceAll("_", " ")}</button>)}</div> : null}
        {!application.inTrash ? <div className="notice">
          <strong>Trash duplicate/test application</strong>
          <p className="muted">Use Trash for duplicate, test or created-in-error records. This hides the application from the active list while preserving audit history.</p>
          <div className="form-grid">
            <label>Trash reason
              <select value={trashInput(application.id).reason} onChange={(event) => updateTrashInput(application.id, { reason: event.target.value })}>
                {trashReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
              </select>
            </label>
            <label>Trash note optional
              <textarea value={trashInput(application.id).note} onChange={(event) => updateTrashInput(application.id, { note: event.target.value })} placeholder="Example: duplicate live-test application for Samira's Resto Limited." />
            </label>
          </div>
          <button className="secondary" onClick={() => void trashApplication(application)}>Move to Trash</button>
        </div> : <div className="actions">
          <button className="secondary" onClick={() => void restoreApplication(application)}>Restore from Trash</button>
          <button onClick={() => void permanentlyDeleteApplication(application)}>Permanently Delete</button>
        </div>}
      </article>) : <Empty>No vendor applications found.</Empty>}
    </section>
  </PortalShell>;
}
