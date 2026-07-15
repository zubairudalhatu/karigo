"use client";

import { FormEvent, useEffect, useState } from "react";
import { vendorApi, VendorTeamMember } from "../../src/api/vendor.api";
import { DashboardShell, Empty, ErrorMessage, Loading, StatusBadge } from "../../src/components/dashboard";
import { friendlyError } from "../../src/lib/errors";

const roles = ["MANAGER", "ORDER_MANAGER", "CATALOG_MANAGER", "FINANCE", "SUPPORT", "VIEWER"];

export default function TeamPage() {
  const [members, setMembers] = useState<VendorTeamMember[]>([]);
  const [form, setForm] = useState({ fullName: "", email: "", phoneNumber: "", role: "VIEWER" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try { setMembers(await vendorApi.team()); } catch (e) { setError(friendlyError(e)); } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      setError("");
      await vendorApi.inviteTeamMember(form);
      setForm({ fullName: "", email: "", phoneNumber: "", role: "VIEWER" });
      setMessage("Team invitation record created. No SMS or email was sent automatically.");
      await load();
    } catch (e) {
      setError(friendlyError(e, "form"));
    }
  }

  return <DashboardShell>
    <header className="topbar"><div><p className="muted">Access governance</p><h1>Team</h1></div></header>
    {message ? <p className="success">{message}</p> : null}
    <ErrorMessage>{error}</ErrorMessage>
    <form className="card payout-form" onSubmit={submit}>
      <label>Full name<input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></label>
      <label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
      <label>Phone<input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} /></label>
      <label>Role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{roles.map((role) => <option key={role} value={role}>{role.replaceAll("_", " ")}</option>)}</select></label>
      <button>Create invitation record</button>
    </form>
    {loading ? <Loading /> : <section className="section">
      {members.length ? members.map((member) => <article className="card" key={member.id}>
        <strong>{member.fullName}</strong>
        <p className="muted">{member.email || member.phoneNumber || "Contact not supplied"}</p>
        <p><StatusBadge>{member.role}</StatusBadge> <StatusBadge>{member.invitationStatus}</StatusBadge></p>
        {member.invitationStatus === "PENDING" ? <button className="secondary" onClick={async () => { await vendorApi.revokeTeamMember(member.id); await load(); }}>Revoke</button> : null}
      </article>) : <Empty>No team invitations yet.</Empty>}
    </section>}
  </DashboardShell>;
}
