"use client";

import { FormEvent, useEffect, useState } from "react";
import { vendorApi, VendorBranch } from "../../src/api/vendor.api";
import { DashboardShell, Empty, ErrorMessage, Loading, StatusBadge } from "../../src/components/dashboard";
import { friendlyError } from "../../src/lib/errors";

const emptyBranch = { name: "", address: "", city: "Kano", state: "Kano", area: "", phoneNumber: "", isPrimary: false, status: "ACTIVE" };

export default function BranchesPage() {
  const [branches, setBranches] = useState<VendorBranch[]>([]);
  const [form, setForm] = useState(emptyBranch);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try { setBranches(await vendorApi.branches()); } catch (e) { setError(friendlyError(e)); } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      setError("");
      await vendorApi.createBranch(form);
      setForm(emptyBranch);
      setMessage("Branch saved.");
      await load();
    } catch (e) {
      setError(friendlyError(e, "form"));
    }
  }

  return <DashboardShell>
    <header className="topbar"><div><p className="muted">Vendor locations</p><h1>Branches</h1></div></header>
    {message ? <p className="success">{message}</p> : null}
    <ErrorMessage>{error}</ErrorMessage>
    <form className="card payout-form" onSubmit={submit}>
      <label>Branch name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
      <label>Address<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required /></label>
      <label>Area<input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></label>
      <label>Phone<input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} /></label>
      <label className="check-row"><input type="checkbox" checked={form.isPrimary} onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })} /> Primary branch</label>
      <button>Add branch</button>
    </form>
    {loading ? <Loading /> : <section className="section">
      {branches.length ? branches.map((branch) => <article className="card" key={branch.id}>
        <strong>{branch.name}</strong>
        <p className="muted">{branch.address}{branch.area ? ` - ${branch.area}` : ""}, {branch.city}</p>
        <p><StatusBadge>{branch.status}</StatusBadge> {branch.isPrimary ? <StatusBadge>Primary</StatusBadge> : null}</p>
      </article>) : <Empty>No branches yet. Add your main business location first.</Empty>}
    </section>}
  </DashboardShell>;
}
