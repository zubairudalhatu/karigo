"use client";

import { useEffect, useState } from "react";
import { LoginActivity, managementApi } from "../../src/api/management.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../src/components/portal";
import { friendlyError } from "../../src/lib/errors";

export default function LoginActivityPage() {
  const [items, setItems] = useState<LoginActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    managementApi.loginActivity().then(setItems).catch((e) => setError(friendlyError(e))).finally(() => setLoading(false));
  }, []);

  return <PortalShell>
    <h1>Login Activity</h1>
    <p className="muted">Authentication activity is stored with masked phone numbers only. Passwords, OTPs and tokens are never logged.</p>
    <ErrorMessage>{error}</ErrorMessage>
    {loading ? <Loading /> : <section className="section">
      {items.length ? items.map((item) => <article className="card" key={item.id}>
        <strong>{item.user?.fullName ?? item.phoneNumberMasked ?? "Unknown user"}</strong>
        <p className="muted">{new Date(item.createdAt).toLocaleString()} - {item.reason ?? "Authentication event"}</p>
        <p><Badge>{item.outcome}</Badge> {item.role ? <Badge>{item.role}</Badge> : null}</p>
      </article>) : <Empty>No login activity found.</Empty>}
    </section>}
  </PortalShell>;
}
