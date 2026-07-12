"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  SmeServicesPilotInvitationChannel,
  SmeServicesPilotParticipantStatus,
  SmeServicesPilotParticipantType,
  SmeServicesPilotParticipantsListResponse,
  smeServicesApi
} from "../../../src/api/sme-services.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../../src/components/portal";
import { friendlyError } from "../../../src/lib/errors";

const participantTypes: Array<"" | SmeServicesPilotParticipantType> = ["", "CUSTOMER", "SERVICE_PROVIDER", "INTERNAL_OBSERVER"];
const statuses: Array<"" | SmeServicesPilotParticipantStatus> = ["", "DRAFT", "READY_TO_INVITE", "INVITED_MANUALLY", "CONFIRMED", "DECLINED", "REMOVED"];
const invitationChannels: Array<"" | SmeServicesPilotInvitationChannel> = ["", "PHONE", "WHATSAPP", "EMAIL", "IN_PERSON", "IN_APP_NOTE", "OTHER"];

const initialForm = {
  participantType: "CUSTOMER" as SmeServicesPilotParticipantType,
  status: "DRAFT" as SmeServicesPilotParticipantStatus,
  displayName: "",
  phoneNumber: "",
  email: "",
  organization: "",
  city: "Kano",
  pilotZone: "",
  relatedUserId: "",
  relatedProviderId: "",
  invitationChannel: "" as "" | SmeServicesPilotInvitationChannel,
  invitationNote: "",
  internalNotes: "",
  consentConfirmed: false,
  safetyBriefingCompleted: false
};

function date(value?: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function queryString(participantType: string, status: string, search: string, city: string, pilotZone: string) {
  const params = new URLSearchParams();
  if (participantType) params.set("participantType", participantType);
  if (status) params.set("status", status);
  if (search.trim()) params.set("search", search.trim());
  if (city.trim()) params.set("city", city.trim());
  if (pilotZone.trim()) params.set("pilotZone", pilotZone.trim());
  return params.toString();
}

export default function SmeServicesPilotParticipantsPage() {
  const [data, setData] = useState<SmeServicesPilotParticipantsListResponse | null>(null);
  const [participantType, setParticipantType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [pilotZone, setPilotZone] = useState("");
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const q = useMemo(() => queryString(participantType, status, search, city, pilotZone), [participantType, status, search, city, pilotZone]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await smeServicesApi.pilotParticipants(q));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [q]);

  async function createParticipant() {
    if (!form.displayName.trim()) {
      setError("Pilot participant could not be created. Please enter a display name.");
      return;
    }
    if (form.relatedProviderId.trim() && form.participantType !== "SERVICE_PROVIDER") {
      setError("Related provider ID can only be used for service provider participants.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      await smeServicesApi.createPilotParticipant({
        participantType: form.participantType,
        status: form.status,
        displayName: form.displayName,
        phoneNumber: form.phoneNumber || undefined,
        email: form.email || undefined,
        organization: form.organization || undefined,
        city: form.city || undefined,
        pilotZone: form.pilotZone || undefined,
        relatedUserId: form.relatedUserId || undefined,
        relatedProviderId: form.relatedProviderId || undefined,
        invitationChannel: form.invitationChannel || undefined,
        invitationNote: form.invitationNote || undefined,
        internalNotes: form.internalNotes || undefined,
        consentConfirmed: form.consentConfirmed,
        safetyBriefingCompleted: form.safetyBriefingCompleted
      });
      setForm(initialForm);
      setMessage("Pilot participant record has been created.");
      await load();
    } catch (e) {
      setError(friendlyError(e, "form") || "Pilot participant could not be created. Please check the required fields and try again.");
    } finally {
      setSaving(false);
    }
  }

  return <PortalShell>
    <h1>SME Services pilot participants</h1>
    <p className="muted">Internal invitation list for controlled SME Services pilot customers, providers and observers. This page does not send real SMS, email or WhatsApp invitations, activate live dispatch, collect payments, create provider login, grant provider app access or expose public provider contacts.</p>
    <div className="top-actions">
      <Link className="button-link" href="/sme-services/launch-control">Launch control</Link>
      <Link className="button-link secondary" href="/sme-services/invitation-templates">Invitation templates</Link>
      <Link className="button-link secondary" href="/sme-services/readiness">Pilot readiness</Link>
      <Link className="button-link secondary" href="/sme-services/summary">Operations summary</Link>
      <button className="secondary" onClick={() => void load()}>Refresh</button>
    </div>

    <section className="grid">
      <article className="card"><span className="muted">Total participants</span><p className="metric">{data?.summary.total ?? 0}</p></article>
      <article className="card"><span className="muted">Customers</span><p className="metric">{data?.summary.customers ?? 0}</p></article>
      <article className="card"><span className="muted">Providers</span><p className="metric">{data?.summary.providers ?? 0}</p></article>
      <article className="card"><span className="muted">Confirmed</span><p className="metric">{data?.summary.confirmed ?? 0}</p></article>
    </section>

    <section className="card section">
      <h2>Create participant record</h2>
      <div className="form-grid">
        <label>Participant type<select value={form.participantType} onChange={(e) => setForm({ ...form, participantType: e.target.value as SmeServicesPilotParticipantType })}>
          {participantTypes.filter(Boolean).map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
        </select></label>
        <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as SmeServicesPilotParticipantStatus })}>
          {statuses.filter(Boolean).map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
        </select></label>
        <label>Display name<input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></label>
        <label>Organisation / group<input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} /></label>
        <label>Phone<input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} /></label>
        <label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>City<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
        <label>Pilot zone<input value={form.pilotZone} onChange={(e) => setForm({ ...form, pilotZone: e.target.value })} placeholder="Nasarawa GRA, Bompai, Tarauni" /></label>
        <label>Related user ID<input value={form.relatedUserId} onChange={(e) => setForm({ ...form, relatedUserId: e.target.value })} placeholder="Optional internal user ID" /></label>
        <label>Related provider ID<input value={form.relatedProviderId} onChange={(e) => setForm({ ...form, relatedProviderId: e.target.value })} placeholder="Optional provider directory ID" /></label>
        <label>Manual invitation channel<select value={form.invitationChannel} onChange={(e) => setForm({ ...form, invitationChannel: e.target.value as "" | SmeServicesPilotInvitationChannel })}>
          {invitationChannels.map((item) => <option key={item || "NONE"} value={item}>{item ? item.replaceAll("_", " ") : "Not selected"}</option>)}
        </select></label>
      </div>
      <label>Invitation note<textarea value={form.invitationNote} onChange={(e) => setForm({ ...form, invitationNote: e.target.value })} placeholder="Manual coordination note only. This does not send a message." /></label>
      <label>Internal notes<textarea value={form.internalNotes} onChange={(e) => setForm({ ...form, internalNotes: e.target.value })} placeholder="Internal operations note. Do not enter passwords, OTPs, payment secrets or sensitive medical details." /></label>
      <label className="check-row"><input type="checkbox" checked={form.consentConfirmed} onChange={(e) => setForm({ ...form, consentConfirmed: e.target.checked })} /> Consent confirmed manually</label>
      <label className="check-row"><input type="checkbox" checked={form.safetyBriefingCompleted} onChange={(e) => setForm({ ...form, safetyBriefingCompleted: e.target.checked })} /> Safety briefing completed</label>
      <button disabled={saving} onClick={() => void createParticipant()}>{saving ? "Saving..." : "Create participant"}</button>
    </section>

    <div className="filters section">
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, email, group or zone" />
      <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
      <input value={pilotZone} onChange={(e) => setPilotZone(e.target.value)} placeholder="Pilot zone" />
      <select value={participantType} onChange={(e) => setParticipantType(e.target.value)}>
        {participantTypes.map((item) => <option key={item || "ALL"} value={item}>{item ? item.replaceAll("_", " ") : "All types"}</option>)}
      </select>
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        {statuses.map((item) => <option key={item || "ALL"} value={item}>{item ? item.replaceAll("_", " ") : "All statuses"}</option>)}
      </select>
    </div>

    <p className="success">{message}</p>
    <ErrorMessage>{error}</ErrorMessage>
    {loading ? <Loading /> : <section className="section">
      <p className="muted">{data?.guardrails.note}</p>
      {data?.items.length ? data.items.map((participant) => <Link className="card" href={`/sme-services/participants/${participant.id}`} key={participant.id}>
        <strong>{participant.displayName}</strong>
        <p><Badge>{participant.participantType.replaceAll("_", " ")}</Badge> <Badge>{participant.status.replaceAll("_", " ")}</Badge></p>
        <p>{participant.organization || "Independent participant"} - {participant.city || "City not set"} {participant.pilotZone ? `- ${participant.pilotZone}` : ""}</p>
        <p className="muted">Invitation: {participant.invitationChannel?.replaceAll("_", " ") || "Not selected"} - Invited {date(participant.invitedAt)}</p>
      </Link>) : <Empty>No SME Services pilot participants found.</Empty>}
    </section>}
  </PortalShell>;
}
