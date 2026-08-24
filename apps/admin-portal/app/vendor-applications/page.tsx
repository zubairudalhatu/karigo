"use client";

import { useEffect, useState } from "react";
import { managementApi } from "../../src/api/management.api";
import { vendorApplicationsApi, VendorApplication, VendorApplicationTrashFilter } from "../../src/api/vendor-applications.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../src/components/portal";
import { collectionLoadError } from "../../src/lib/collections";
import { friendlyError } from "../../src/lib/errors";

const reviewStatuses = ["UNDER_REVIEW", "CHANGES_REQUESTED", "PROVISIONALLY_APPROVED", "APPROVED", "REJECTED"];
const trashReasons = ["duplicate", "test account", "created in error", "rejected onboarding", "inactive/closed", "other"];

function partnerTypeLabel(application: VendorApplication) {
  const source = [application.businessType, application.catalogueCategory, application.businessCategory].filter(Boolean).join(" ").toUpperCase().replaceAll("_", " ");
  if (source.includes("BOTH") || (source.includes("PRODUCT") && source.includes("SERVICE"))) return "Product Seller and Service Provider";
  if (application.businessCategory === "SME_SERVICES" || source.includes("SERVICE PROVIDER")) return "Service Provider";
  return "Product Seller";
}
function commercialReadiness(application: VendorApplication) {
  const agreement = application.commercialAgreement;
  if (!agreement) return "Blocked: commercial agreement not accepted";
  if (agreement.commercialModel !== "ONBOARDING_FEE") return agreement.commercialModel === "REVIEW_REQUIRED" ? "Blocked: commercial classification required" : "Commercial terms ready";
  if (agreement.onboardingFeeKobo === null || agreement.onboardingFeeKobo === undefined) return "Blocked: onboarding fee not configured";
  if (agreement.onboardingFeeKobo === 0 || agreement.feeWaiver) return agreement.feeWaiver ? "Fee waived by authorized Finance role" : "Explicit zero-fee policy";
  return agreement.onboardingPayments?.some((payment) => payment.status === "SUCCESSFUL") ? "Provider-verified onboarding fee paid" : "Blocked: onboarding fee unpaid";
}


export default function VendorApplicationsPage() {
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [trashFilter, setTrashFilter] = useState<VendorApplicationTrashFilter>("active");
  const [trashInputs, setTrashInputs] = useState<Record<string, { reason: string; note: string }>>({});
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [actioning, setActioning] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(filter: VendorApplicationTrashFilter = trashFilter) {
    setLoading(true);
    setLoadError("");
    try {
      setApplications(await vendorApplicationsApi.list(filter));
    } catch (e) {
      setApplications([]);
      setLoadError(collectionLoadError(e, "vendor applications"));
    } finally {
      setLoading(false);
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
    if (status === "REJECTED" && !notes?.trim()) {
      setError("Rejecting a vendor application requires a reason.");
      return;
    }
    if (!window.confirm(`Save vendor application status ${status.replaceAll("_", " ")}?`)) return;
    try {
      setError("");
      setMessage("");
      setActioning(id);
      await vendorApplicationsApi.review(id, status, notes);
      setMessage(status === "APPROVED"
        ? "Vendor application approved. A vendor account is linked and a password setup link is sent by approved email notification settings."
        : "Vendor application review saved. Storefront publication remains manual.");
      await load();
    } catch (e) {
      setError(friendlyError(e, "form"));
    } finally {
      setActioning("");
    }
  }
  async function waiveOnboardingFee(application: VendorApplication) {
    const agreement = application.commercialAgreement;
    if (!agreement) return;
    const reason = window.prompt("Required waiver reason");
    if (!reason?.trim()) return;
    const note = window.prompt("Required governance note (do not include private payment data)");
    if (!note?.trim()) return;
    if (!window.confirm(`Record an explicit NGN ${((agreement.onboardingFeeKobo ?? 0) / 100).toLocaleString("en-NG")} onboarding fee waiver? This is audited and does not delete the obligation.`)) return;
    try {
      setError(""); setMessage(""); setActioning(application.id);
      await vendorApplicationsApi.waiveOnboardingFee(agreement.id, reason, note);
      setMessage("Authorized onboarding fee waiver recorded with actor, amount, reason and timestamp.");
      await load();
    } catch (e) {
      setError(friendlyError(e, "form"));
    } finally {
      setActioning("");
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
      {loading ? <Loading /> : loadError ? <div className="empty" role="alert"><strong>Vendor applications could not be loaded</strong><span>{loadError}</span><button className="secondary" onClick={() => void load()}>Retry</button></div> : applications.length ? applications.map((application) => <article className="card" key={application.id}>
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
        {application.commercialAgreement ? <div className="notice">
          <strong>Accepted commercial agreement</strong>
          <p>{application.commercialAgreement.publicTitleSnapshot} <Badge>{application.commercialAgreement.commercialModel}</Badge></p>
          <p className="muted">Policy {application.commercialAgreement.policyVersion} · accepted {new Date(application.commercialAgreement.acceptedAt).toLocaleString()}</p>
          <p>{application.commercialAgreement.commercialModel === "COMMISSION" ? `${application.commercialAgreement.commissionRateBasisPoints / 100}% KariGO commission on merchandise subtotal; delivery fee excluded.` : `0% sales/service commission · onboarding fee ${application.commercialAgreement.onboardingFeeKobo === null || application.commercialAgreement.onboardingFeeKobo === undefined ? "FEE NOT CONFIGURED" : `NGN ${(application.commercialAgreement.onboardingFeeKobo / 100).toLocaleString("en-NG")}`}`}</p>
          <p><Badge>{commercialReadiness(application)}</Badge></p>
          {application.commercialAgreement.onboardingPayments?.map((payment) => <p className="muted" key={payment.id}>Payment {payment.transactionReference}: {payment.status}{payment.verifiedAt ? ` · verified ${new Date(payment.verifiedAt).toLocaleString()}` : ""}</p>)}
          {application.commercialAgreement.feeWaiver ? <p className="muted">Waiver: {application.commercialAgreement.feeWaiver.reason} · {new Date(application.commercialAgreement.feeWaiver.waivedAt).toLocaleString()}</p> : null}
          <p className="muted">Activation still independently requires application approval and approved onboarding documents.</p>
        </div> : <p className="notice">Activation blocked: no accepted commercial agreement.</p>}
          {application.commercialAgreement && application.commercialAgreement.commercialModel === "ONBOARDING_FEE" && (application.commercialAgreement.onboardingFeeKobo ?? 0) > 0 && !application.commercialAgreement.feeWaiver && !application.commercialAgreement.onboardingPayments?.some((payment) => payment.status === "SUCCESSFUL") ? <button className="secondary" disabled={actioning === application.id} onClick={() => void waiveOnboardingFee(application)}>Record authorized fee waiver</button> : null}
        {application.documents?.length ? <div className="notice"><strong>Documents</strong>{application.documents.map((document) => <p key={document.id}><a href={document.documentUrl} target="_blank" rel="noreferrer">{document.documentName || document.documentType}</a> <Badge>{document.verificationStatus}</Badge></p>)}</div> : <p className="muted">No application documents supplied yet.</p>}
        {!application.inTrash ? <div className="filters">{reviewStatuses.map((status) => <button key={status} className="secondary" disabled={actioning === application.id || status === application.status} onClick={() => void review(application.id, status)}>{status.replaceAll("_", " ")}</button>)}</div> : null}
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
