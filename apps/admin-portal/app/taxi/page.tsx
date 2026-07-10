"use client";

import { useEffect, useState } from "react";
import { taxiApi, AdminTaxiDriverApplication } from "../../src/api/taxi.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../src/components/portal";
import { friendlyError } from "../../src/lib/errors";
import { TaxiApplicationStatus, TaxiWaitlistEntry, TaxiWaitlistStatus } from "@karigo/shared-types";

const applicationStatuses: Array<TaxiApplicationStatus | "ALL"> = ["ALL", "SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED", "PROVISIONALLY_APPROVED", "APPROVED", "REJECTED"];
const reviewStatuses: TaxiApplicationStatus[] = ["UNDER_REVIEW", "CHANGES_REQUESTED", "PROVISIONALLY_APPROVED", "APPROVED", "REJECTED"];
const waitlistStatuses: Array<TaxiWaitlistStatus | "ALL"> = ["ALL", "SUBMITTED", "CONTACTED", "INTERESTED", "NOT_INTERESTED", "CONVERTED"];

export default function AdminTaxiPage() {
  const [activeTab, setActiveTab] = useState<"applications" | "waitlist">("applications");
  const [applicationStatus, setApplicationStatus] = useState<TaxiApplicationStatus | "ALL">("ALL");
  const [waitlistStatus, setWaitlistStatus] = useState<TaxiWaitlistStatus | "ALL">("ALL");
  const [applications, setApplications] = useState<AdminTaxiDriverApplication[]>([]);
  const [waitlist, setWaitlist] = useState<TaxiWaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [applicationData, waitlistData] = await Promise.all([
        taxiApi.driverApplications(applicationStatus),
        taxiApi.waitlist(waitlistStatus)
      ]);
      setApplications(applicationData);
      setWaitlist(waitlistData);
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
    setMessage("Taxi driver readiness review saved. This does not activate live taxi dispatch.");
    await load();
  }

  async function updateWaitlistStatus(id: string, status: TaxiWaitlistStatus) {
    const note = window.prompt("Internal follow-up note optional") ?? undefined;
    await taxiApi.updateWaitlistStatus(id, { status, note });
    setMessage("Taxi waitlist status updated.");
    await load();
  }

  return <PortalShell>
    <h1>Taxi</h1>
    <p className="muted">Taxi readiness is preparing launch only. This page handles driver applications and customer waitlist follow-up; it does not dispatch rides or manage fares.</p>
    {message ? <p className="success">{message}</p> : null}
    <ErrorMessage>{error}</ErrorMessage>
    <div className="filters">
      <button className={activeTab === "applications" ? "" : "secondary"} onClick={() => setActiveTab("applications")}>Driver Applications</button>
      <button className={activeTab === "waitlist" ? "" : "secondary"} onClick={() => setActiveTab("waitlist")}>Customer Waitlist</button>
      <button className="secondary" onClick={() => void load()}>Refresh</button>
    </div>
    {loading ? <Loading /> : activeTab === "applications" ? <section className="section">
      <div className="filters">
        <label>Status<select value={applicationStatus} onChange={(event) => setApplicationStatus(event.target.value as TaxiApplicationStatus | "ALL")}>{applicationStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label>
      </div>
      {applications.length ? applications.map((application) => <article className="card" key={application.id}>
        <strong>{application.fullName} - {application.applicationReference}</strong>
        <p className="muted">{application.city}, {application.state} - {application.phoneNumber}</p>
        <p>{application.vehicle ?? "Vehicle details pending"} {application.vehiclePlateNumber ? `- ${application.vehiclePlateNumber}` : ""}</p>
        <p><Badge>{application.status}</Badge></p>
        <div className="filters">{reviewStatuses.map((status) => <button className="secondary" key={status} onClick={() => void reviewApplication(application.id, status)}>{status.replaceAll("_", " ")}</button>)}</div>
      </article>) : <Empty>No taxi driver applications found.</Empty>}
    </section> : <section className="section">
      <div className="filters">
        <label>Status<select value={waitlistStatus} onChange={(event) => setWaitlistStatus(event.target.value as TaxiWaitlistStatus | "ALL")}>{waitlistStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label>
      </div>
      {waitlist.length ? waitlist.map((entry) => <article className="card" key={entry.id}>
        <strong>{entry.fullName}</strong>
        <p className="muted">{entry.city}, {entry.state}{entry.pickupArea ? ` - ${entry.pickupArea}` : ""}</p>
        <p>{entry.phoneNumber}{entry.email ? ` - ${entry.email}` : ""}</p>
        <p><Badge>{entry.status}</Badge></p>
        <div className="filters">{waitlistStatuses.filter((status): status is TaxiWaitlistStatus => status !== "ALL").map((status) => <button className="secondary" key={status} onClick={() => void updateWaitlistStatus(entry.id, status)}>{status.replaceAll("_", " ")}</button>)}</div>
      </article>) : <Empty>No taxi waitlist entries found.</Empty>}
    </section>}
  </PortalShell>;
}
