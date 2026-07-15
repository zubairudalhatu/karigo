"use client";

import { useEffect, useState } from "react";
import { vendorApi, VendorAuditLog } from "../../src/api/vendor.api";
import { DashboardShell, Empty, ErrorMessage, Loading, StatusBadge } from "../../src/components/dashboard";
import { friendlyError } from "../../src/lib/errors";

export default function VendorAuditLogsPage() {
  const [logs, setLogs] = useState<VendorAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    vendorApi.auditLogs().then(setLogs).catch((e) => setError(friendlyError(e))).finally(() => setLoading(false));
  }, []);

  return <DashboardShell>
    <header className="topbar"><div><p className="muted">Workspace governance</p><h1>Audit logs</h1></div></header>
    <ErrorMessage>{error}</ErrorMessage>
    {loading ? <Loading /> : <section className="section">
      {logs.length ? logs.map((log) => <article className="card" key={log.id}>
        <strong>{log.action.replaceAll("_", " ")}</strong>
        <p className="muted">{new Date(log.createdAt).toLocaleString()} {log.actor ? `- ${log.actor.fullName}` : ""}</p>
        <p><StatusBadge>{log.entityType}</StatusBadge></p>
      </article>) : <Empty>No vendor audit logs yet.</Empty>}
    </section>}
  </DashboardShell>;
}
