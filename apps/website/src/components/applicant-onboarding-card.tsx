"use client";

import { FormEvent, useState } from "react";
import { site } from "../lib/site";

export type ApplicantOnboardingKind = "vendor" | "captain";

export type ApplicantAccount = {
  fullName: string;
  phoneNumber: string;
  email?: string;
};

type NextStep = "CREATE_ACCOUNT" | "OTP_REQUIRED" | "PASSWORD_REQUIRED" | "READY_FOR_APPLICATION";

type ApiResponse = {
  data?: {
    account?: ApplicantAccount & {
      id: string;
      accountStatus: string;
      phoneVerified: boolean;
      passwordCreated: boolean;
    };
    nextStep?: NextStep;
    mockOtp?: string;
  };
  message?: string | string[];
};

const initialAccount: ApplicantAccount = {
  fullName: "",
  phoneNumber: "",
  email: ""
};

async function onboardingRequest(kind: ApplicantOnboardingKind, action: string, body: unknown) {
  const prefix = kind === "vendor" ? "vendor-onboarding" : "captain-onboarding";
  const response = await fetch(`${site.apiBaseUrl}/auth/${prefix}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => null) as ApiResponse | null;
  if (!response.ok) {
    const message = Array.isArray(payload?.message) ? payload?.message.join(" ") : payload?.message;
    throw new Error(message || "Account step could not be completed.");
  }
  return payload;
}

function safeAccount(account: ApplicantAccount): ApplicantAccount {
  return {
    fullName: account.fullName.trim(),
    phoneNumber: account.phoneNumber.trim(),
    email: account.email?.trim() || undefined
  };
}

export function ApplicantOnboardingCard({
  kind,
  title,
  helper,
  onReady
}: {
  kind: ApplicantOnboardingKind;
  title: string;
  helper: string;
  onReady: (account: ApplicantAccount) => void;
}) {
  const [account, setAccount] = useState(initialAccount);
  const [step, setStep] = useState<NextStep>("CREATE_ACCOUNT");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function applyNextStep(payload: ApiResponse | null, fallback: NextStep) {
    const nextStep = payload?.data?.nextStep ?? fallback;
    const readyAccount = payload?.data?.account
      ? {
          fullName: payload.data.account.fullName,
          phoneNumber: payload.data.account.phoneNumber,
          email: payload.data.account.email || undefined
        }
      : safeAccount(account);
    setStep(nextStep);
    setAccount(readyAccount);
    if (nextStep === "READY_FOR_APPLICATION") onReady(readyAccount);
    setMessage(nextStep === "OTP_REQUIRED"
      ? "OTP sent. Enter the code sent to your phone to continue."
      : nextStep === "PASSWORD_REQUIRED"
        ? "Phone verified. Create your password before submitting application details."
        : "Account verified. Continue with the application details below.");
    if (payload?.data?.mockOtp) {
      setMessage(`OTP sent. Use the test OTP shown by the backend in non-production mode.`);
    }
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const payload = await onboardingRequest(kind, "account", safeAccount(account));
      applyNextStep(payload, "OTP_REQUIRED");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account could not be created.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const payload = await onboardingRequest(kind, "verify-otp", { phoneNumber: account.phoneNumber, otp });
      applyNextStep(payload, "PASSWORD_REQUIRED");
      setOtp("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP could not be verified.");
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await onboardingRequest(kind, "resend-otp", { phoneNumber: account.phoneNumber });
      setMessage("If the phone is eligible, a new OTP has been sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP could not be resent.");
    } finally {
      setLoading(false);
    }
  }

  async function createPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      if (password !== passwordConfirmation) throw new Error("Passwords do not match.");
      const payload = await onboardingRequest(kind, "password", { phoneNumber: account.phoneNumber, password });
      applyNextStep(payload, "READY_FOR_APPLICATION");
      setPassword("");
      setPasswordConfirmation("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password could not be created.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "READY_FOR_APPLICATION") {
    return <div className="form-card">
      <p className="eyebrow">Account-first onboarding</p>
      <h3>{title}</h3>
      <p className="success">Account verified. Continue with the application details below.</p>
      <p className="muted">{account.fullName} - {account.phoneNumber}{account.email ? ` - ${account.email}` : ""}</p>
    </div>;
  }

  return <div className="form-card">
    <p className="eyebrow">Account-first onboarding</p>
    <h3>{title}</h3>
    <p className="muted">{helper}</p>
    {step === "CREATE_ACCOUNT" ? <form onSubmit={createAccount}>
      <div className="form-grid">
        <label>Full name<input required value={account.fullName} onChange={(event) => setAccount({ ...account, fullName: event.target.value })} /></label>
        <label>Phone number<input required value={account.phoneNumber} onChange={(event) => setAccount({ ...account, phoneNumber: event.target.value })} /></label>
        <label>Email optional<input type="email" value={account.email} onChange={(event) => setAccount({ ...account, email: event.target.value })} /></label>
      </div>
      <button disabled={loading}>{loading ? "Starting..." : "Create account and send OTP"}</button>
    </form> : null}
    {step === "OTP_REQUIRED" ? <form onSubmit={verifyOtp}>
      <p className="muted">Phone: {account.phoneNumber}</p>
      <label>OTP code<input required inputMode="numeric" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 8))} /></label>
      <div className="filters">
        <button disabled={loading}>{loading ? "Verifying..." : "Verify phone"}</button>
        <button className="secondary" type="button" disabled={loading} onClick={() => void resendOtp()}>Resend OTP</button>
      </div>
    </form> : null}
    {step === "PASSWORD_REQUIRED" ? <form onSubmit={createPassword}>
      <p className="muted">Create the password you will use after approval. KariGO will not ask you to share this password.</p>
      <div className="form-grid">
        <label>Password<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <label>Confirm password<input required minLength={8} type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} /></label>
      </div>
      <button disabled={loading}>{loading ? "Saving..." : "Create password"}</button>
    </form> : null}
    {message ? <p className="success">{message}</p> : null}
    {error ? <p className="error" role="alert">{error}</p> : null}
  </div>;
}
