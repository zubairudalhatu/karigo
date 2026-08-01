"use client";

import { useEffect, useState } from "react";
import { taxiApi, AdminTaxiDriverApplication, EligibleRideCaptain } from "../../src/api/taxi.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../src/components/portal";
import { friendlyError } from "../../src/lib/errors";
import { TaxiApplicationStatus, TaxiDriverProfile, TaxiDriverProfileStatus, TaxiRidePricingDefaults, TaxiTrip, TaxiWaitlistEntry, TaxiWaitlistStatus } from "@karigo/shared-types";

const applicationStatuses: Array<TaxiApplicationStatus | "ALL"> = ["ALL", "SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED", "PROVISIONALLY_APPROVED", "APPROVED", "REJECTED"];
const reviewStatuses: TaxiApplicationStatus[] = ["UNDER_REVIEW", "CHANGES_REQUESTED", "PROVISIONALLY_APPROVED", "APPROVED", "REJECTED"];
const waitlistStatuses: Array<TaxiWaitlistStatus | "ALL"> = ["ALL", "SUBMITTED", "CONTACTED", "INTERESTED", "NOT_INTERESTED", "CONVERTED"];
const profileStatuses: TaxiDriverProfileStatus[] = ["PENDING_ACTIVATION", "ACTIVE", "SUSPENDED", "DEACTIVATED"];

type Tab = "applications" | "waitlist" | "profiles" | "trips" | "trash" | "summary";
const tabLabels: Record<Tab, string> = {
  applications: "Ride Applications",
  waitlist: "Customer Waitlist",
  profiles: "Ride Captain Profiles",
  trips: "Ride Dispatch",
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

const money = (kobo: number) => `NGN ${Math.round(kobo / 100).toLocaleString()}`;

export default function AdminTaxiPage() {
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
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [actioning, setActioning] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [applicationData, waitlistData, profileData, tripData, trashData, summaryData] = await Promise.all([
        taxiApi.driverApplications(applicationStatus),
        taxiApi.waitlist(waitlistStatus),
        taxiApi.driverProfiles().catch(() => []),
        taxiApi.trips().catch(() => []),
        taxiApi.driverApplicationsTrash().catch(() => []),
        taxiApi.summary().catch(() => null)
      ]);
      setApplications(applicationData);
      setWaitlist(waitlistData);
      setProfiles(profileData);
      setTrips(tripData);
      setTrashedApplications(trashData);
      setSummary(summaryData);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [applicationStatus, waitlistStatus]);

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
      {(["applications", "waitlist", "profiles", "trips", "trash", "summary"] as Tab[]).map((tab) => <button key={tab} className={activeTab === tab ? "" : "secondary"} onClick={() => setActiveTab(tab)}>{tabLabels[tab]}</button>)}
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
          <strong>{trip.tripReference}</strong>
          <p>{trip.pickupAddress} to {trip.destinationAddress}</p>
          <p className="muted">Fare estimate: NGN {Math.round(trip.estimatedFareKobo / 100).toLocaleString()} - PIN last four: {trip.tripPinLastFour ?? "hidden"}</p>
          <p><Badge>{trip.status}</Badge></p>
          <p className="muted">{trip.driver ? `Ride Captain: ${trip.driver.fullName}` : "No Ride Captain assigned"}</p>
          <div className="filters">
            <button disabled={actioning === `${trip.id}:eligible`} onClick={() => void loadEligibleCaptains(trip.id)}>Show eligible Captains</button>
            <button className="secondary" onClick={() => void assignDriver(trip.id)}>Assign by ID</button>
            <button className="secondary" onClick={() => void cancelTrip(trip.id)}>Cancel Ride</button>
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
              <div className="item"><span>Passenger charge</span><strong>{money(summary.pricingDefaults.perKmKobo)} / km</strong></div>
              <div className="item"><span>Captain commission</span><strong>{summary.pricingDefaults.karigoCommissionPercent}% KariGO commission</strong></div>
              <div className="item"><span>Waiting charge</span><strong>{money(summary.pricingDefaults.waitingChargeKoboPerMinute)} / minute after {summary.pricingDefaults.waitingGraceMinutes} minutes</strong></div>
              <div className="item"><span>Tax/VAT line</span><strong>{summary.pricingDefaults.vatTaxConfigured ? money(summary.pricingDefaults.vatTaxKobo) : "Not configured"}</strong></div>
              <div className="item"><span>Ride dispatch flag</span><strong>{summary.pricingDefaults.dispatchEnabled ? "Enabled" : "Disabled"}</strong></div>
            </div>
            <p className="muted">{summary.launchNotice ?? summary.testModeNotice}</p>
          </article>
        </> : <Empty>Ride summary unavailable while ride dispatch is disabled.</Empty>}
      </section> : null}
    </>}
  </PortalShell>;
}
