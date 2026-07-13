"use client";

import { useEffect, useState } from "react";
import { taxiApi, AdminTaxiDriverApplication } from "../../src/api/taxi.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../src/components/portal";
import { friendlyError } from "../../src/lib/errors";
import { TaxiApplicationStatus, TaxiDriverProfile, TaxiDriverProfileStatus, TaxiTrip, TaxiWaitlistEntry, TaxiWaitlistStatus } from "@karigo/shared-types";

const applicationStatuses: Array<TaxiApplicationStatus | "ALL"> = ["ALL", "SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED", "PROVISIONALLY_APPROVED", "APPROVED", "REJECTED"];
const reviewStatuses: TaxiApplicationStatus[] = ["UNDER_REVIEW", "CHANGES_REQUESTED", "PROVISIONALLY_APPROVED", "APPROVED", "REJECTED"];
const waitlistStatuses: Array<TaxiWaitlistStatus | "ALL"> = ["ALL", "SUBMITTED", "CONTACTED", "INTERESTED", "NOT_INTERESTED", "CONVERTED"];
const profileStatuses: TaxiDriverProfileStatus[] = ["PENDING_ACTIVATION", "ACTIVE_TEST", "SUSPENDED", "DEACTIVATED"];

type Tab = "applications" | "waitlist" | "profiles" | "trips" | "summary";
const tabLabels: Record<Tab, string> = {
  applications: "Ride Applications",
  waitlist: "Customer Waitlist",
  profiles: "Ride Captain Profiles",
  trips: "Test Ride Requests",
  summary: "Ride Summary"
};

export default function AdminTaxiPage() {
  const [activeTab, setActiveTab] = useState<Tab>("applications");
  const [applicationStatus, setApplicationStatus] = useState<TaxiApplicationStatus | "ALL">("ALL");
  const [waitlistStatus, setWaitlistStatus] = useState<TaxiWaitlistStatus | "ALL">("ALL");
  const [applications, setApplications] = useState<AdminTaxiDriverApplication[]>([]);
  const [waitlist, setWaitlist] = useState<TaxiWaitlistEntry[]>([]);
  const [profiles, setProfiles] = useState<TaxiDriverProfile[]>([]);
  const [trips, setTrips] = useState<TaxiTrip[]>([]);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [applicationData, waitlistData, profileData, tripData, summaryData] = await Promise.all([
        taxiApi.driverApplications(applicationStatus),
        taxiApi.waitlist(waitlistStatus),
        taxiApi.driverProfiles().catch(() => []),
        taxiApi.trips().catch(() => []),
        taxiApi.summary().catch(() => null)
      ]);
      setApplications(applicationData);
      setWaitlist(waitlistData);
      setProfiles(profileData);
      setTrips(tripData);
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
    await taxiApi.reviewDriverApplication(id, { status, applicantVisibleNote, adminNote });
    setMessage("Ride readiness review saved. This does not activate public KariGO Rides.");
    await load();
  }

  async function createProfile(applicationId: string) {
    if (!window.confirm("Create a staging-only Ride Captain profile from this approved application?")) return;
    await taxiApi.createProfileFromApplication(applicationId);
    setMessage("Ride Captain test profile created. KariGO Rides remains staging-only.");
    await load();
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

  async function assignDriver(tripId: string) {
    const available = profiles.filter((profile) => profile.status === "ACTIVE_TEST" && profile.isAvailableForTaxi);
    const fallback = available[0]?.id ?? "";
    const driverProfileId = window.prompt("Ride Captain profile ID to assign", fallback) ?? "";
    if (!driverProfileId) return;
    await taxiApi.assignDriver(tripId, driverProfileId);
    setMessage("Staging Ride Captain assigned.");
    await load();
  }

  async function cancelTrip(tripId: string) {
    const reason = window.prompt("Cancellation reason") ?? "Admin cancelled staging test ride";
    await taxiApi.cancelTrip(tripId, reason);
    setMessage("Staging ride request cancelled.");
    await load();
  }

  return <PortalShell>
    <h1>Ride Operations</h1>
    <p className="muted">KariGO Rides remains staging-only and feature-flagged. This page supports ride readiness, Ride Captain profiles and test ride requests; it does not perform live dispatch, maps billing or payment capture.</p>
    {message ? <p className="success">{message}</p> : null}
    <ErrorMessage>{error}</ErrorMessage>
    <div className="filters">
      {(["applications", "waitlist", "profiles", "trips", "summary"] as Tab[]).map((tab) => <button key={tab} className={activeTab === tab ? "" : "secondary"} onClick={() => setActiveTab(tab)}>{tabLabels[tab]}</button>)}
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
          <p>{application.vehicle ?? "Vehicle details pending"} {application.vehiclePlateNumber ? `- ${application.vehiclePlateNumber}` : ""}</p>
          <p><Badge>{application.status}</Badge></p>
          <div className="filters">{reviewStatuses.map((status) => <button className="secondary" key={status} onClick={() => void reviewApplication(application.id, status)}>{status.replaceAll("_", " ")}</button>)}<button onClick={() => void createProfile(application.id)}>Create Test Ride Captain Profile</button></div>
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
          <p><Badge>{profile.status}</Badge> {profile.isAvailableForTaxi ? "Available" : "Offline"}</p>
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
          <div className="filters"><button onClick={() => void assignDriver(trip.id)}>Assign Ride Captain</button><button className="secondary" onClick={() => void cancelTrip(trip.id)}>Cancel Test Ride</button></div>
          <details><summary>Timeline/events</summary>{trip.events?.map((event) => <p key={event.id}>{event.createdAt} - {event.eventType} - {event.note}</p>)}</details>
        </article>) : <Empty>No staging ride requests yet.</Empty>}
      </section> : null}
      {activeTab === "summary" ? <section className="grid">
        {summary ? Object.entries(summary).map(([key, value]) => <article className="card" key={key}><span className="muted">{key.replace(/([A-Z])/g, " $1").replace("Drivers", "Ride Captains")}</span><p className="metric">{String(value)}</p></article>) : <Empty>Ride summary unavailable while staging dispatch is disabled.</Empty>}
      </section> : null}
    </>}
  </PortalShell>;
}
