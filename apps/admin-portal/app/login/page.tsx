"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "../../src/contexts/auth-context";
import { friendlyError } from "../../src/lib/errors";

export default function AdminLogin() {
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
        <h1>Admin portal</h1>
        <p className="muted">Role-based KariGO operations access.</p>
        <input
          type="tel"
          placeholder="+234..."
          value={phoneNumber}
          onChange={(event) => setPhoneNumber(event.target.value)}
          autoComplete="tel"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
        />
        <p className="error">{error}</p>
        <button disabled={busy}>{busy ? "Signing in..." : "Sign in securely"}</button>
      </form>
    </main>
  );
}
