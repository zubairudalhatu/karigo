"use client";

import { useEffect, useState } from "react";
import { AdminVendor, managementApi } from "../../src/api/management.api";
import { Badge, Empty, ErrorMessage, PortalShell } from "../../src/components/portal";
import { friendlyError } from "../../src/lib/errors";

function vendorLocation(vendor: AdminVendor) {
  return `${vendor.city}, ${vendor.state}`;
}

function safetySummary(vendor: AdminVendor) {
  const safety = vendor.cleanupSafety;
  if (!safety) return "Safety check not loaded.";
  if (safety.canPermanentlyDelete) {
    return `Safe to permanently delete. ${safety.removableCatalogRecords.products} catalog product(s) will also be removed.`;
  }
  return safety.blockedBy.join(" ");
}

function documentSummary(vendor: AdminVendor) {
  const documents = vendor.onboardingDocuments ?? [];
  if (!documents.length) return "No onboarding documents submitted.";
  const approved = documents.filter((document) => document.verificationStatus === "APPROVED").length;
  return `${approved}/${documents.length} onboarding document(s) approved.`;
}

function trashSafetySummary(vendor: AdminVendor) {
  const safety = vendor.trashSafety;
  if (!safety) return "Trash safety check not loaded.";
  if (safety.canMoveToTrash) return "Trash allowed: no catalog products or live orders detected.";
  return `Trash locked: ${safety.blockedBy.join(" ")}`;
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [trashedVendors, setTrashedVendors] = useState<AdminVendor[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [active, trash] = await Promise.all([managementApi.vendors(), managementApi.trashedVendors()]);
      setVendors(active);
      setTrashedVendors(trash);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function trashVendor(vendor: AdminVendor) {
    const reason = window.prompt(`Move ${vendor.businessName} to Trash? Add an internal cleanup note.`) ?? undefined;
    try {
      setError("");
      setMessage("");
      await managementApi.trashVendor(vendor.id, reason);
      setMessage(`${vendor.businessName} was moved to Trash.`);
      await load();
    } catch (e) {
      setError(friendlyError(e, "form"));
    }
  }

  async function restoreVendor(vendor: AdminVendor) {
    const reason = window.prompt(`Restore ${vendor.businessName} from Trash? Add an internal note.`) ?? undefined;
    try {
      setError("");
      setMessage("");
      await managementApi.restoreVendor(vendor.id, reason);
      setMessage(`${vendor.businessName} was restored from Trash.`);
      await load();
    } catch (e) {
      setError(friendlyError(e, "form"));
    }
  }

  async function permanentlyDeleteVendor(vendor: AdminVendor) {
    if (!vendor.cleanupSafety?.canPermanentlyDelete) return;
    const confirmed = window.confirm(`Permanently delete ${vendor.businessName}? This only works for trashed test vendors with no protected operational records.`);
    if (!confirmed) return;
    try {
      setError("");
      setMessage("");
      await managementApi.permanentlyDeleteVendor(vendor.id);
      setMessage(`${vendor.businessName} was permanently deleted.`);
      await load();
    } catch (e) {
      setError(friendlyError(e, "form"));
    }
  }

  async function sendActivationLink(vendor: AdminVendor) {
    try {
      setError("");
      setMessage("");
      const result = await managementApi.createVendorActivationLink(vendor.id);
      setMessage(`Activation link sent for ${vendor.businessName}. Expires ${new Date(result.expiresAt).toLocaleString()}. ${result.deliveryWarning}`);
    } catch (e) {
      setError(friendlyError(e, "form"));
    }
  }

  async function reviewDocument(vendor: AdminVendor, documentId: string, status: "APPROVED" | "REJECTED") {
    const adminNote = window.prompt(`Admin note for ${status.toLowerCase()} document review`) ?? undefined;
    try {
      setError("");
      setMessage("");
      await managementApi.reviewVendorOnboardingDocument(vendor.id, documentId, status, adminNote);
      setMessage(`Onboarding document ${status.toLowerCase()} for ${vendor.businessName}.`);
      await load();
    } catch (e) {
      setError(friendlyError(e, "form"));
    }
  }

  async function updateVendorStatus(vendor: AdminVendor, status: "PENDING_APPROVAL" | "ACTIVE" | "SUSPENDED" | "CLOSED" | "REJECTED") {
    const note = window.prompt(`Update ${vendor.businessName} status to ${status.replaceAll("_", " ")}? Add an internal note.`) ?? undefined;
    try {
      setError("");
      setMessage("");
      await managementApi.updateVendorStatus(vendor.id, status, note);
      setMessage(`${vendor.businessName} status updated to ${status.replaceAll("_", " ")}.`);
      await load();
    } catch (e) {
      setError(friendlyError(e, "form"));
    }
  }

  return <PortalShell>
    <h1>Vendors</h1>
    <p className="muted">Clean up staging and pilot test vendor accounts safely. Move vendors to Trash first; permanent deletion is allowed only when the backend confirms there are no protected operational records.</p>
    <p className="success">{message}</p>
    <ErrorMessage>{error}</ErrorMessage>
    <div className="actions"><button className="secondary" onClick={() => void load()}>{loading ? "Refreshing..." : "Refresh"}</button></div>

    <section className="section">
      <h2>Active vendors</h2>
      {vendors.length ? vendors.map((vendor) => <article className="card" key={vendor.id}>
        <strong>{vendor.businessName}</strong>
        <p className="muted">{vendor.businessCategory} - {vendorLocation(vendor)}</p>
        <p><Badge>{vendor.status}</Badge> <Badge>{vendor.user.accountStatus}</Badge></p>
        <p className="muted">Orders recorded: {vendor.totalOrders} - Open now: {vendor.isOpen ? "Yes" : "No"}</p>
        <p className="muted">{trashSafetySummary(vendor)}</p>
        <p className="muted">{documentSummary(vendor)}</p>
        {vendor.onboardingDocuments?.length ? <div className="notice">
          <strong>Onboarding documents</strong>
          {vendor.onboardingDocuments.map((document) => <div className="list-row" key={document.id}>
            <span><a href={document.documentUrl} target="_blank" rel="noreferrer">{document.documentName || document.documentType}</a> <Badge>{document.verificationStatus}</Badge></span>
            <span className="actions">
              <button className="secondary" onClick={() => void reviewDocument(vendor, document.id, "APPROVED")}>Approve</button>
              <button className="secondary" onClick={() => void reviewDocument(vendor, document.id, "REJECTED")}>Reject</button>
            </span>
          </div>)}
        </div> : null}
        <div className="actions">
          <button className="secondary" onClick={() => void sendActivationLink(vendor)}>Send activation link</button>
          <button className="secondary" onClick={() => void updateVendorStatus(vendor, "PENDING_APPROVAL")}>Mark pending</button>
          <button className="secondary" onClick={() => void updateVendorStatus(vendor, "ACTIVE")}>Mark operational</button>
          <button className="secondary" onClick={() => void updateVendorStatus(vendor, "SUSPENDED")}>Suspend</button>
          <button className="secondary" disabled={vendor.trashSafety ? !vendor.trashSafety.canMoveToTrash : true} onClick={() => void trashVendor(vendor)}>Move to Trash</button>
        </div>
      </article>) : <Empty>No active vendors found.</Empty>}
    </section>

    <section className="section">
      <h2>Trash</h2>
      <p className="muted">Trashed vendors are hidden from public discovery and vendor dashboard operations. Restore if needed, or permanently delete only safe test accounts.</p>
      {trashedVendors.length ? trashedVendors.map((vendor) => <article className="card internal" key={vendor.id}>
        <strong>{vendor.businessName}</strong>
        <p className="muted">{vendor.businessCategory} - {vendorLocation(vendor)}</p>
        <p><Badge>In Trash</Badge> <Badge>{vendor.user.accountStatus}</Badge></p>
        <p>{safetySummary(vendor)}</p>
        <div className="actions">
          <button className="secondary" onClick={() => void restoreVendor(vendor)}>Restore</button>
          <button disabled={!vendor.cleanupSafety?.canPermanentlyDelete} onClick={() => void permanentlyDeleteVendor(vendor)}>Delete permanently</button>
        </div>
      </article>) : <Empty>No vendors in Trash.</Empty>}
    </section>
  </PortalShell>;
}
