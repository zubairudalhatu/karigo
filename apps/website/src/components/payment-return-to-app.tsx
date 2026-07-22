"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

function safeReference(value: string | null) {
  const reference = value?.trim();
  return reference && /^[A-Za-z0-9_-]{8,140}$/.test(reference) ? reference : "";
}

function safeAppReturnUrl(value: string | null) {
  const url = value?.trim();
  if (!url) return "";
  return ["karigo://", "karigo-customer://", "karigo-customer-staging://"].some((prefix) => url.startsWith(prefix))
    ? url
    : "";
}

export function PaymentReturnToApp() {
  const searchParams = useSearchParams();
  const reference = safeReference(
    searchParams.get("topUpReference")
      ?? searchParams.get("reference")
      ?? searchParams.get("tx_ref")
      ?? searchParams.get("transactionReference")
  );
  const appReturnUrl = useMemo(() => {
    const explicitReturnUrl = safeAppReturnUrl(searchParams.get("appReturnUrl"));
    if (explicitReturnUrl) return explicitReturnUrl;
    const params = new URLSearchParams();
    if (reference) {
      params.set("topUpReference", reference);
      params.set("reference", reference);
    }
    params.set("verifyWalletTopUp", "1");
    return `karigo-customer:///profile/wallet?${params.toString()}`;
  }, [reference, searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.location.href = appReturnUrl;
    }, 650);
    return () => window.clearTimeout(timer);
  }, [appReturnUrl]);

  return (
    <article className="contact-card">
      <p className="eyebrow">Payment return</p>
      <h1>Return to KariGO.</h1>
      <p className="lead">Payment received. Please return to the KariGO app and tap Verify Wallet Top-Up.</p>
      <p>We are opening the app now. If it does not open automatically, use the button below.</p>
      <div className="actions">
        <a className="button" href={appReturnUrl}>Open KariGO app</a>
        <a className="button secondary" href="/">Go to KariGO website</a>
      </div>
      <p className="fine-print">Your wallet is credited only after KariGO verifies the payment securely with Flutterwave.</p>
    </article>
  );
}
