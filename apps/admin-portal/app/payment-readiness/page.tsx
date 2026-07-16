"use client";

import { useEffect, useMemo, useState } from "react";
import { PaymentProviderReadiness, PaymentProviderReadinessItem, paymentsApi } from "../../src/api/payments.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../src/components/portal";
import { friendlyError } from "../../src/lib/errors";

const providerPriority = ["monnify", "paystack", "squad"];

function providerLabel(value: string) {
  switch (value) {
    case "paystack": return "Paystack Test Mode";
    case "monnify": return "Monnify Sandbox";
    case "squad": return "Squad Sandbox";
    case "mock": return "Mock payment";
    default: return value;
  }
}

function modeStatus(provider: PaymentProviderReadinessItem) {
  const modeRequirement = provider.requirements.find((requirement) => requirement.name.endsWith("_MODE"));
  if (!modeRequirement) return "Not required";
  if (modeRequirement.issue) return "Missing or invalid";
  return modeRequirement.configured ? "Configured" : "Missing";
}

function missingRequired(provider: PaymentProviderReadinessItem) {
  return provider.requirements
    .filter((requirement) => requirement.required && (!requirement.configured || requirement.issue))
    .map((requirement) => requirement.issue ?? `missing ${requirement.name}`);
}

function sortProviders(providers: PaymentProviderReadinessItem[]) {
  return [...providers].sort((a, b) => {
    if (a.provider === "mock") return -1;
    if (b.provider === "mock") return 1;
    const aPriority = providerPriority.indexOf(a.provider);
    const bPriority = providerPriority.indexOf(b.provider);
    return (aPriority === -1 ? 99 : aPriority) - (bPriority === -1 ? 99 : bPriority);
  });
}

export default function PaymentReadinessPage() {
  const [readiness, setReadiness] = useState<PaymentProviderReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const providers = useMemo(() => readiness ? sortProviders(readiness.providers) : [], [readiness]);

  function load() {
    setLoading(true);
    setError("");
    paymentsApi.providerReadiness()
      .then(setReadiness)
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  return (
    <PortalShell>
      <header className="topbar">
        <div>
          <p className="muted">Sandbox payment diagnostics</p>
          <h1>Payment Readiness</h1>
        </div>
        <button className="secondary" onClick={load} disabled={loading}>Refresh</button>
      </header>
      <p className="muted">Admin-only configuration readiness for mock payment, Paystack Test Mode, Monnify Sandbox and Squad Sandbox. This page does not expose secret values and does not activate live checkout, wallet funding, refunds, payouts or settlements.</p>
      <ErrorMessage>{error}</ErrorMessage>

      {loading ? <Loading /> : readiness ? (
        <>
          <section className="grid">
            <article className="card">
              <span className="muted">Active environment provider</span>
              <p><Badge>{providerLabel(readiness.activeProvider)}</Badge></p>
            </article>
            <article className="card">
              <span className="muted">Live payments</span>
              <p><Badge>{readiness.paymentsLiveEnabled ? "Enabled" : "Disabled"}</Badge></p>
            </article>
            <article className="card">
              <span className="muted">Launch priority</span>
              <p className="metric">1 Monnify</p>
              <p className="muted">2 Paystack, 3 Squad later</p>
            </article>
            <article className="card">
              <span className="muted">Live activation</span>
              <p><Badge>{readiness.liveActivation.status}</Badge></p>
              <p className="muted">Supported now: {readiness.liveActivation.supportedByCurrentCode ? "Yes" : "No"}</p>
            </article>
          </section>

          <section className="section">
            <article className="card internal">
              <h2>Safety guardrail</h2>
              <p>Mock payment remains the default rollback path. Configure sandbox credentials only in Render environment variables or the approved secret manager. Do not paste keys, webhook secrets, test cards or provider dashboard secrets into this page, docs, tickets or screenshots.</p>
            </article>
          </section>

          <section className="section">
            <h2>Provider readiness</h2>
            <div className="grid">
              {providers.map((provider) => {
                const missing = missingRequired(provider);
                return (
                  <article className="card" key={provider.provider}>
                    <h3>{providerLabel(provider.provider)}</h3>
                    <p><Badge>{provider.status}</Badge> {provider.activeByEnvironment ? <Badge>Environment selected</Badge> : <Badge>Not selected</Badge>}</p>
                    <p className="muted">Mode: {modeStatus(provider)}</p>
                    <p className="muted">Customer selectable: {provider.customerSelectableInStaging ? "Yes" : "No"} | Sandbox ready: {provider.readyForSandboxCheckout ? "Yes" : "No"}</p>
                    <div className="item"><span>Enabled/disabled</span><strong>{provider.activeByEnvironment ? "Enabled by env" : provider.customerSelectableInStaging ? "Selectable when configured" : "Fallback only"}</strong></div>
                    <div className="item"><span>Missing required keys</span><strong>{missing.length}</strong></div>
                    {missing.length ? (
                      <ul>
                        {missing.map((issue) => <li key={issue}>{issue}</li>)}
                      </ul>
                    ) : <p className="success">No required configuration gaps reported.</p>}
                    {provider.recommendations?.length ? <p className="muted">{provider.recommendations[0]}</p> : null}
                    {provider.recommendedActions?.length ? <p className="muted">{provider.recommendedActions[0]}</p> : null}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="section">
            <h2>Configuration details</h2>
            <table className="table">
              <thead><tr><th>Provider</th><th>Variable</th><th>Required</th><th>Status</th><th>Safe note</th></tr></thead>
              <tbody>
                {providers.flatMap((provider) => provider.requirements.map((requirement) => (
                  <tr key={`${provider.provider}-${requirement.name}`}>
                    <td>{providerLabel(provider.provider)}</td>
                    <td>{requirement.name}</td>
                    <td>{requirement.required ? "Yes" : "No"}</td>
                    <td><Badge>{requirement.issue ? "Not ready" : requirement.configured ? "Configured" : "Optional"}</Badge></td>
                    <td>{requirement.issue ?? requirement.purpose}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          </section>

          <section className="section">
            <h2>Webhook routes</h2>
            <div className="grid">
              {Object.entries(readiness.webhookRoutes).map(([provider, route]) => (
                <article className="card" key={provider}>
                  <span className="muted">{providerLabel(provider)}</span>
                  <p><strong>{route}</strong></p>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : <Empty>Payment readiness could not be loaded.</Empty>}
    </PortalShell>
  );
}
