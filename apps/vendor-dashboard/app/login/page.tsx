"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "../../src/contexts/auth-context";
import { friendlyError } from "../../src/lib/errors";

export default function VendorLogin() {
  const { login } = useAuth();
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      await login({ phoneNumber, password });
      router.replace("/");
    } catch (error) {
      setError(friendlyError(error, "login"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <form className="login-card" onSubmit={submit}>
        <Image src="/karigo-logo.png" alt="KariGO" width={300} height={300} priority />
        <h1>Partner Workspace login</h1>
        <p className="muted">Manage KariGO orders, products, services, onboarding and account activity.</p>
        <input
          type="tel"
          placeholder="+234..."
          value={phoneNumber}
          onChange={(event) => setPhoneNumber(event.target.value)}
          autoComplete="tel"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
        <p className="error">{error}</p>
        <button disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
        <p className="muted">New partner? <a href="/register">Choose your onboarding path</a>.</p>
      </form>
    </main>
  );
}
