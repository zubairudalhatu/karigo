"use client";

import { useEffect, useMemo, useState } from "react";
import { KariGoApiError } from "@karigo/shared-types";
import {
  PaymentProviderInitializationTestResult,
  PaymentProviderReadiness,
  PaymentProviderReadinessItem,
  SandboxInitializationTestProvider,
  paymentsApi
} from "../../src/api/payments.api";
import { Badge, Empty, ErrorMessage, Loading, PortalShell } from "../../src/components/portal";

const providerPriority = ["squad", "monnify", "paystack"];
const sandboxTestProviders = ["paystack", "monnify", "squad"];

function providerLabel(value: string) {
  switch (value) {
    case "paystack": return "Paystack";
    case "monnify": return "Monnify";
    case "squad": return "Squad by GTBank";
    case "mock": return "Mock payment";
    default: return value;
  }
}

function launchStatusLabel(value?: string) {
  switch (value) {
    case "PRIMARY_LAUNCH_PROVIDER": return "Primary launch provider";
    case "SECONDARY_LAUNCH_PROVIDER": return "Secondary launch provider";
    case "PENDING_APPROVAL_SECONDARY_PROVIDER": return "Pending approval / future secondary";
    case "DEFERRED_FOR_LAUNCH": return "Deferred for launch";
    case "OPTIONAL_LATER_ENABLED": return "Optional later";
    case "INTERNAL_OR_FALLBACK": return "Internal or fallback";
    default: return value ?? "";
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

function paymentReadinessError(error: unknown) {
  const base = "Payment readiness could not be loaded. Please confirm backend access and admin session.";
  if (error instanceof KariGoApiError) {
    if (error.status === 401 || error.status === 403) return base;
    if (error.status && error.status >= 500) return `${base} Backend returned ${error.status}.`;
    return `${base} ${error.message}`;
  }
  return base;
}

function paymentInitializationTestError(error: unknown) {
  const base = "Sandbox initialization test could not be completed. Please confirm backend access and admin session.";
  if (error instanceof KariGoApiError) {
    if (error.status === 401 || error.status === 403) return base;
    if (error.status && error.status >= 500) return `${base} Backend returned ${error.status}.`;
    return `${base} ${error.message}`;
  }
  return base;
}

function isSandboxTestProvider(provider: string): provider is SandboxInitializationTestProvider {
  return sandboxTestProviders.includes(provider);
}

export default function PaymentReadinessPage() {
  const [readiness, setReadiness] = useState<PaymentProviderReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [testError, setTestError] = useState("");
  const [testingProvider, setTestingProvider] = useState("");
  const [testResults, setTestResults] = useState<Record<string, PaymentProviderInitializationTestResult>>({});

  const providers = useMemo(() => readiness ? sortProviders(readiness.providers) : [], [readiness]);

  function load() {
    setLoading(true);
    setError("");
    paymentsApi.providerReadiness()
      .then(setReadiness)
      .catch((e) => setError(paymentReadinessError(e)))
      .finally(() => setLoading(false));
  }

  function testProvider(provider: SandboxInitializationTestProvider) {
    setTestError("");
    setTestingProvider(provider);
    paymentsApi.testProviderReadiness(provider)
      .then((result) => setTestResults((current) => ({ ...current, [provider]: result })))
      .catch((e) => setTestError(paymentInitializationTestError(e)))
      .finally(() => setTestingProvider(""));
  }

  useEffect(() => { load(); }, []);

  return (
    <PortalShell>
      <header className="topbar">
        <div>
          <p className="muted">Payment launch diagnostics</p>
          <h1>Payment Readiness</h1>
        </div>
        <button className="secondary" onClick={load} disabled={loading}>Refresh</button>
      </header>
      <p className="muted">Admin-only configuration readiness for Squad by GTBank, Monnify, Paystack and mock payment. This page shows key names and safe status only; it does not expose secret values and does not activate live checkout, wallet funding, refunds, payouts or settlements.</p>
      <ErrorMessage>{error}</ErrorMessage>
      <ErrorMessage>{testError}</ErrorMessage>

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
              <p className="metric">1 Squad by GTBank</p>
              <p className="muted">2 Monnify pending approval, 3 Paystack pending approval</p>
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
              <p>Squad by GTBank is the primary launch provider, but live checkout remains blocked until Render environment verification, webhook secret setup and finance/management approval are complete. Mock payment remains a staging rollback path only and must be hidden from public live checkout. Do not paste keys, webhook secrets, test cards or provider dashboard secrets into this page, docs, tickets or screenshots.</p>
            </article>
          </section>

          <section className="section">
            <h2>Provider readiness</h2>
            <div className="grid">
              {providers.map((provider) => {
                const missing = missingRequired(provider);
                const testResult = testResults[provider.provider];
                const sandboxProvider = isSandboxTestProvider(provider.provider) ? provider.provider : null;
                return (
                  <article className="card" key={provider.provider}>
                    <h3>{providerLabel(provider.provider)}</h3>
                    <p><Badge>{provider.status}</Badge> {provider.activeByEnvironment ? <Badge>Environment selected</Badge> : <Badge>Not selected</Badge>}</p>
                    {provider.launchStatus ? <p><Badge>{launchStatusLabel(provider.launchStatus)}</Badge></p> : null}
                    {provider.launchNote ? <p className="muted">{provider.launchNote}</p> : null}
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
                    {sandboxProvider ? (
                      <>
                        <button
                          className="secondary"
                          onClick={() => testProvider(sandboxProvider)}
                          disabled={testingProvider === sandboxProvider}
                        >
                          {testingProvider === sandboxProvider ? "Testing..." : "Test sandbox initialization"}
                        </button>
                        {testResult ? (
                          <div className="item">
                            <span>Latest initialization test</span>
                            <strong>{testResult.success ? "Accepted by provider" : "Failed safely"}</strong>
                            <p className="muted">Stage: {testResult.stage} | Mode: {testResult.mode} | Time: {testResult.timestamp}</p>
                            {testResult.httpStatusCode ? <p className="muted">Provider HTTP status: {testResult.httpStatusCode}</p> : null}
                            {testResult.providerMessage ? <p className="muted">Safe provider message: {testResult.providerMessage}</p> : null}
                            <p className="muted">Authorization URL present: {testResult.authorizationUrlPresent ? "Yes" : "No"} | Access code present: {testResult.accessCodePresent ? "Yes" : "No"}</p>
                          </div>
                        ) : null}
                      </>
                    ) : null}
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
      ) : <Empty>Payment readiness could not be loaded. Please confirm backend access and admin session.</Empty>}
    </PortalShell>
  );
}
