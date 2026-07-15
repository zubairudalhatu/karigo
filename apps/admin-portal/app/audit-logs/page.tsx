"use client";

import { useEffect, useState } from "react";
import { AdminAuditLog, managementApi } from "../../src/api/management.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../src/components/portal";
import { friendlyError } from "../../src/lib/errors";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    managementApi.auditLogs().then(setLogs).catch((e) => setError(friendlyError(e))).finally(() => setLoading(false));
  }, []);

  return <PortalShell>
    <h1>Audit Logs</h1>
    <p className="muted">Admin governance events across sensitive operations. Values are metadata only; secrets and credentials must never be recorded here.</p>
    <ErrorMessage>{error}</ErrorMessage>
    {loading ? <Loading /> : <section className="section">
      {logs.length ? logs.map((log) => <article className="card" key={log.id}>
        <strong>{log.action}</strong>
        <p className="muted">{new Date(log.createdAt).toLocaleString()} {log.adminUser ? `- ${log.adminUser.fullName}` : ""}</p>
        <p><Badge>{log.entityType}</Badge></p>
      </article>) : <Empty>No audit logs found.</Empty>}
    </section>}
  </PortalShell>;
}
