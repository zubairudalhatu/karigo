"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { authApi } from "../../src/api/auth.api";
import { refreshTokenStore, tokenStore } from "../../src/api/client";
import { friendlyError } from "../../src/lib/errors";

export default function VendorActivatePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [requestBusy, setRequestBusy] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await authApi.activateVendorAccount({ token, password });
      await tokenStore.setToken?.(result.accessToken);
      if (result.refreshToken) refreshTokenStore.setToken(result.refreshToken);
      router.replace("/");
    } catch (e) {
      const message = friendlyError(e, "form");
      setError(message.includes("invalid or expired") || message.includes("session has expired")
        ? "This activation link is invalid or expired. Request a new activation link below."
        : message);
    } finally {
      setBusy(false);
    }
  }

  async function requestNewLink(event: FormEvent) {
    event.preventDefault();
    setRequestBusy(true);
    setRequestMessage("");
    setError("");
    try {
      const value = identifier.trim();
      const result = await authApi.requestVendorActivationLink(value.includes("@") ? { email: value } : { phoneNumber: value });
      setRequestMessage(result.message);
    } catch (e) {
      setError(friendlyError(e, "form"));
    } finally {
      setRequestBusy(false);
    }
  }

  return <main className="login activation-page">
    <form className="login-card" onSubmit={submit}>
      <Image src="/karigo-logo.png" alt="KariGO" width={300} height={300} priority />
      <h1>Set up vendor access</h1>
      <p className="muted">Create a password for your approved KariGO vendor account. Activation links are single-use and time limited.</p>
      {!token ? <p className="error">Activation token is missing.</p> : null}
      <input type="password" placeholder="New password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
      <input type="password" placeholder="Confirm password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} />
      <p className="error">{error}</p>
      <button disabled={busy || !token}>{busy ? "Activating..." : "Activate account"}</button>
    </form>
    <form className="login-card" onSubmit={requestNewLink}>
      <h2>Request new activation link</h2>
      <p className="muted">If your approved vendor link expired, enter the registered phone number or email. KariGO will send a new password setup link to the approved contact.</p>
      <input placeholder="Phone number or email" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required />
      {requestMessage ? <p className="success">{requestMessage}</p> : null}
      <button disabled={requestBusy || !identifier.trim()}>{requestBusy ? "Requesting..." : "Request new activation link"}</button>
    </form>
  </main>;
}
