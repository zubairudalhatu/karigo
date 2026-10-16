"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "../../src/contexts/auth-context";
import { friendlyError } from "../../src/lib/errors";

export default function AdminLogin() {
  const { login } = useAuth();
  const router = useRouter();
  const [emailMode, setEmailMode] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      await login(emailMode ? { email:phoneNumber, password } : { phoneNumber, password });
      router.replace(emailMode ? "/restore-governance" : "/");
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
        <label><input type="checkbox" checked={emailMode} onChange={event=>{setEmailMode(event.target.checked);setPhoneNumber("");setPassword("");}} /> Restore-governance email sign-in</label>
        <input
          aria-label={emailMode ? "Verified work email" : "Mobile number"}
          type={emailMode ? "email" : "tel"}
          placeholder={emailMode ? "Your verified work email" : "+234..."}
          value={phoneNumber}
          onChange={(event) => setPhoneNumber(event.target.value)}
          autoComplete={emailMode ? "username" : "tel"}
        />
        <input
          type="password"
          aria-label="Password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
        />
        {emailMode && <a href="/governance-password">Forgot governance password?</a>}
        <p className="error">{error}</p>
        <button disabled={busy}>{busy ? "Signing in..." : "Sign in securely"}</button>
      </form>
    </main>
  );
}
