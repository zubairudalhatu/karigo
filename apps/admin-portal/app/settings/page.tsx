"use client";

import { useEffect, useState } from "react";
import { IntegrationSettings, managementApi } from "../../src/api/management.api";
import { Badge, ErrorMessage, Loading, PortalShell } from "../../src/components/portal";
import { friendlyError } from "../../src/lib/errors";

function flag(value: boolean) {
  return <Badge>{value ? "Yes" : "No"}</Badge>;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<IntegrationSettings | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    managementApi.integrationSettings().then(setSettings).catch((e) => setError(friendlyError(e)));
  }, []);

  return <PortalShell>
    <h1>Developer Settings</h1>
    <p className="muted">Read-only integration mode visibility. This page does not expose keys and does not switch live providers on.</p>
    <ErrorMessage>{error}</ErrorMessage>
    {!settings ? <Loading /> : <section className="section">
      <article className="card">
        <h2>Payments</h2>
        <p>Provider: <strong>{settings.payments.provider}</strong></p>
        <p>Live enabled: {flag(settings.payments.liveEnabled)} Mock fallback: {flag(settings.payments.mockFallbackAvailable)}</p>
        <p className="muted">Paystack configured: {String(settings.payments.sandboxProviders.paystackConfigured)} - Monnify configured: {String(settings.payments.sandboxProviders.monnifyConfigured)} - Squad configured: {String(settings.payments.sandboxProviders.squadConfigured)}</p>
      </article>
      <article className="card">
        <h2>Utilities and Notifications</h2>
        <p>Accelerate configured: {flag(settings.utilities.accelerateConfigured)} Live utility fulfilment: {flag(settings.utilities.liveUtilityFulfilmentEnabled)}</p>
        <p>Termii configured: {flag(settings.notifications.termiiConfigured)} Resend configured: {flag(settings.notifications.resendConfigured)}</p>
        <p>Marketing enabled: {flag(settings.notifications.marketingEnabled)} Bulk messaging enabled: {flag(settings.notifications.bulkMessagingEnabled)}</p>
      </article>
      <article className="card">
        <h2>Biometric Readiness</h2>
        <p>Credential storage model ready: {flag(settings.biometricReadiness.credentialStorageModelReady)}</p>
        <p>Passwordless login enabled: {flag(settings.biometricReadiness.passwordlessLoginEnabled)}</p>
        <p className="muted">{settings.biometricReadiness.note}</p>
      </article>
    </section>}
  </PortalShell>;
}
