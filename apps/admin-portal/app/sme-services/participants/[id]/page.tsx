"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  SmeServicesPilotInvitationChannel,
  SmeServicesPilotParticipant,
  SmeServicesPilotParticipantStatus,
  SmeServicesPilotParticipantType,
  smeServicesApi
} from "../../../../src/api/sme-services.api";
import { Badge, ErrorMessage, Loading, PortalShell } from "../../../../src/components/portal";
import { friendlyError } from "../../../../src/lib/errors";

const statuses: SmeServicesPilotParticipantStatus[] = ["DRAFT", "READY_TO_INVITE", "INVITED_MANUALLY", "CONFIRMED", "DECLINED", "REMOVED"];
const participantTypes: SmeServicesPilotParticipantType[] = ["CUSTOMER", "SERVICE_PROVIDER", "INTERNAL_OBSERVER"];
const invitationChannels: Array<"" | SmeServicesPilotInvitationChannel> = ["", "PHONE", "WHATSAPP", "EMAIL", "IN_PERSON", "IN_APP_NOTE", "OTHER"];

function date(value?: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formFromParticipant(participant: SmeServicesPilotParticipant) {
  return {
    participantType: participant.participantType,
    status: participant.status,
    displayName: participant.displayName,
    phoneNumber: participant.phoneNumber ?? "",
    email: participant.email ?? "",
    organization: participant.organization ?? "",
    city: participant.city ?? "",
    pilotZone: participant.pilotZone ?? "",
    relatedUserId: participant.relatedUserId ?? "",
    relatedProviderId: participant.relatedProviderId ?? "",
    invitationChannel: participant.invitationChannel ?? "" as "" | SmeServicesPilotInvitationChannel,
    invitationNote: participant.invitationNote ?? "",
    internalNotes: participant.internalNotes ?? "",
    consentConfirmed: participant.consentConfirmed,
    safetyBriefingCompleted: participant.safetyBriefingCompleted
  };
}

export default function SmeServicesPilotParticipantDetailPage() {
  const params = useParams<{ id: string }>();
  const participantId = params.id;
  const [participant, setParticipant] = useState<SmeServicesPilotParticipant | null>(null);
  const [form, setForm] = useState<ReturnType<typeof formFromParticipant> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await smeServicesApi.pilotParticipant(participantId);
      setParticipant(data);
      setForm(formFromParticipant(data));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!form) return;
    if (!form.displayName.trim()) {
      setError("Pilot participant could not be updated. Please enter a display name.");
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
      const data = await smeServicesApi.updatePilotParticipant(participantId, {
        participantType: form.participantType,
        status: form.status,
        displayName: form.displayName,
        phoneNumber: form.phoneNumber,
        email: form.email,
        organization: form.organization,
        city: form.city,
        pilotZone: form.pilotZone,
        relatedUserId: form.relatedUserId || undefined,
        relatedProviderId: form.relatedProviderId || undefined,
        invitationChannel: form.invitationChannel || undefined,
        invitationNote: form.invitationNote,
        internalNotes: form.internalNotes,
        consentConfirmed: form.consentConfirmed,
        safetyBriefingCompleted: form.safetyBriefingCompleted
      });
      setParticipant(data);
      setForm(formFromParticipant(data));
      setMessage("Pilot participant record has been updated.");
    } catch (e) {
      setError(friendlyError(e, "form") || "Pilot participant could not be updated. Please check the required fields and try again.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { void load(); }, [participantId]);

  return <PortalShell>
    <h1>SME Services pilot participant</h1>
    <p className="muted">Internal pilot coordination record only. Updating this page does not send invitations, activate live dispatch, grant provider login, grant provider app access, collect payments or expose provider contacts publicly.</p>
    <div className="top-actions">
      <Link className="button-link" href="/sme-services/participants">Back to participants</Link>
      <Link className="button-link secondary" href="/sme-services/launch-control">Launch control</Link>
      <Link className="button-link secondary" href="/sme-services/invitation-templates">Invitation templates</Link>
      <button className="secondary" onClick={() => void load()}>Refresh</button>
    </div>
    <p className="success">{message}</p>
    <ErrorMessage>{error}</ErrorMessage>
    {loading ? <Loading /> : participant && form ? <>
      <section className="grid">
        <article className="card"><span className="muted">Participant type</span><p><Badge>{participant.participantType.replaceAll("_", " ")}</Badge></p></article>
        <article className="card"><span className="muted">Status</span><p><Badge>{participant.status.replaceAll("_", " ")}</Badge></p></article>
        <article className="card"><span className="muted">Invited manually</span><p>{date(participant.invitedAt)}</p></article>
        <article className="card"><span className="muted">Confirmed</span><p>{date(participant.confirmedAt)}</p></article>
      </section>

      <section className="card section">
        <h2>Edit participant record</h2>
        <div className="form-grid">
          <label>Participant type<select value={form.participantType} onChange={(e) => setForm({ ...form, participantType: e.target.value as SmeServicesPilotParticipantType })}>
            {participantTypes.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
          </select></label>
          <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as SmeServicesPilotParticipantStatus })}>
            {statuses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
          </select></label>
          <label>Display name<input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></label>
          <label>Organisation / group<input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} /></label>
          <label>Phone<input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} /></label>
          <label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>City<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
          <label>Pilot zone<input value={form.pilotZone} onChange={(e) => setForm({ ...form, pilotZone: e.target.value })} /></label>
          <label>Related user ID<input value={form.relatedUserId} onChange={(e) => setForm({ ...form, relatedUserId: e.target.value })} /></label>
          <label>Related provider ID<input value={form.relatedProviderId} onChange={(e) => setForm({ ...form, relatedProviderId: e.target.value })} /></label>
          <label>Manual invitation channel<select value={form.invitationChannel} onChange={(e) => setForm({ ...form, invitationChannel: e.target.value as "" | SmeServicesPilotInvitationChannel })}>
            {invitationChannels.map((item) => <option key={item || "NONE"} value={item}>{item ? item.replaceAll("_", " ") : "Not selected"}</option>)}
          </select></label>
        </div>
        <label>Invitation note<textarea value={form.invitationNote} onChange={(e) => setForm({ ...form, invitationNote: e.target.value })} placeholder="Manual coordination note only. This does not send a message." /></label>
        <label>Internal notes<textarea value={form.internalNotes} onChange={(e) => setForm({ ...form, internalNotes: e.target.value })} placeholder="Internal operations note. Do not enter passwords, OTPs, payment secrets or sensitive medical details." /></label>
        <label className="check-row"><input type="checkbox" checked={form.consentConfirmed} onChange={(e) => setForm({ ...form, consentConfirmed: e.target.checked })} /> Consent confirmed manually</label>
        <label className="check-row"><input type="checkbox" checked={form.safetyBriefingCompleted} onChange={(e) => setForm({ ...form, safetyBriefingCompleted: e.target.checked })} /> Safety briefing completed</label>
        <button disabled={saving} onClick={() => void save()}>{saving ? "Saving..." : "Save participant"}</button>
      </section>
    </> : null}
  </PortalShell>;
}
