"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { authApi } from "../../src/api/auth.api";
import { tokenStore } from "../../src/api/client";
import { friendlyError } from "../../src/lib/errors";

export default function VendorActivatePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      router.replace("/");
    } catch (e) {
      setError(friendlyError(e, "form"));
    } finally {
      setBusy(false);
    }
  }

  return <main className="login">
    <form className="login-card" onSubmit={submit}>
      <Image src="/karigo-logo.png" alt="KariGO" width={300} height={300} priority />
      <h1>Set up vendor access</h1>
      <p className="muted">Create a password for your approved KariGO vendor account.</p>
      {!token ? <p className="error">Activation token is missing.</p> : null}
      <input type="password" placeholder="New password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
      <input type="password" placeholder="Confirm password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} />
      <p className="error">{error}</p>
      <button disabled={busy || !token}>{busy ? "Activating..." : "Activate account"}</button>
    </form>
  </main>;
}
