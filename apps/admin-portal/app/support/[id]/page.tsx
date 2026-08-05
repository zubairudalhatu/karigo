"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  type AdminSupportTicket,
  type SupportTicketPriority,
  supportApi
} from "../../../src/api/support.api";
import { ErrorMessage, Loading, PortalShell } from "../../../src/components/portal";
import { friendlyError } from "../../../src/lib/errors";
import {
  nextSupportTicketStatuses,
  type SupportTicketStatus
} from "../../../src/lib/support-ticket-status";

const priorities: SupportTicketPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const statusLabel = (status: SupportTicketStatus) => status.replaceAll("_", " ");

export default function Ticket() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<AdminSupportTicket | null>(null);
  const [status, setStatus] = useState<SupportTicketStatus | "">("");
  const [priority, setPriority] = useState<SupportTicketPriority>("MEDIUM");
  const [message, setMessage] = useState("");
  const [internal, setInternal] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [error, setError] = useState("");
  const [messageSuccess, setMessageSuccess] = useState("");
  const [statusError, setStatusError] = useState("");
  const [statusSuccess, setStatusSuccess] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);

  function syncTicket(nextTicket: AdminSupportTicket) {
    setTicket(nextTicket);
    setPriority(nextTicket.priority);
    setStatus(nextSupportTicketStatuses(nextTicket.status)[0] ?? "");
  }

  async function load() {
    try {
      const nextTicket = await supportApi.detail(id);
      syncTicket(nextTicket);
      setError("");
    } catch (loadError) {
      setError(friendlyError(loadError));
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function updateStatus() {
    if (!status || statusSaving) return;

    setStatusSaving(true);
    setStatusError("");
    setStatusSuccess("");
    try {
      await supportApi.status(id, status, priority);
      const refreshedTicket = await supportApi.detail(id);
      syncTicket(refreshedTicket);
      setStatusSuccess(`Support ticket status updated to ${statusLabel(refreshedTicket.status)}.`);
    } catch (updateError) {
      setStatusError(friendlyError(updateError, "form"));
    } finally {
      setStatusSaving(false);
    }
  }

  if (!ticket && !error) return <PortalShell><Loading /></PortalShell>;

  const nextStatuses = ticket ? nextSupportTicketStatuses(ticket.status) : [];

  return <PortalShell>
    <h1>{ticket?.ticketNumber}</h1>
    {messageSuccess ? <p className="success">{messageSuccess}</p> : null}
    <ErrorMessage>{error}</ErrorMessage>
    {ticket ? <>
      <article className="card">
        <h2>{ticket.subject}</h2>
        <p>{ticket.description}</p>
        <p>{statusLabel(ticket.status)} · {ticket.priority} · {ticket.category}</p>
      </article>
      <section className="section">
        {ticket.messages?.map((ticketMessage) => <article className={`card ${ticketMessage.isInternalNote ? "internal" : ""}`} key={ticketMessage.id}>
          <strong>{ticketMessage.isInternalNote ? "Internal note" : ticketMessage.senderRole}</strong>
          <p>{ticketMessage.message}</p>
        </article>)}
      </section>
      <article className="card">
        <h2>Update ticket</h2>
        <input value={adminId} onChange={(event) => setAdminId(event.target.value)} placeholder="Admin user UUID for assignment" />
        <button disabled={!adminId} onClick={async () => {
          await supportApi.assign(id, adminId);
          setMessageSuccess("Support ticket assigned.");
          await load();
        }}>Assign</button>

        <label>Next status
          <select
            value={status}
            disabled={statusSaving}
            onChange={(event) => {
              setStatus(event.target.value as SupportTicketStatus);
              setStatusError("");
              setStatusSuccess("");
            }}
          >
            {nextStatuses.map((nextStatus) => <option key={nextStatus} value={nextStatus}>{statusLabel(nextStatus)}</option>)}
          </select>
        </label>
        <p className="muted">Resolve the ticket before closing it. Closing is available only from RESOLVED.</p>
        <label>Priority
          <select
            value={priority}
            disabled={statusSaving}
            onChange={(event) => {
              setPriority(event.target.value as SupportTicketPriority);
              setStatusError("");
              setStatusSuccess("");
            }}
          >
            {priorities.map((nextPriority) => <option key={nextPriority} value={nextPriority}>{nextPriority}</option>)}
          </select>
        </label>
        <button disabled={!status || statusSaving} onClick={() => void updateStatus()}>
          {statusSaving ? "Updating status..." : "Update status"}
        </button>
        {statusSuccess ? <p className="success" role="status">{statusSuccess}</p> : null}
        <ErrorMessage>{statusError}</ErrorMessage>

        <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Message" />
        <label><input type="checkbox" style={{ width: "auto" }} checked={internal} onChange={(event) => setInternal(event.target.checked)} /> Internal note</label>
        <button disabled={!message} onClick={async () => {
          await supportApi.message(id, message, internal);
          setMessage("");
          setMessageSuccess("Support message added.");
          await load();
        }}>Add message</button>
      </article>
    </> : null}
  </PortalShell>;
}
