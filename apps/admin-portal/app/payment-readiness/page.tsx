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

const providerPriority = ["flutterwave", "squad", "monnify", "paystack"];
const sandboxTestProviders = ["paystack", "monnify", "squad"];

function providerLabel(value: string) {
  switch (value) {
    case "flutterwave": return "Flutterwave";
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
  const modeRequirement = provider.requirements.find((requirement) =>
    requirement.name.endsWith("_MODE") || requirement.name === "FLUTTERWAVE_ENVIRONMENT"
  );
  if (!modeRequirement) return "Not required";
  if (modeRequirement.issue) return "Missing or invalid";
  return modeRequirement.configured ? "Configured" : "Missing";
}

function configuredRequirement(provider: PaymentProviderReadinessItem, name: string) {
  return provider.requirements.find((item) => item.name === name);
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

function requirementConfigured(provider: PaymentProviderReadinessItem, name: string) {
  const requirement = provider.requirements.find((item) => item.name === name);
  return Boolean(requirement?.configured && !requirement.issue);
}

function yesNo(value?: boolean) {
  return value ? "Yes" : "No";
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
      <p className="muted">Admin-only configuration readiness for Flutterwave, Cash / Pay on Delivery, Wallet, Squad, Monnify, Paystack and mock payment. This page shows key names and safe status only; it does not expose secret values and does not activate live checkout, wallet funding, refunds, payouts or settlements. Admin does not initiate customer payments from this page; the Customer App initiates checkout and backend verification confirms the final payment state.</p>
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
              <p className="metric">1 Flutterwave</p>
              <p className="muted">2 Pay on Delivery fallback, 3 Squad disabled/internal review, 4 Monnify/Paystack pending approval</p>
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
              <p>Flutterwave is KariGO's primary online customer checkout provider. Pay on Delivery remains enabled for supported KariGO cities. Squad is disabled/internal review after live routing issues. Mock payment remains a staging rollback path only and must be hidden from public live checkout. Do not paste keys, webhook secrets, test cards or provider dashboard secrets into this page, docs, tickets or screenshots.</p>
            </article>
          </section>

          {readiness.launchPaymentOptions ? (
            <section className="section">
              <h2>Launch payment options</h2>
              <div className="grid">
                <article className="card">
                  <h3>{readiness.launchPaymentOptions.cashOnDelivery.label}</h3>
                  <p><Badge>{readiness.launchPaymentOptions.cashOnDelivery.enabled ? "Enabled" : "Disabled"}</Badge></p>
                  <div className="item"><span>Launch cities</span><strong>{readiness.launchPaymentOptions.cashOnDelivery.launchCities.join(", ")}</strong></div>
                  <div className="item"><span>Customer selectable</span><strong>{yesNo(readiness.launchPaymentOptions.cashOnDelivery.customerSelectable)}</strong></div>
                  <div className="item"><span>Requires reconciliation</span><strong>{yesNo(readiness.launchPaymentOptions.cashOnDelivery.requiresReconciliation)}</strong></div>
                  <div className="item"><span>Admin reconciliation available</span><strong>{yesNo(readiness.launchPaymentOptions.cashOnDelivery.adminReconciliationAvailable)}</strong></div>
                  <div className="item"><span>Captain cash collection confirmation available</span><strong>{yesNo(readiness.launchPaymentOptions.cashOnDelivery.captainCashCollectionConfirmationAvailable)}</strong></div>
                  <div className="item"><span>Vendor visibility available</span><strong>{yesNo(readiness.launchPaymentOptions.cashOnDelivery.vendorVisibilityAvailable)}</strong></div>
                  <p className="muted">Flag: {readiness.launchPaymentOptions.cashOnDelivery.envFlag}={readiness.launchPaymentOptions.cashOnDelivery.recommendedValue}</p>
                  <p className="muted">{readiness.launchPaymentOptions.cashOnDelivery.note}</p>
                </article>
                {readiness.launchPaymentOptions.flutterwaveCustomerCheckout ? (
                  <article className="card">
                    <h3>{readiness.launchPaymentOptions.flutterwaveCustomerCheckout.label}</h3>
                    <p><Badge>{readiness.launchPaymentOptions.flutterwaveCustomerCheckout.enabled ? "Enabled" : "Disabled"}</Badge></p>
                    <div className="item"><span>Customer selectable</span><strong>{yesNo(readiness.launchPaymentOptions.flutterwaveCustomerCheckout.customerSelectable)}</strong></div>
                    <div className="item"><span>API mode</span><strong>{readiness.launchPaymentOptions.flutterwaveCustomerCheckout.apiModeLabel ?? "v3 Standard checkout"}</strong></div>
                    <div className="item"><span>V3 secret configured</span><strong>{yesNo(readiness.launchPaymentOptions.flutterwaveCustomerCheckout.v3SecretConfigured)}</strong></div>
                    <div className="item"><span>V3 hosted checkout ready</span><strong>{yesNo(readiness.launchPaymentOptions.flutterwaveCustomerCheckout.v3StandardCheckoutReady)}</strong></div>
                    <div className="item"><span>V4 credentials configured</span><strong>{yesNo(readiness.launchPaymentOptions.flutterwaveCustomerCheckout.v4CredentialsConfigured)}</strong></div>
                    <div className="item"><span>V4 endpoint configured</span><strong>{yesNo(readiness.launchPaymentOptions.flutterwaveCustomerCheckout.v4EndpointConfigured)}</strong></div>
                    <div className="item"><span>V4 checkout path</span><strong>{readiness.launchPaymentOptions.flutterwaveCustomerCheckout.v4CheckoutPath ?? "/orders"}</strong></div>
                    <div className="item"><span>Access-token/auth readiness</span><strong>{readiness.launchPaymentOptions.flutterwaveCustomerCheckout.accessTokenAuthReady ? "Ready for token request" : "Required only for v4 mode"}</strong></div>
                    <div className="item"><span>Live mode configured</span><strong>{yesNo(readiness.launchPaymentOptions.flutterwaveCustomerCheckout.liveModeConfigured)}</strong></div>
                    <div className="item"><span>Webhook configured</span><strong>{yesNo(readiness.launchPaymentOptions.flutterwaveCustomerCheckout.webhookConfigured)}</strong></div>
                    <div className="item"><span>Callback configured</span><strong>{yesNo(readiness.launchPaymentOptions.flutterwaveCustomerCheckout.callbackConfigured)}</strong></div>
                    <p className="muted">Flag: {readiness.launchPaymentOptions.flutterwaveCustomerCheckout.envFlag}={readiness.launchPaymentOptions.flutterwaveCustomerCheckout.recommendedValue}</p>
                    <p className="muted">{readiness.launchPaymentOptions.flutterwaveCustomerCheckout.note}</p>
                  </article>
                ) : null}
                <article className="card">
                  <h3>{readiness.launchPaymentOptions.squadCustomerCheckout.label}</h3>
                  <p><Badge>{readiness.launchPaymentOptions.squadCustomerCheckout.enabled ? "Enabled" : "Disabled / Internal review"}</Badge></p>
                  <div className="item"><span>Customer selectable</span><strong>{yesNo(readiness.launchPaymentOptions.squadCustomerCheckout.customerSelectable)}</strong></div>
                  <p className="muted">Flag: {readiness.launchPaymentOptions.squadCustomerCheckout.envFlag}={readiness.launchPaymentOptions.squadCustomerCheckout.recommendedValue}</p>
                  <p className="muted">{readiness.launchPaymentOptions.squadCustomerCheckout.note}</p>
                </article>
                <article className="card">
                  <h3>Wallet readiness</h3>
                  <p><Badge>{readiness.launchPaymentOptions.wallet.walletTopUpEnabled ? "Top-up enabled" : "Top-up disabled"}</Badge> <Badge>{readiness.launchPaymentOptions.wallet.walletPaymentsEnabled ? "Payments enabled" : "Payments disabled"}</Badge></p>
                  <div className="item"><span>Top-up configured by env</span><strong>{yesNo(readiness.launchPaymentOptions.wallet.walletTopUpConfiguredByEnv)}</strong></div>
                  <div className="item"><span>Provider for top-up</span><strong>{readiness.launchPaymentOptions.wallet.providerForTopUp}</strong></div>
                  <div className="item"><span>Minimum top-up amount</span><strong>NGN {readiness.launchPaymentOptions.wallet.minimumTopUpAmount}</strong></div>
                  <div className="item"><span>Backend verification required</span><strong>{yesNo(readiness.launchPaymentOptions.wallet.backendVerificationRequired)}</strong></div>
                  <div className="item"><span>Client-side credit disabled</span><strong>{yesNo(readiness.launchPaymentOptions.wallet.clientSideCreditDisabled)}</strong></div>
                  <div className="item"><span>Admin wallet visibility available</span><strong>{yesNo(readiness.launchPaymentOptions.wallet.adminWalletVisibilityAvailable)}</strong></div>
                  <p className="muted">Recommended launch values: WALLET_TOP_UP_ENABLED={readiness.launchPaymentOptions.wallet.recommendedValues.WALLET_TOP_UP_ENABLED}, WALLET_PAYMENTS_ENABLED={readiness.launchPaymentOptions.wallet.recommendedValues.WALLET_PAYMENTS_ENABLED}</p>
                  <p className="muted">{readiness.launchPaymentOptions.wallet.note}</p>
                </article>
              </div>
            </section>
          ) : null}

          {readiness.utilityReadiness ? (
            <section className="section">
              <h2>Bills & Utilities provider readiness</h2>
              <p className="muted">Accelerate.ng readiness is shown for backend/provider setup only. Customer utility processing remains controlled by explicit Utilities flags.</p>
              <div className="grid">
                <article className="card">
                  <h3>{readiness.utilityReadiness.providerLabel}</h3>
                  <p><Badge>{readiness.utilityReadiness.accountStatus}</Badge> <Badge>{readiness.utilityReadiness.integrationStatus}</Badge></p>
                  <div className="item"><span>Backend utilities enabled</span><strong>{yesNo(readiness.utilityReadiness.enabled)}</strong></div>
                  <div className="item"><span>Test mode</span><strong>{yesNo(readiness.utilityReadiness.testMode)}</strong></div>
                  <div className="item"><span>Customer purchases</span><strong>{readiness.utilityReadiness.liveCustomerPurchaseStatus}</strong></div>
                  <div className="item"><span>Wallet utility payment</span><strong>{yesNo(readiness.utilityReadiness.walletPaymentEnabled)}</strong></div>
                  <div className="item"><span>Live provider fulfilment</span><strong>{yesNo(readiness.utilityReadiness.liveFulfillmentEnabled)}</strong></div>
                  <div className="item"><span>Payment method</span><strong>{readiness.utilityReadiness.paymentMethod ?? "READINESS_ONLY"}</strong></div>
                  <div className="item"><span>Backend connectivity test available</span><strong>{yesNo(readiness.utilityReadiness.backendConnectivityTestAvailable)}</strong></div>
                  <div className="item"><span>Missing required keys</span><strong>{readiness.utilityReadiness.missingRequiredKeys.length}</strong></div>
                  <p className="muted">{readiness.utilityReadiness.walletPaymentEnabled && readiness.utilityReadiness.liveFulfillmentEnabled
                    ? "Wallet-to-utility payment is enabled for Utilities only. Backend balance checks, wallet ledger debit and automatic reversal controls are required for every provider request."
                    : "Wallet-to-utility payment remains disabled until Utilities customer purchases, wallet payment and live fulfilment flags are explicitly enabled."}</p>
                  {readiness.utilityReadiness.notes.map((note) => <p className="muted" key={note}>{note}</p>)}
                </article>
                <article className="card">
                  <h3>Accelerate configuration keys</h3>
                  <table className="table">
                    <thead><tr><th>Variable</th><th>Required</th><th>Status</th></tr></thead>
                    <tbody>
                      {readiness.utilityReadiness.requiredEnv.map((requirement) => (
                        <tr key={requirement.name}>
                          <td>{requirement.name}</td>
                          <td>{requirement.required ? "Yes" : "No"}</td>
                          <td><Badge>{requirement.issue ? "Not ready" : requirement.configured ? "Configured" : "Optional"}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </article>
              </div>
            </section>
          ) : null}

          <section className="section">
            <h2>Provider readiness</h2>
            <div className="grid">
              {providers.map((provider) => {
                const missing = missingRequired(provider);
                const testResult = testResults[provider.provider];
                const sandboxProvider = isSandboxTestProvider(provider.provider) ? provider.provider : null;
                const liveFlutterwave = readiness.paymentsLiveEnabled && provider.provider === "flutterwave";
                const showSandboxTest = Boolean(sandboxProvider && !readiness.paymentsLiveEnabled);
                const configured = missing.length === 0;
                const customerCheckoutRequirement = configuredRequirement(provider, "FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED");
                const flutterwaveLaunch = readiness.launchPaymentOptions?.flutterwaveCustomerCheckout;
                const liveModeConfigured = requirementConfigured(provider, "FLUTTERWAVE_ENVIRONMENT");
                const flutterwaveApiModeConfigured = requirementConfigured(provider, "FLUTTERWAVE_API_MODE");
                const webhookCallbackConfigured = requirementConfigured(provider, "FLUTTERWAVE_SECRET_HASH or FLUTTERWAVE_WEBHOOK_SECRET") && requirementConfigured(provider, "FLUTTERWAVE_REDIRECT_URL or FLUTTERWAVE_CALLBACK_URL");
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
                    {liveFlutterwave ? (
                      <div className="item">
                        <span>Live launch check</span>
                        <strong>Verify live readiness</strong>
                        <p className="muted">Configured: {configured ? "Yes" : "No"}.</p>
                        <p className="muted">Customer checkout enabled: {customerCheckoutRequirement?.configured && !customerCheckoutRequirement.issue ? "Yes" : "No"}.</p>
                        <p className="muted">API mode: {flutterwaveLaunch?.apiModeLabel ?? "v3 Standard checkout"}; explicit config: {flutterwaveApiModeConfigured ? "Yes" : "No"}.</p>
                        <p className="muted">V3 Standard checkout: {flutterwaveLaunch?.v3StandardCheckoutReady ? "Ready for hosted link" : "Missing v3 secret or valid v3 API base"}.</p>
                        <p className="muted">V4 OAuth/direct API: {flutterwaveLaunch?.v4CredentialsConfigured && flutterwaveLaunch?.v4EndpointConfigured ? "Configured" : "Not configured for launch checkout"}.</p>
                        <p className="muted">Access-token/auth readiness: {flutterwaveLaunch?.accessTokenAuthReady ? "Ready for token request" : "Required only for v4 mode"}.</p>
                        <p className="muted">Primary launch provider. Live mode configured: {liveModeConfigured ? "Yes" : "No"}.</p>
                        <p className="muted">Webhook/callback configured: {webhookCallbackConfigured ? "Yes" : "No"}.</p>
                        <p className="muted">Low-value live test required: Yes, but this is not a configuration blocker.</p>
                        <p className="muted">Low-value live test required for operations verification only. This page is read-only in live mode and does not initiate customer payment.</p>
                      </div>
                    ) : showSandboxTest && sandboxProvider ? (
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
                    ) : readiness.paymentsLiveEnabled ? (
                      <p className="muted">Read-only in live mode. This provider remains pending approval or deferred and cannot be initialized from this page.</p>
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
