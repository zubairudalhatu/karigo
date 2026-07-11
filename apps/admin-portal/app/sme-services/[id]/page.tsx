"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ServiceProviderRequestStatus, SmeProvider, SmeServiceRequest, smeServicesApi } from "../../../src/api/sme-services.api";
import { Badge, ErrorMessage, Loading, PortalShell } from "../../../src/components/portal";
import { friendlyError } from "../../../src/lib/errors";

const statuses: ServiceProviderRequestStatus[] = ["SUBMITTED", "UNDER_REVIEW", "PROVIDER_MATCHING", "PROVIDER_ASSIGNED", "COMPLETED", "CANCELLED"];

function date(value?: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function SmeServicesRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<SmeServiceRequest | null>(null);
  const [providers, setProviders] = useState<SmeProvider[]>([]);
  const [status, setStatus] = useState<ServiceProviderRequestStatus>("SUBMITTED");
  const [adminNote, setAdminNote] = useState("");
  const [providerId, setProviderId] = useState("");
  const [assignmentNote, setAssignmentNote] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setError("");
    try {
      const item = await smeServicesApi.detail(id);
      setRequest(item);
      setStatus(item.status);
      setAdminNote(item.adminNote ?? "");
      setProviderId(item.assignedProvider?.id ?? "");
      setAssignmentNote(item.assignmentNote ?? "");

      const providerQuery = new URLSearchParams({ status: "APPROVED", serviceType: item.serviceType }).toString();
      const providerData = await smeServicesApi.providers(providerQuery);
      setProviders(providerData.items.filter((provider) => !provider.readinessOnly && provider.serviceType === item.serviceType));
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  useEffect(() => { void load(); }, [id]);

  async function updateStatus() {
    if (!window.confirm("Update this SME Services request status? This does not dispatch a provider, collect payment or activate medical booking.")) return;
    setError("");
    setMessage("");
    try {
      const updated = await smeServicesApi.status(id, status, adminNote);
      setRequest(updated);
      setMessage("SME Services request status updated.");
      await load();
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  async function assignProvider() {
    if (!providerId) {
      setError("Select an approved matching provider first.");
      return;
    }
    if (!window.confirm("Record this manual SME Services provider assignment? This does not dispatch the provider, collect payment, expose provider contact to the customer or activate medical booking.")) return;
    setError("");
    setMessage("");
    try {
      const updated = await smeServicesApi.assignProvider(id, providerId, assignmentNote);
      setRequest(updated);
      setMessage("SME Services provider assignment recorded.");
      await load();
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  if (!request && !error) return <PortalShell><Loading /></PortalShell>;

  return <PortalShell>
    <h1>{request?.requestNumber ?? "SME Services request"}</h1>
    <p className="muted">Operations review only. No live provider dispatch, payout, service payment or healthcare booking is enabled.</p>
    <div className="top-actions">
      <Link className="button-link" href="/sme-services/providers">Provider directory</Link>
    </div>
    <p className="success">{message}</p>
    <ErrorMessage>{error}</ErrorMessage>
    {request ? <div className="detail-grid">
      <section className="section">
        <article className="card">
          <h2>{request.serviceLabel}</h2>
          <p><Badge>{request.status}</Badge> {request.readinessOnly ? <Badge>Readiness Only</Badge> : null}</p>
          <p>{request.description}</p>
          {request.customerNote ? <p><strong>Customer note:</strong> {request.customerNote}</p> : null}
        </article>
        <article className="card">
          <h2>Customer and location</h2>
          <p><strong>{request.customer.user.fullName}</strong></p>
          <p className="muted">{request.customer.user.phoneNumber} - {request.customer.user.email ?? "No email"}</p>
          <p><strong>Request contact:</strong> {request.contactPhone}</p>
          <p>{request.serviceAddress.label}: {request.serviceAddress.addressLine}, {request.serviceAddress.city}, {request.serviceAddress.state}, {request.serviceAddress.country}</p>
        </article>
        <article className="card">
          <h2>Schedule</h2>
          <p><strong>Preferred date:</strong> {request.preferredDate || "Not set"}</p>
          <p><strong>Preferred time:</strong> {request.preferredTimeWindow || "Not set"}</p>
          <p className="muted">Created {date(request.createdAt)} - Updated {date(request.updatedAt)}</p>
        </article>
        <article className="card">
          <h2>Manual provider assignment</h2>
          {request.assignedProvider ? <>
            <p><strong>{request.assignedProvider.fullName}</strong> <Badge>{request.assignedProvider.status}</Badge></p>
            <p>{request.assignedProvider.businessName || "Independent provider"} - {request.assignedProvider.serviceType.replaceAll("_", " ")}</p>
            <p className="muted">{request.assignedProvider.providerCode} - Assigned {date(request.assignedAt)}</p>
            <p>{request.assignmentNote || "No assignment note."}</p>
          </> : <p className="muted">No provider assigned yet.</p>}
          <p className="muted">Provider contact details remain admin-only and are not returned to Customer App request endpoints.</p>
        </article>
        <article className="card">
          <h2>Review history</h2>
          {request.reviewHistory?.length ? request.reviewHistory.map((item) => <div className="item" key={item.id}>
            <span>{item.action.replaceAll("_", " ")}</span>
            <span className="muted">{item.adminUser?.fullName ?? "Admin"} - {date(item.createdAt)}</span>
          </div>) : <p className="muted">No admin status changes recorded yet.</p>}
        </article>
      </section>
      <aside className="card review-panel">
        <h2>Update review status</h2>
        <label>Status<select value={status} onChange={(e) => setStatus(e.target.value as ServiceProviderRequestStatus)}>
          {statuses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
        </select></label>
        <label>Admin note<textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Internal operation note. Do not enter payment secrets, OTPs or sensitive medical details." /></label>
        <button onClick={() => void updateStatus()}>Save status</button>
        <h2>Assign provider</h2>
        <label>Approved provider<select value={providerId} onChange={(e) => setProviderId(e.target.value)}>
          <option value="">Select provider</option>
          {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.providerCode} - {provider.fullName}</option>)}
        </select></label>
        <label>Assignment note<textarea value={assignmentNote} onChange={(e) => setAssignmentNote(e.target.value)} placeholder="Internal note for manual coordination. Do not enter payment details, OTPs or sensitive health information." /></label>
        <button onClick={() => void assignProvider()}>Record manual assignment</button>
        <p className="muted">Manual assignment updates the request status to PROVIDER_ASSIGNED only. It does not notify or dispatch the provider automatically.</p>
      </aside>
    </div> : null}
  </PortalShell>;
}
