"use client";

import { useEffect, useState } from "react";
import { taxiApi, AdminTaxiDriverApplication, EligibleRideCaptain, RideCaptainFinanceSummary, RideCommissionPaymentHistory, RideFinanceSettlement, RideFinanceSummary } from "../../src/api/taxi.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../src/components/portal";
import { useAuth } from "../../src/contexts/auth-context";
import { friendlyError } from "../../src/lib/errors";
import { formatKobo, TaxiApplicationStatus, TaxiDriverProfile, TaxiDriverProfileStatus, TaxiRidePricingDefaults, TaxiTrip, TaxiWaitlistEntry, TaxiWaitlistStatus } from "@karigo/shared-types";

const applicationStatuses: Array<TaxiApplicationStatus | "ALL"> = ["ALL", "SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED", "PROVISIONALLY_APPROVED", "APPROVED", "REJECTED"];
const reviewStatuses: TaxiApplicationStatus[] = ["UNDER_REVIEW", "CHANGES_REQUESTED", "PROVISIONALLY_APPROVED", "APPROVED", "REJECTED"];
const waitlistStatuses: Array<TaxiWaitlistStatus | "ALL"> = ["ALL", "SUBMITTED", "CONTACTED", "INTERESTED", "NOT_INTERESTED", "CONVERTED"];
const profileStatuses: TaxiDriverProfileStatus[] = ["PENDING_ACTIVATION", "ACTIVE", "SUSPENDED", "DEACTIVATED"];

type Tab = "applications" | "waitlist" | "profiles" | "trips" | "finance" | "trash" | "summary";
const tabLabels: Record<Tab, string> = {
  applications: "Ride Applications",
  waitlist: "Customer Waitlist",
  profiles: "Ride Captain Profiles",
  trips: "Ride Dispatch",
  finance: "Ride Finance",
  trash: "Application Trash",
  summary: "Ride Summary"
};

type RideSummary = {
  driverProfiles: number;
  availableDrivers: number;
  requestedTrips: number;
  activeTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  pricingDefaults: TaxiRidePricingDefaults;
  launchNotice?: string;
  testModeNotice?: string;
};
function nairaInputToKobo(value: string) {
  const normalized = value.trim().replaceAll(",", "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const kobo = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(kobo) && kobo > 0 ? kobo : null;
}


export default function AdminTaxiPage() {
  const { user } = useAuth();
  const canManualFinanceOverride = user?.adminRole === "SUPER_ADMIN" || user?.adminRole === "FINANCE_OFFICER";
  const [activeTab, setActiveTab] = useState<Tab>("applications");
  const [applicationStatus, setApplicationStatus] = useState<TaxiApplicationStatus | "ALL">("ALL");
  const [waitlistStatus, setWaitlistStatus] = useState<TaxiWaitlistStatus | "ALL">("ALL");
  const [applications, setApplications] = useState<AdminTaxiDriverApplication[]>([]);
  const [waitlist, setWaitlist] = useState<TaxiWaitlistEntry[]>([]);
  const [profiles, setProfiles] = useState<TaxiDriverProfile[]>([]);
  const [trips, setTrips] = useState<TaxiTrip[]>([]);
  const [trashedApplications, setTrashedApplications] = useState<AdminTaxiDriverApplication[]>([]);
  const [eligibleByTrip, setEligibleByTrip] = useState<Record<string, EligibleRideCaptain[]>>({});
  const [summary, setSummary] = useState<RideSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [financeSummary, setFinanceSummary] = useState<RideFinanceSummary | null>(null);
  const [financeSettlements, setFinanceSettlements] = useState<RideFinanceSettlement[]>([]);
  const [financeCaptains, setFinanceCaptains] = useState<RideCaptainFinanceSummary[]>([]);
  const [commissionPayments, setCommissionPayments] = useState<RideCommissionPaymentHistory[]>([]);
  const [financeDateFrom, setFinanceDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [financeDateTo, setFinanceDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [actioning, setActioning] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [applicationData, waitlistData, profileData, tripData, trashData, summaryData, financeSummaryData, settlementData, captainFinanceData, commissionPaymentData] = await Promise.all([
        taxiApi.driverApplications(applicationStatus),
        taxiApi.waitlist(waitlistStatus),
        taxiApi.driverProfiles().catch(() => []),
        taxiApi.trips().catch(() => []),
        taxiApi.driverApplicationsTrash().catch(() => []),
        taxiApi.summary().catch(() => null),
        taxiApi.financeSummary(financeDateFrom, financeDateTo).catch(() => null),
        taxiApi.financeSettlements(financeDateFrom, financeDateTo).catch(() => []),
        taxiApi.financeCaptains(financeDateFrom, financeDateTo).catch(() => []),
        taxiApi.commissionPaymentHistory().catch(() => [])
      ]);
      setApplications(applicationData);
      setWaitlist(waitlistData);
      setProfiles(profileData);
      setTrips(tripData);
      setTrashedApplications(trashData);
      setSummary(summaryData);
      setFinanceSummary(financeSummaryData);
      setFinanceSettlements(settlementData);
      setFinanceCaptains(captainFinanceData);
      setCommissionPayments(commissionPaymentData);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [applicationStatus, waitlistStatus, financeDateFrom, financeDateTo]);

  async function reviewApplication(id: string, status: TaxiApplicationStatus) {
    const applicantVisibleNote = window.prompt("Applicant-visible note optional") ?? undefined;
    const adminNote = window.prompt("Internal admin note optional") ?? undefined;
    if (!window.confirm(`Save ${status.replaceAll("_", " ")} for this Ride Captain application?`)) return;
    try {
      setError("");
      setMessage("");
      setActioning(id);
      await taxiApi.reviewDriverApplication(id, { status, applicantVisibleNote, adminNote });
      setMessage(status === "APPROVED"
        ? "Ride application review saved. Prepare or activate a Ride Captain profile before assigning Ride requests."
        : "Ride application review saved. This does not activate automatic dispatch, ride payment or payouts.");
      await load();
    } catch (e) {
      setError(friendlyError(e, "form"));
    } finally {
      setActioning("");
    }
  }

  async function openSecureApplicationDocument(application: AdminTaxiDriverApplication, documentId: string) {
    try {
      setError("");
      const result = await taxiApi.driverApplicationDocumentView(application.id, documentId);
      window.open(result.viewUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(friendlyError(e, "form"));
    }
  }

  async function reviewSecureApplicationDocument(application: AdminTaxiDriverApplication, documentId: string, status: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED") {
    const applicantVisibleNote = status === "APPROVED" ? undefined : (window.prompt("Applicant-visible note or requested change") ?? undefined);
    const adminNote = window.prompt("Internal admin note optional") ?? undefined;
    if ((status === "CHANGES_REQUESTED" || status === "REJECTED") && !applicantVisibleNote?.trim() && !adminNote?.trim()) {
      setError("Requesting changes or rejecting a document requires an applicant-visible or internal reason.");
      return;
    }
    if (!window.confirm(`${status.replaceAll("_", " ")} this secure Ride Captain document for ${application.fullName}?`)) return;
    try {
      setError("");
      setMessage("");
      setActioning(documentId);
      await taxiApi.reviewDriverApplicationDocument(application.id, documentId, { status, applicantVisibleNote, adminNote });
      setMessage("Ride Captain document review saved.");
      await load();
    } catch (e) {
      setError(friendlyError(e, "form"));
    } finally {
      setActioning("");
    }
  }

  async function approveRequiredApplicationDocuments(application: AdminTaxiDriverApplication) {
    const requiredCount = application.captainDocuments?.filter((document) => document.required).length ?? 0;
    if (!requiredCount) {
      setError("No uploaded required secure documents are available to approve.");
      return;
    }
    if (!window.confirm(`Approve ${requiredCount} uploaded required secure document${requiredCount === 1 ? "" : "s"} for ${application.fullName}? Review each file first.`)) return;
    try {
      setError("");
      setMessage("");
      setActioning(`${application.id}:required-documents`);
      await taxiApi.approveRequiredDriverApplicationDocuments(application.id);
      setMessage("Required Ride Captain documents approved. Ride profile activation remains a separate action.");
      await load();
    } catch (e) {
      setError(friendlyError(e, "form"));
    } finally {
      setActioning("");
    }
  }

  async function createProfile(applicationId: string) {
    if (!window.confirm("Prepare a Ride Captain profile from this approved application?")) return;
    await taxiApi.createProfileFromApplication(applicationId);
    setMessage("Ride Captain profile prepared. Set profile status to ACTIVE before assigning Ride requests.");
    await load();
  }

  async function moveApplicationToTrash(application: AdminTaxiDriverApplication) {
    const reason = window.prompt("Trash reason for this rejected Ride application") ?? "";
    if (reason.trim().length < 5) {
      setError("Moving a rejected Ride application to Trash requires a clear reason.");
      return;
    }
    if (!window.confirm(`Move ${application.fullName}'s rejected Ride application to Trash?`)) return;
    try {
      setError("");
      setMessage("");
      setActioning(`${application.id}:trash`);
      await taxiApi.trashDriverApplication(application.id, reason.trim());
      setMessage("Rejected Ride application moved to Trash. The KariGO account was not deleted.");
      await load();
    } catch (e) {
      setError(friendlyError(e, "form"));
    } finally {
      setActioning("");
    }
  }

  async function restoreApplication(application: AdminTaxiDriverApplication) {
    const reason = window.prompt("Restore reason") ?? "";
    if (reason.trim().length < 5) {
      setError("Restoring a Ride application requires a clear reason.");
      return;
    }
    if (!window.confirm(`Restore ${application.fullName}'s Ride application from Trash?`)) return;
    try {
      setError("");
      setMessage("");
      setActioning(`${application.id}:restore`);
      await taxiApi.restoreDriverApplication(application.id, reason.trim());
      setMessage("Ride application restored from Trash.");
      await load();
    } catch (e) {
      setError(friendlyError(e, "form"));
    } finally {
      setActioning("");
    }
  }

  async function updateProfile(profileId: string, status: TaxiDriverProfileStatus) {
    await taxiApi.updateProfileStatus(profileId, { status });
    setMessage("Ride Captain profile status updated.");
    await load();
  }

  async function updateWaitlistStatus(id: string, status: TaxiWaitlistStatus) {
    const note = window.prompt("Internal follow-up note optional") ?? undefined;
    await taxiApi.updateWaitlistStatus(id, { status, note });
    setMessage("Ride waitlist status updated.");
    await load();
  }

  async function loadEligibleCaptains(tripId: string) {
    try {
      setError("");
      setActioning(`${tripId}:eligible`);
      const candidates = await taxiApi.eligibleDrivers(tripId);
      setEligibleByTrip((current) => ({ ...current, [tripId]: candidates }));
      if (!candidates.length) setMessage("No Ride Captains are currently eligible for this request.");
    } catch (e) {
      setError(friendlyError(e, "form"));
    } finally {
      setActioning("");
    }
  }

  async function assignDriver(tripId: string, suggestedProfileId?: string) {
    const driverProfileId = suggestedProfileId ?? window.prompt("Ride Captain profile ID to assign") ?? "";
    if (!driverProfileId) return;
    await taxiApi.assignDriver(tripId, driverProfileId);
    setMessage("Ride Captain assigned.");
    await load();
  }

  async function cancelTrip(tripId: string) {
    const reason = window.prompt("Cancellation reason") ?? "Admin cancelled Ride request";
    await taxiApi.cancelTrip(tripId, reason);
    setMessage("Ride request cancelled.");
    await load();
  }

  async function retryReceiptEmail(tripId: string) {
    if (!window.confirm("Retry this failed Ride receipt email? A successful delivery cannot be retried.")) return;
    setActioning(`${tripId}:receipt-email`);
    setError("");
    try {
      await taxiApi.retryReceiptEmail(tripId);
      setMessage("Ride receipt email retry requested.");
      await load();
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setActioning("");
    }
  }
  async function runFinanceAction(key: string, success: string, action: () => Promise<unknown>) {
    if (actioning) return;
    setActioning(key);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(success);
      await load();
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setActioning("");
    }
  }

  async function recordCommissionRemittance(captain: RideCaptainFinanceSummary) {
    const amountKobo = nairaInputToKobo(window.prompt(`Amount remitted by ${captain.captainName} in naira`) ?? "");
    if (!amountKobo) return setError("Enter a valid positive remittance amount with at most two decimal places.");
    const reference = window.prompt("Unique bank/cash remittance reference")?.trim();
    const method = window.prompt("Method (for example BANK_TRANSFER or CASH)", "BANK_TRANSFER")?.trim();
    const reason = window.prompt("Required exceptional override reason")?.trim();
    const note = window.prompt("Finance note (optional)")?.trim();
    if (!reference || !method || !reason || reason.length < 5) return setError("Evidence reference, method and a clear exceptional override reason are required.");
    if (!window.confirm(`Manual finance override: record ${formatKobo(amountKobo)} against ${captain.captainName}'s KariGO commission balance? Confirm the external evidence before continuing.`)) return;
    await runFinanceAction(`remittance:${captain.driverProfileId}`, "Manual finance override recorded and allocated to the oldest undisputed Ride balances.", () => taxiApi.recordCommissionRemittance({ driverProfileId: captain.driverProfileId, amountKobo, reference, method, reason, note }));
  }

  async function approveCashRefund(settlement: RideFinanceSettlement) {
    const amountKobo = nairaInputToKobo(window.prompt(`Cash refund amount for ${settlement.tripReference} in naira`) ?? "");
    if (!amountKobo) return setError("Enter a valid positive refund amount with at most two decimal places.");
    const reason = window.prompt("Refund reason (required)")?.trim();
    if (!reason || reason.length < 5) return setError("A clear refund reason is required.");
    if (!window.confirm(`Approve ${formatKobo(amountKobo)} as a Cash refund obligation? No gateway refund will run. Responsibility will remain under Finance review until allocated.`)) return;
    await runFinanceAction(`refund:${settlement.tripId}`, "Cash refund approved. The Customer can now see that the refund is pending.", () => taxiApi.approveCashRefund(settlement.tripId, { amountKobo, reason, idempotencyKey: `admin-cash-refund:${settlement.tripId}:${Date.now()}` }));
  }

  async function settleCashRefund(refundId: string) {
    const reference = window.prompt("Customer refund confirmation/reference")?.trim();
    const method = window.prompt("How did the Customer receive the Cash refund?", "CASH")?.trim();
    const note = window.prompt("Confirmation note (optional)")?.trim();
    if (!reference || !method) return setError("A refund confirmation reference and method are required.");
    if (!window.confirm("Confirm that the Customer actually received this refund? This does not contact a payment gateway.")) return;
    await runFinanceAction(`refund-settle:${refundId}`, "Cash refund marked as received by the Customer.", () => taxiApi.settleCashRefund(refundId, { reference, method, note }));
  }

  async function allocateRefund(refund: RideFinanceSettlement["refunds"][number]) {
    const responsibility = window.prompt("Responsibility: PLATFORM, CAPTAIN or SHARED")?.trim().toUpperCase();
    if (responsibility !== "PLATFORM" && responsibility !== "CAPTAIN" && responsibility !== "SHARED") return setError("Choose PLATFORM, CAPTAIN or SHARED.");
    const resolutionNote = window.prompt("Finance allocation resolution note")?.trim();
    if (!resolutionNote || resolutionNote.length < 5) return setError("A clear allocation resolution note is required.");
    let platformResponsibilityKobo: number | undefined;
    let captainResponsibilityKobo: number | undefined;
    if (responsibility === "SHARED") {
      platformResponsibilityKobo = nairaInputToKobo(window.prompt("Platform responsibility in naira") ?? "") ?? undefined;
      captainResponsibilityKobo = nairaInputToKobo(window.prompt("Captain responsibility in naira") ?? "") ?? undefined;
      if (!platformResponsibilityKobo || !captainResponsibilityKobo || platformResponsibilityKobo + captainResponsibilityKobo !== refund.amountKobo) return setError("Shared allocations must be positive and equal the full refund amount.");
    }
    if (!window.confirm(`Allocate this refund to ${responsibility}? The original Ride receipt remains unchanged.`)) return;
    await runFinanceAction(`refund-allocation:${refund.id}`, "Refund responsibility allocated.", () => taxiApi.allocateRefundResponsibility(refund.id, { responsibility, platformResponsibilityKobo, captainResponsibilityKobo, resolutionNote }));
  }

  async function createAdjustment(settlement: RideFinanceSettlement) {
    const amountKobo = nairaInputToKobo(window.prompt("Adjustment amount in naira") ?? "");
    const direction = window.prompt("Direction: CREDIT or DEBIT")?.trim().toUpperCase();
    const target = window.prompt("Target: PLATFORM_RECEIVABLE or CAPTAIN_EARNING")?.trim().toUpperCase();
    const responsibility = window.prompt("Responsibility: PLATFORM, CAPTAIN, SHARED or REVIEW_REQUIRED", "REVIEW_REQUIRED")?.trim().toUpperCase();
    const reason = window.prompt("Adjustment reason")?.trim();
    const note = window.prompt("Finance note (optional)")?.trim();
    if (!amountKobo || (direction !== "CREDIT" && direction !== "DEBIT") || (target !== "PLATFORM_RECEIVABLE" && target !== "CAPTAIN_EARNING") || !["PLATFORM", "CAPTAIN", "SHARED", "REVIEW_REQUIRED"].includes(responsibility ?? "") || !reason || reason.length < 5) return setError("Complete all adjustment fields with valid controlled values.");
    if (!window.confirm(`Create an immutable ${direction} adjustment of ${formatKobo(amountKobo)} for ${settlement.tripReference}?`)) return;
    await runFinanceAction(`adjustment:${settlement.tripId}`, "Financial adjustment recorded.", () => taxiApi.createFinancialAdjustment(settlement.tripId, { amountKobo, direction, target, responsibility: responsibility as "PLATFORM" | "CAPTAIN" | "SHARED" | "REVIEW_REQUIRED", idempotencyKey: `admin-ride-adjustment:${settlement.tripId}:${Date.now()}`, reason, note }));
  }

  async function openFinancialDispute(settlement: RideFinanceSettlement) {
    const reason = window.prompt("Financial review reason")?.trim();
    const note = window.prompt("Internal review note (optional)")?.trim();
    if (!reason || reason.length < 5) return setError("A clear financial review reason is required.");
    if (!window.confirm(`Place ${settlement.tripReference} into financial review? Remittance will not be applied while disputed.`)) return;
    await runFinanceAction(`dispute:${settlement.tripId}`, "Ride settlement placed into financial review.", () => taxiApi.openFinancialDispute(settlement.tripId, reason, note));
  }

  async function resolveFinancialDispute(settlement: RideFinanceSettlement) {
    const note = window.prompt("Required financial resolution note")?.trim();
    if (!note || note.length < 5) return setError("A clear resolution note is required.");
    if (!window.confirm(`Resolve financial review for ${settlement.tripReference}? Unallocated refund responsibility will block this action.`)) return;
    await runFinanceAction(`dispute-resolve:${settlement.tripId}`, "Financial review resolved.", () => taxiApi.resolveFinancialDispute(settlement.tripId, note));
  }

  async function exportFinanceCsv() {
    setActioning("finance-export");
    setError("");
    try {
      const result = await taxiApi.financeExport(financeDateFrom, financeDateTo);
      const url = URL.createObjectURL(new Blob([result.csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage("Ride finance CSV exported without GPS, PIN or private communication data.");
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setActioning("");
    }
  }


  return <PortalShell>
    <h1>KariGO Ride Dispatch</h1>
    <p className="muted">KariGO Rides uses manual Operations dispatch for launch. Admin assigns approved online Ride Captains and monitors status history; automatic matching, online Ride payment and payout automation remain disabled.</p>
    <div className="notice">
      <strong>Operational safety note</strong>
      <p>Use this page for Kano and Abuja production dispatch. Customer App initiates Ride requests, Admin assigns Captains manually, and Captains progress assigned trips inside KariGO Captain.</p>
    </div>
    {message ? <p className="success">{message}</p> : null}
    <ErrorMessage>{error}</ErrorMessage>
    <div className="filters">
      {(["applications", "waitlist", "profiles", "trips", "finance", "trash", "summary"] as Tab[]).map((tab) => <button key={tab} className={activeTab === tab ? "" : "secondary"} onClick={() => setActiveTab(tab)}>{tabLabels[tab]}</button>)}
      <button className="secondary" onClick={() => void load()}>Refresh</button>
    </div>
    {loading ? <Loading /> : <>
      {activeTab === "applications" ? <section className="section">
        <div className="filters">
          <label>Status<select value={applicationStatus} onChange={(event) => setApplicationStatus(event.target.value as TaxiApplicationStatus | "ALL")}>{applicationStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label>
        </div>
        {applications.length ? applications.map((application) => <article className="card" key={application.id}>
          <strong>{application.fullName} - {application.applicationReference}</strong>
          <p className="muted">{application.city}, {application.state} - {application.phoneNumber}</p>
          <div className="notice">
            <strong>Residential location</strong>
            <p>{application.residentialLocation?.label || `${application.city}, ${application.state}`}</p>
            <strong>Operating areas</strong>
            {application.operatingAreas?.length ? application.operatingAreas.map((area) => <p key={area.label}>{area.label}</p>) : <p className="muted">No operating areas recorded.</p>}
            <p className="muted">Primary: {application.primaryOperatingArea?.label || "Not recorded"}</p>
          </div>
          <p>{application.vehicle ?? "Vehicle details pending"} {application.vehiclePlateNumber ? `- ${application.vehiclePlateNumber}` : ""}</p>
          {application.applicantAccount ? <div className="notice">
            <strong>Applicant account</strong>
            <p><Badge>{application.applicantAccount.accountStatus}</Badge> <Badge>{application.applicantAccount.phoneVerified ? "PHONE VERIFIED" : "OTP PENDING"}</Badge> <Badge>{application.applicantAccount.loginReady ? "LOGIN READY" : "LOGIN SETUP PENDING"}</Badge></p>
            {application.applicantAccount.riderProfile ? <p className="muted">Captain account: {application.applicantAccount.riderProfile.riderCode} - {application.applicantAccount.riderProfile.verificationStatus}</p> : <p className="muted">Ride operations profile can be prepared after approved account review.</p>}
          </div> : <p className="muted">No account-first applicant is linked to this ride application.</p>}
          {application.documentReview?.approvalReviewIncomplete && application.status === "APPROVED" ? <div className="warning"><strong>Approval review incomplete</strong><p>Required document review remains pending. Review documents before Ride profile activation.</p></div> : null}
          {application.documentReview ? <div className="notice"><strong>Document review</strong><p>{application.documentReview.message}</p><Badge>{application.documentReview.stage}</Badge></div> : null}
          {application.captainDocuments?.length ? <div className="notice">
            <strong>Secure uploaded documents</strong>
            {application.captainDocuments.map((document) => <div key={document.id} className="item">
              <p><strong>{document.documentType.replaceAll("_", " ")}</strong> <Badge>{document.required ? "REQUIRED" : "OPTIONAL"}</Badge> <Badge>{document.reviewStatus}</Badge></p>
              <p className="muted">{document.originalFileName}</p>
              {document.applicantVisibleNote ? <p>Applicant note: {document.applicantVisibleNote}</p> : null}
              {document.adminNote ? <p className="muted">Internal note: {document.adminNote}</p> : null}
              <div className="filters">
                <button className="secondary" onClick={() => void openSecureApplicationDocument(application, document.id)}>View secure file</button>
                <button className="secondary" disabled={actioning === document.id || document.reviewStatus === "APPROVED"} onClick={() => void reviewSecureApplicationDocument(application, document.id, "APPROVED")}>Approve</button>
                <button className="secondary" disabled={actioning === document.id || document.reviewStatus === "CHANGES_REQUESTED"} onClick={() => void reviewSecureApplicationDocument(application, document.id, "CHANGES_REQUESTED")}>Request changes</button>
                <button className="secondary" disabled={actioning === document.id || document.reviewStatus === "REJECTED"} onClick={() => void reviewSecureApplicationDocument(application, document.id, "REJECTED")}>Reject</button>
              </div>
            </div>)}
            <button disabled={actioning === `${application.id}:required-documents`} onClick={() => void approveRequiredApplicationDocuments(application)}>Approve all required documents</button>
          </div> : null}
          {application.documentEvidence?.length ? <div className="notice">
            <strong>Legacy document evidence</strong>
            {application.documentEvidence.map((document) => <p key={document.label}><a href={document.url} target="_blank" rel="noreferrer">{document.label}</a></p>)}
          </div> : null}
          {!application.captainDocuments?.length && !application.documentEvidence?.length ? <p className="muted">No ride document evidence supplied yet.</p> : null}
          <p><Badge>{application.status}</Badge></p>
          <div className="filters">
            {reviewStatuses.map((status) => <button className="secondary" disabled={actioning === application.id || status === application.status} key={status} onClick={() => void reviewApplication(application.id, status)}>{status.replaceAll("_", " ")}</button>)}
            {["APPROVED", "PROVISIONALLY_APPROVED"].includes(application.status) ? <button onClick={() => void createProfile(application.id)}>Prepare Ride Captain profile</button> : null}
            {application.status === "REJECTED" ? <button className="secondary" disabled={actioning === `${application.id}:trash`} onClick={() => void moveApplicationToTrash(application)}>Move to Trash</button> : null}
          </div>
        </article>) : <Empty>No ride applications found.</Empty>}
      </section> : null}
      {activeTab === "waitlist" ? <section className="section">
        <div className="filters">
          <label>Status<select value={waitlistStatus} onChange={(event) => setWaitlistStatus(event.target.value as TaxiWaitlistStatus | "ALL")}>{waitlistStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label>
        </div>
        {waitlist.length ? waitlist.map((entry) => <article className="card" key={entry.id}>
          <strong>{entry.fullName}</strong>
          <p className="muted">{entry.city}, {entry.state}{entry.pickupArea ? ` - ${entry.pickupArea}` : ""}</p>
          <p>{entry.phoneNumber}{entry.email ? ` - ${entry.email}` : ""}</p>
          <p><Badge>{entry.status}</Badge></p>
          <div className="filters">{waitlistStatuses.filter((status): status is TaxiWaitlistStatus => status !== "ALL").map((status) => <button className="secondary" key={status} onClick={() => void updateWaitlistStatus(entry.id, status)}>{status.replaceAll("_", " ")}</button>)}</div>
        </article>) : <Empty>No ride waitlist entries found.</Empty>}
      </section> : null}
      {activeTab === "profiles" ? <section className="section">
        {profiles.length ? profiles.map((profile) => <article className="card" key={profile.id}>
          <strong>{profile.fullName}</strong>
          <p className="muted">{profile.city}, {profile.state} - {profile.phoneNumber}</p>
          <p>{[profile.vehicleMake, profile.vehicleModel, profile.vehicleYear, profile.vehiclePlateNumber].filter(Boolean).join(" ") || "Vehicle pending"}</p>
          <p><Badge>{profile.status}</Badge> {profile.isAvailableForTaxi ? "Online for assigned rides" : "Offline for rides"}</p>
          <div className="filters">{profileStatuses.map((status) => <button className="secondary" key={status} onClick={() => void updateProfile(profile.id, status)}>{status.replaceAll("_", " ")}</button>)}</div>
        </article>) : <Empty>No Ride Captain profiles yet.</Empty>}
      </section> : null}
      {activeTab === "trips" ? <section className="section">
        {trips.length ? trips.map((trip) => <article className="card" key={trip.id}>
          <strong>{trip.tripReference} · {trip.rideCategory ?? "ECONOMY"}</strong>
          <p>{trip.pickupAddress} to {trip.destinationAddress}</p>
          <p className="muted">Fare estimate: {formatKobo(trip.estimatedFareKobo)}</p>
          <p className="muted">PIN required: {trip.ridePinRequired ? "Yes" : "No"} · PIN verified: {trip.evidenceSummary?.pinVerified ? "Yes" : "No"}</p>
          {trip.finalFareKobo ? <p className="muted">Final fare: {formatKobo(trip.finalFareKobo)}{trip.receipt ? ` · Receipt ${trip.receipt.receiptNumber}` : ""}</p> : null}
          {trip.receipt?.emailDelivery ? <p className="muted">Receipt email: {trip.receipt.emailDelivery.status.replaceAll("_", " ")}
            {trip.receipt.emailDelivery.maskedRecipientEmail ? ` · ${trip.receipt.emailDelivery.maskedRecipientEmail}` : ""}
            {trip.receipt.emailDelivery.sentAt ? ` · sent ${new Date(trip.receipt.emailDelivery.sentAt).toLocaleString()}` : ""}
            {` · ${trip.receipt.emailDelivery.attemptCount} attempt${trip.receipt.emailDelivery.attemptCount === 1 ? "" : "s"}`}
          </p> : null}
          {trip.waitingSummary ? <p className="muted">Pickup waiting: {trip.waitingSummary.totalWaitingSeconds}s · {formatKobo(trip.waitingSummary.waitingChargeKobo)}</p> : null}
          {trip.evidenceSummary ? <p className="muted">
            Integrity: pickup {trip.evidenceSummary.pickupOverrideUsed ? "override" : trip.evidenceSummary.pickupArrivalVerified ? "verified" : "pending"}
            {" · "}PIN {trip.evidenceSummary.pinRequired ? trip.evidenceSummary.pinVerified ? "verified" : "required" : "not required"}
            {" · "}destination {trip.evidenceSummary.destinationOverrideUsed ? "override" : trip.evidenceSummary.destinationArrivalVerified ? "verified" : "pending"}
            {" · "}{trip.evidenceSummary.tracePointCount} trace points
            {trip.evidenceSummary.actualDistanceKm !== null && trip.evidenceSummary.actualDistanceKm !== undefined ? ` · ${trip.evidenceSummary.actualDistanceKm} km actual` : ""}
          </p> : null}
          <p><Badge>{trip.status}</Badge></p>
          <p className="muted">{trip.driver ? `Ride Captain: ${trip.driver.fullName}` : "No Ride Captain assigned"}</p>
          <div className="filters">
            <button disabled={actioning === `${trip.id}:eligible`} onClick={() => void loadEligibleCaptains(trip.id)}>Show eligible Captains</button>
          <p className="muted">Conversation: {trip.conversationSummary?.exists ? `${trip.conversationSummary.messageCount} message${trip.conversationSummary.messageCount === 1 ? "" : "s"}` : "No messages"}{trip.conversationSummary?.lastMessageAt ? ` - last ${new Date(trip.conversationSummary.lastMessageAt).toLocaleString()}` : ""}</p>
          <p className="muted">Call in KariGO: {trip.callSessionSummary?.state ?? "DISABLED"}</p>
          <p className="muted">Private message content is available only through audited support access.</p>

            <button className="secondary" onClick={() => void assignDriver(trip.id)}>Assign by ID</button>
            <button className="secondary" onClick={() => void cancelTrip(trip.id)}>Cancel Ride</button>
            {trip.receipt?.emailDelivery?.status === "FAILED" ? <button className="secondary" disabled={actioning === `${trip.id}:receipt-email`} onClick={() => void retryReceiptEmail(trip.id)}>Retry receipt email</button> : null}
          </div>
          {eligibleByTrip[trip.id]?.length ? <div className="notice">
            <strong>Eligible Ride Captains</strong>
            {eligibleByTrip[trip.id].map((candidate) => <div className="item" key={candidate.id}>
              <p><strong>{candidate.fullName}</strong> <Badge>{candidate.eligible ? "ELIGIBLE" : "UNAVAILABLE"}</Badge> <Badge>{candidate.locationFreshness}</Badge></p>
              <p className="muted">{candidate.vehicle || "Vehicle pending"}{candidate.plateNumber ? ` - ${candidate.plateNumber}` : ""}{candidate.operatingArea ? ` - ${candidate.operatingArea}` : ""}</p>
              {candidate.distanceToPickupKm !== null && candidate.distanceToPickupKm !== undefined ? <p className="muted">Approx. {candidate.distanceToPickupKm.toFixed(1)} km from pickup</p> : null}
              {candidate.ineligibilityReasons?.length ? <p className="muted">{candidate.ineligibilityReasons.join(" ")}</p> : null}
              <button disabled={!candidate.eligible} onClick={() => void assignDriver(trip.id, candidate.id)}>Assign this Captain</button>
            </div>)}
          </div> : null}
          <details><summary>Timeline/events</summary>{trip.events?.map((event) => <p key={event.id}>{event.createdAt} - {event.eventType} - {event.note}</p>)}</details>
        </article>) : <Empty>No Ride requests yet.</Empty>}
      </section> : null}
      {activeTab === "finance" ? <section className="section">
        <div className="notice">
          <strong>Cash Ride reconciliation</strong>
          <p>Captains already hold the passenger Cash fare. KariGO records only the commission due from Captain to platform; no Captain payout, gateway refund or automatic transfer is created here.</p>
        </div>
        <div className="filters">
          <label>From<input type="date" value={financeDateFrom} onChange={(event) => setFinanceDateFrom(event.target.value)} /></label>
          <label>To<input type="date" value={financeDateTo} onChange={(event) => setFinanceDateTo(event.target.value)} /></label>
          <button className="secondary" disabled={actioning === "finance-export"} onClick={() => void exportFinanceCsv()}>{actioning === "finance-export" ? "Exporting..." : "Export safe CSV"}</button>
        </div>
        {financeSummary ? <>
          <div className="grid">
            {[
              ["Completed Rides", String(financeSummary.completedRides)],
              ["Gross Ride fares", formatKobo(financeSummary.grossRideFaresKobo)],
              ["KariGO commission earned", formatKobo(financeSummary.karigoCommissionKobo)],
              ["Captain earnings", formatKobo(financeSummary.captainEarningsKobo)],
              ["Cash collected by Captains", formatKobo(financeSummary.cashCollectedByCaptainsKobo)],
              ["Commission outstanding", formatKobo(financeSummary.platformCommissionOutstandingKobo)],
              ["Commission reconciled", formatKobo(financeSummary.commissionReconciledKobo)],
              ["Refunds approved", formatKobo(financeSummary.refundsApprovedKobo)],
              ["Cash refunds pending", formatKobo(financeSummary.refundsPendingKobo)],
              ["Platform-funded refunds", formatKobo(financeSummary.platformFundedRefundsKobo)],
              ["Captain-funded refunds", formatKobo(financeSummary.captainFundedRefundsKobo)],
              ["Shared refunds", formatKobo(financeSummary.sharedRefundsKobo)],
              ["Unresolved refund responsibility", formatKobo(financeSummary.unresolvedRefundResponsibilityKobo)],
              ["Disputed balance", formatKobo(financeSummary.disputedBalanceKobo)]
            ].map(([label, value]) => <article className="card" key={label}><span className="muted">{label}</span><p className="metric">{value}</p></article>)}
          </div>
          <p className="muted">Effective configured KariGO commission: {financeSummary.effectiveKarigoCommissionPercent}% · Unresolved adjustments: {financeSummary.unresolvedAdjustments}</p>
        </> : <Empty>No Ride finance summary is available for this period.</Empty>}
        <h2>Captain reconciliation</h2>
        {financeCaptains.length ? financeCaptains.map((captain) => <article className="card" key={captain.driverProfileId}>
          <strong>{captain.captainName}</strong>
          <p className="muted">Cash fares {formatKobo(captain.grossFaresKobo)} · Captain earnings {formatKobo(captain.captainEarningsKobo)}</p>
          <p>KariGO commission due: <strong>{formatKobo(captain.karigoCommissionDueKobo)}</strong> · Remitted: <strong>{formatKobo(captain.commissionRemittedKobo)}</strong> · Outstanding: <strong>{formatKobo(captain.outstandingKobo)}</strong></p>
          {canManualFinanceOverride ? <button className="secondary" disabled={Boolean(actioning) || captain.outstandingKobo <= 0} onClick={() => void recordCommissionRemittance(captain)}>Manual finance override</button> : null}
        </article>) : <Empty>No Captain settlement positions in this period.</Empty>}
        <h2>Provider commission payments</h2>
        <p className="muted">Normal production settlement is posted only after signed webhook handling and independent provider verification. Redirect success is not proof of payment.</p>
        {commissionPayments.length ? commissionPayments.map((payment) => <article className="card" key={payment.id}>
          <div className="filters"><strong>{payment.captain.fullName}</strong><Badge>{payment.status}</Badge><Badge>{payment.provider.toUpperCase()}</Badge></div>
          <p>{formatKobo(payment.amountKobo)} · KariGO reference <strong>{payment.reference}</strong></p>
          <p className="muted">Provider reference: {payment.providerReference ?? "Pending verification"} · {new Date(payment.verifiedAt ?? payment.initiatedAt).toLocaleString()}</p>
        </article>) : <Empty>No provider commission payment attempts recorded.</Empty>}
        <h2>Ride settlements</h2>
        {financeSettlements.length ? financeSettlements.map((settlement) => <article className="card" key={settlement.id}>
          <div className="filters"><strong>{settlement.tripReference}</strong><Badge>{settlement.status}</Badge><Badge>{settlement.settlementDirection}</Badge></div>
          <p className="muted">{new Date(settlement.finalizedAt).toLocaleString()} · {settlement.captain?.fullName ?? "No Captain"} · {settlement.rideCategory.replaceAll("_", " ")} · {settlement.serviceArea ?? "Service area unavailable"}</p>
          <div className="grid">
            <div className="item"><span>Customer fare</span><strong>{formatKobo(settlement.finalCustomerFareKobo)}</strong></div>
            <div className="item"><span>Original KariGO commission ({(settlement.commissionRateBasisPoints / 100).toFixed(2)}%)</span><strong>{formatKobo(settlement.originalCommissionEarnedKobo)}</strong></div>
            <div className="item"><span>Captain earning</span><strong>{formatKobo(settlement.captainNetEarningKobo)}</strong></div>
            <div className="item"><span>Cash collected</span><strong>{formatKobo(settlement.cashCollectedKobo)}</strong></div>
            <div className="item"><span>Remitted</span><strong>{formatKobo(settlement.remittedKobo)}</strong></div>
            <div className="item"><span>Outstanding</span><strong>{formatKobo(settlement.outstandingPlatformKobo)}</strong></div>
            <div className="item"><span>Refunded</span><strong>{formatKobo(settlement.refundedKobo)}</strong></div>
            <div className="item"><span>Platform-funded refunds</span><strong>{formatKobo(settlement.platformFundedRefundsKobo)}</strong></div>
            <div className="item"><span>Captain-funded refunds</span><strong>{formatKobo(settlement.captainFundedRefundsKobo)}</strong></div>
            <div className="item"><span>Unresolved responsibility</span><strong>{formatKobo(settlement.unresolvedRefundResponsibilityKobo)}</strong></div>
            <div className="item"><span>Payment</span><strong>{settlement.paymentMethod}</strong></div>
          </div>
          {settlement.disputeReason ? <div className="warning"><strong>Financial review</strong><p>{settlement.disputeReason}</p></div> : null}
          {settlement.refunds.map((refund) => <div className="notice" key={refund.id}>
            <p><strong>{formatKobo(refund.amountKobo)} refund</strong> <Badge>{refund.status}</Badge> <Badge>{refund.responsibility}</Badge></p>
            <div className="filters">
              {refund.responsibility === "REVIEW_REQUIRED" ? <button disabled={Boolean(actioning)} onClick={() => void allocateRefund(refund)}>Allocate responsibility</button> : null}
              {refund.status === "CASH_REFUND_DUE" ? <button disabled={Boolean(actioning)} onClick={() => void settleCashRefund(refund.id)}>Confirm Cash refund received</button> : null}
            </div>
          </div>)}
          <div className="filters">
            <button disabled={Boolean(actioning) || settlement.financialOutcome !== "NORMAL_COMPLETION"} onClick={() => void approveCashRefund(settlement)}>Approve Cash refund</button>
            <button className="secondary" disabled={Boolean(actioning)} onClick={() => void createAdjustment(settlement)}>Create adjustment</button>
            {settlement.status === "DISPUTED" ? <button className="secondary" disabled={Boolean(actioning)} onClick={() => void resolveFinancialDispute(settlement)}>Resolve review</button> : <button className="secondary" disabled={Boolean(actioning)} onClick={() => void openFinancialDispute(settlement)}>Open financial review</button>}
          </div>
        </article>) : <Empty>No Ride settlements in this period. H11 does not fabricate historical Ride finance records.</Empty>}
      </section> : null}
      {activeTab === "trash" ? <section className="section">
        {trashedApplications.length ? trashedApplications.map((application) => <article className="card" key={application.id}>
          <strong>{application.fullName} - {application.applicationReference}</strong>
          <p className="muted">{application.city}, {application.state} - rejected application retained for audit.</p>
          <p><Badge>{application.status}</Badge> <Badge>TRASHED</Badge></p>
          <p className="muted">Trashed: {application.trashedAt ? new Date(application.trashedAt).toLocaleString() : "Not recorded"}</p>
          <p>{application.trashReason || "No trash reason recorded."}</p>
          <button disabled={actioning === `${application.id}:restore`} onClick={() => void restoreApplication(application)}>Restore</button>
        </article>) : <Empty>No rejected Ride applications in Trash.</Empty>}
      </section> : null}
      {activeTab === "summary" ? <section className="section">
        {summary ? <>
          <div className="grid">
            {[
              ["Ride Captain profiles", summary.driverProfiles],
              ["Available Ride Captains", summary.availableDrivers],
              ["Requested rides", summary.requestedTrips],
              ["Active rides", summary.activeTrips],
              ["Completed rides", summary.completedTrips],
              ["Cancelled rides", summary.cancelledTrips]
            ].map(([label, value]) => <article className="card" key={String(label)}><span className="muted">{label}</span><p className="metric">{String(value)}</p></article>)}
          </div>
          <article className="card">
            <h2>Ride pricing defaults</h2>
            <p className="muted">Read-only launch defaults for Kano and Abuja. This visibility does not activate automatic dispatch, ride payment collection or payout automation.</p>
            <div className="grid">
              <div className="item"><span>Launch cities</span><strong>{summary.pricingDefaults.launchCities.join(", ")}</strong></div>
              <div className="item"><span>Passenger charge</span><strong>{formatKobo(summary.pricingDefaults.perKmKobo)} / km</strong></div>
              <div className="item"><span>Captain commission</span><strong>{summary.pricingDefaults.karigoCommissionPercent}% KariGO commission</strong></div>
              <div className="item"><span>Waiting charge</span><strong>{formatKobo(summary.pricingDefaults.waitingChargeKoboPerMinute)} / minute after {summary.pricingDefaults.waitingGraceMinutes} minutes</strong></div>
              {Object.entries(summary.pricingDefaults.categoryMinimumFaresKobo).map(([category, minimum]) =>
                <div className="item" key={category}>
                  <span>{category.replaceAll("_", " ")} minimum</span><strong>{formatKobo(minimum)}</strong>
                </div>
              )}
              <div className="item"><span>Free pickup wait</span><strong>{summary.pricingDefaults.freePickupWaitSeconds} seconds</strong></div>
              <div className="item"><span>Tax/VAT line</span><strong>{summary.pricingDefaults.vatTaxConfigured ? formatKobo(summary.pricingDefaults.vatTaxKobo) : "Not configured"}</strong></div>
              <div className="item"><span>Ride dispatch flag</span><strong>{summary.pricingDefaults.dispatchEnabled ? "Enabled" : "Disabled"}</strong></div>
            </div>
            <p className="muted">{summary.launchNotice ?? summary.testModeNotice}</p>
          </article>
        </> : <Empty>Ride summary unavailable while ride dispatch is disabled.</Empty>}
      </section> : null}
    </>}
  </PortalShell>;
}
