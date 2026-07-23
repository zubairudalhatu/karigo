"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { site } from "../lib/site";

type AuthenticatedUser = { id: string; fullName: string; phoneNumber: string; email?: string | null; role: string };
type Profile = { id: string; fullName: string; phoneNumber: string; email?: string | null; profilePhotoUrl?: string | null };
type Wallet = { id: string; currency: string; availableBalance: string | number; ledgerBalance: string | number; status: string };
type LedgerEntry = { id: string; entryType: string; direction: string; status: string; amount: string | number; reference: string; description?: string | null; createdAt: string };
type Address = { id: string; label: string; addressLine: string; city: string; state: string; country: string; isDefault: boolean };
type Order = { id: string; orderNumber: string; orderStatus: string; paymentStatus: string; totalAmount: string | number; vendor?: { businessName: string } | null };
type UtilityServiceType = "AIRTIME" | "DATA" | "ELECTRICITY" | "CABLE_TV";
type UtilityProvider = { id: string; type: UtilityServiceType; name: string; code: string };
type UtilityProduct = { id: string; providerId: string; type: UtilityServiceType; name: string; code: string; amountKobo?: number | null; minAmountKobo?: number | null; maxAmountKobo?: number | null };
type UtilityTransaction = { id: string; reference: string; serviceType: UtilityServiceType; status: string; totalKobo: number; recipient: string; createdAt: string };
type ServiceProviderType =
  | "PAINTER" | "PLUMBER" | "MECHANIC" | "ELECTRICIAN" | "CLEANER" | "CARPENTER" | "AC_TECHNICIAN" | "GENERATOR_REPAIR"
  | "APPLIANCE_REPAIR" | "FUMIGATION" | "WELDER" | "TILER" | "CCTV_TECHNICIAN" | "MOVING_HELP" | "PRINTING" | "CAR_HIRE"
  | "LAUNDRY" | "LESSON_TEACHER" | "LEGAL_PRACTITIONER" | "RENT_A_CAR" | "HEALTH_PROFESSIONAL" | "OTHER";
type ServiceProviderCategory = { type: ServiceProviderType; label: string; description: string; readinessOnly: boolean; statusLabel: string };
type ServiceRequest = { id: string; requestNumber: string; serviceLabel: string; status: string; createdAt: string; serviceAddress?: Address };
type ApiPayload<T> = { success?: boolean; data?: T; message?: string; error_code?: string };

const TOKEN_KEY = "karigo_customer_web_access_token";
const REFRESH_TOKEN_KEY = "karigo_customer_web_refresh_token";

const tabs = ["Dashboard", "Wallet", "Utilities", "SME Services", "Orders", "Addresses", "Profile", "Support"] as const;
type Tab = (typeof tabs)[number];

const utilityTypes: UtilityServiceType[] = ["AIRTIME", "DATA", "ELECTRICITY", "CABLE_TV"];
const supportedSmeCategoryLabels = ["Printing", "Car Hire", "Laundry", "Lesson Teacher", "Legal Practitioner", "Rent a Car"];

function money(value: string | number | undefined | null) {
  const amount = typeof value === "string" ? Number(value) : value ?? 0;
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number.isFinite(amount) ? amount : 0);
}

function moneyKobo(value: number) {
  return money(value / 100);
}

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function hostedPaymentUrl(authorization: Record<string, unknown> | undefined) {
  const candidates = ["authorizationUrl", "checkoutUrl", "paymentUrl", "url"];
  for (const key of candidates) {
    const value = authorization?.[key];
    if (typeof value === "string" && value.startsWith("https://")) return value;
  }
  return "";
}

export function CustomerWebPortal() {
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");
  const [authMode, setAuthMode] = useState<"login" | "register" | "verify">("login");
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [utilityProviders, setUtilityProviders] = useState<UtilityProvider[]>([]);
  const [utilityProducts, setUtilityProducts] = useState<UtilityProduct[]>([]);
  const [utilityTransactions, setUtilityTransactions] = useState<UtilityTransaction[]>([]);
  const [smeCatalogue, setSmeCatalogue] = useState<ServiceProviderCategory[]>([]);
  const [smeRequests, setSmeRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loginForm, setLoginForm] = useState({ phoneNumber: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ fullName: "", phoneNumber: "", email: "", password: "", referralCode: "" });
  const [otpForm, setOtpForm] = useState({ phoneNumber: "", otp: "" });
  const [profileForm, setProfileForm] = useState({ fullName: "", email: "" });
  const [addressForm, setAddressForm] = useState({ label: "Home", addressLine: "", city: "Kano", state: "Kano", country: "Nigeria", isDefault: false });
  const [topUpAmount, setTopUpAmount] = useState("1000");
  const [pendingTopUpReference, setPendingTopUpReference] = useState("");
  const [utilityForm, setUtilityForm] = useState({ serviceType: "AIRTIME" as UtilityServiceType, providerId: "", productId: "", amountNaira: "", recipient: "", recipientName: "", meterType: "PREPAID" });
  const [smeForm, setSmeForm] = useState({ serviceType: "PAINTER" as ServiceProviderType, serviceAddressId: "", description: "", contactPhone: "", preferredDate: "", preferredTimeWindow: "" });

  const authenticated = Boolean(accessToken && user?.role === "CUSTOMER");
  const utilityProviderOptions = useMemo(() => utilityProviders.filter((provider) => provider.type === utilityForm.serviceType), [utilityProviders, utilityForm.serviceType]);
  const utilityProductOptions = useMemo(() => utilityProducts.filter((product) => product.type === utilityForm.serviceType && (!utilityForm.providerId || product.providerId === utilityForm.providerId)), [utilityProducts, utilityForm.providerId, utilityForm.serviceType]);
  const selectedSmeCategory = smeCatalogue.find((item) => item.type === smeForm.serviceType);

  async function refreshAccessToken(currentRefreshToken = refreshToken) {
    if (!currentRefreshToken) return "";
    const response = await fetch(`${site.apiBaseUrl}/auth/refresh`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: currentRefreshToken })
    });
    const payload = await response.json().catch(() => null) as ApiPayload<{ accessToken: string; refreshToken?: string; user: AuthenticatedUser }> | null;
    if (!response.ok || !payload?.data?.accessToken) {
      clearSession();
      return "";
    }
    saveSession(payload.data.accessToken, payload.data.refreshToken ?? currentRefreshToken, payload.data.user);
    return payload.data.accessToken;
  }

  async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
    const token = sessionStorage.getItem(TOKEN_KEY) || accessToken;
    const response = await fetch(`${site.apiBaseUrl}/${path.replace(/^\//, "")}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    if ((response.status === 401 || response.status === 403) && retry) {
      const nextToken = await refreshAccessToken();
      if (nextToken) return request<T>(path, init, false);
    }

    const payload = await response.json().catch(() => null) as ApiPayload<T> | null;
    if (!response.ok || payload?.success === false) {
      throw new Error(payload?.message || "KariGO could not complete this request safely.");
    }
    return payload && "data" in payload ? payload.data as T : payload as T;
  }

  function saveSession(token: string, nextRefreshToken: string | undefined, nextUser: AuthenticatedUser) {
    sessionStorage.setItem(TOKEN_KEY, token);
    if (nextRefreshToken) sessionStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken);
    setAccessToken(token);
    setRefreshToken(nextRefreshToken ?? "");
    setUser(nextUser);
  }

  function clearSession() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    setAccessToken("");
    setRefreshToken("");
    setUser(null);
    setProfile(null);
    setWallet(null);
    setLedger([]);
    setAddresses([]);
    setOrders([]);
    setUtilityTransactions([]);
    setSmeRequests([]);
  }

  async function loadPortalData() {
    if (!accessToken) return;
    setLoading(true);
    setError("");
    try {
      const [currentUser, nextProfile, walletSummary, walletLedger, addressList, orderList, utilityHistory, catalogue, requestHistory] = await Promise.all([
        request<AuthenticatedUser>("auth/me"),
        request<Profile>("customers/me"),
        request<Wallet>("wallet"),
        request<{ items: LedgerEntry[] }>("wallet/transactions"),
        request<Address[]>("addresses"),
        request<Order[]>("orders/my-orders"),
        request<UtilityTransaction[]>("customer/utilities/transactions"),
        request<ServiceProviderCategory[]>("service-provider-requests/catalogue"),
        request<ServiceRequest[]>("service-provider-requests/my-requests")
      ]);
      if (currentUser.role !== "CUSTOMER") throw new Error("Only customer accounts can use the customer web portal.");
      setUser(currentUser);
      setProfile(nextProfile);
      setProfileForm({ fullName: nextProfile.fullName, email: nextProfile.email ?? "" });
      setWallet(walletSummary);
      setLedger(walletLedger.items ?? []);
      setAddresses(addressList);
      setOrders(orderList);
      setUtilityTransactions(utilityHistory);
      setSmeCatalogue(catalogue);
      setSmeRequests(requestHistory);
      setSmeForm((current) => ({
        ...current,
        serviceAddressId: current.serviceAddressId || addressList.find((address) => address.isDefault)?.id || addressList[0]?.id || "",
        contactPhone: current.contactPhone || nextProfile.phoneNumber,
        serviceType: catalogue.find((item) => !item.readinessOnly)?.type ?? current.serviceType
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Customer portal could not load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const storedToken = sessionStorage.getItem(TOKEN_KEY) ?? "";
    const storedRefreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY) ?? "";
    if (storedToken) {
      setAccessToken(storedToken);
      setRefreshToken(storedRefreshToken);
    }
  }, []);

  useEffect(() => {
    if (accessToken) void loadPortalData();
  }, [accessToken]);

  useEffect(() => {
    request<UtilityProvider[]>(`utilities/providers?type=${utilityForm.serviceType}`, { headers: {} })
      .then((providers) => {
        setUtilityProviders(providers);
        setUtilityForm((current) => ({ ...current, providerId: providers[0]?.id ?? "" }));
      })
      .catch(() => setUtilityProviders([]));
  }, [utilityForm.serviceType]);

  useEffect(() => {
    if (!utilityForm.providerId) {
      setUtilityProducts([]);
      return;
    }
    request<UtilityProduct[]>(`utilities/products?type=${utilityForm.serviceType}&providerId=${utilityForm.providerId}`, { headers: {} })
      .then(setUtilityProducts)
      .catch(() => setUtilityProducts([]));
  }, [utilityForm.providerId, utilityForm.serviceType]);

  async function submitLogin(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const result = await request<{ accessToken?: string; refreshToken?: string; user?: AuthenticatedUser; verificationRequired?: true; phoneNumber?: string; message?: string }>("auth/login", {
        method: "POST",
        body: JSON.stringify(loginForm)
      });
      if (result.verificationRequired) {
        setOtpForm({ phoneNumber: result.phoneNumber ?? loginForm.phoneNumber, otp: "" });
        setAuthMode("verify");
        setMessage(result.message ?? "Please verify your phone number with OTP.");
        return;
      }
      if (!result.accessToken || !result.user) throw new Error("Login response did not include a customer session.");
      if (result.user.role !== "CUSTOMER") throw new Error("This login is for customer accounts only.");
      saveSession(result.accessToken, result.refreshToken, result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function submitRegister(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      await request("auth/customer/register", {
        method: "POST",
        body: JSON.stringify({
          ...registerForm,
          email: registerForm.email || undefined,
          referralCode: registerForm.referralCode || undefined
        })
      });
      setOtpForm({ phoneNumber: registerForm.phoneNumber, otp: "" });
      setAuthMode("verify");
      setMessage("Registration received. Enter the OTP sent to your phone to activate web access.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  async function submitOtp(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await request<{ accessToken: string; refreshToken?: string; user: AuthenticatedUser }>("auth/verify-otp", {
        method: "POST",
        body: JSON.stringify(otpForm)
      });
      if (result.user.role !== "CUSTOMER") throw new Error("Only customer accounts can use the customer web portal.");
      saveSession(result.accessToken, result.refreshToken, result.user);
      setMessage("Account verified. Welcome to KariGO Web.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const updated = await request<Profile>("customers/me", { method: "PATCH", body: JSON.stringify(profileForm) });
      setProfile(updated);
      setMessage("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profile could not be updated.");
    }
  }

  async function createAddress(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      await request<Address>("addresses", { method: "POST", body: JSON.stringify(addressForm) });
      setMessage("Address saved.");
      setAddressForm({ label: "Home", addressLine: "", city: "Kano", state: "Kano", country: "Nigeria", isDefault: false });
      await loadPortalData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Address could not be saved.");
    }
  }

  async function startTopUp(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const result = await request<{ authorization: Record<string, unknown> }>("payments/wallet-top-ups", {
        method: "POST",
        body: JSON.stringify({ amount: Number(topUpAmount) })
      });
      const url = hostedPaymentUrl(result.authorization);
      const reference = typeof result.authorization.transactionReference === "string" ? result.authorization.transactionReference : "";
      if (!url) throw new Error("Flutterwave checkout link was not returned. Please retry later.");
      setPendingTopUpReference(reference);
      window.open(url, "_blank", "noopener,noreferrer");
      setMessage("Flutterwave checkout opened. Return here and verify after payment. KariGO credits wallet only after backend verification.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet top-up could not be started.");
    }
  }

  async function verifyTopUp() {
    if (!pendingTopUpReference.trim()) return;
    setMessage("");
    setError("");
    try {
      await request(`payments/wallet-top-ups/verify/${encodeURIComponent(pendingTopUpReference.trim())}`);
      setMessage("Wallet top-up verification checked. Refreshing wallet balance.");
      await loadPortalData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet top-up is still pending or could not be verified.");
    }
  }

  async function submitUtility(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const amountKobo = utilityForm.amountNaira ? Math.round(Number(utilityForm.amountNaira) * 100) : undefined;
      const body = {
        serviceType: utilityForm.serviceType,
        providerId: utilityForm.providerId,
        productId: utilityForm.productId || undefined,
        amountKobo,
        recipient: utilityForm.recipient,
        recipientName: utilityForm.recipientName || undefined,
        meterType: utilityForm.serviceType === "ELECTRICITY" ? utilityForm.meterType : undefined
      };
      const quote = await request<{ quoteReference: string; totalKobo: number }>("customer/utilities/quote", { method: "POST", body: JSON.stringify(body) });
      const created = await request<UtilityTransaction>("customer/utilities/transactions", {
        method: "POST",
        body: JSON.stringify({ ...body, idempotencyKey: quote.quoteReference })
      });
      setMessage(`Utility request ${created.reference} submitted for ${moneyKobo(quote.totalKobo)}. Wallet debit and fulfilment remain backend-controlled.`);
      await loadPortalData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Utility request could not be submitted.");
    }
  }

  async function submitSmeRequest(event: FormEvent) {
    event.preventDefault();
    if (selectedSmeCategory?.readinessOnly) {
      setError("This category remains readiness-only.");
      return;
    }
    setMessage("");
    setError("");
    try {
      const requestResult = await request<ServiceRequest>("service-provider-requests", {
        method: "POST",
        body: JSON.stringify(smeForm)
      });
      setMessage(`SME Services request ${requestResult.requestNumber} submitted for KariGO review.`);
      await loadPortalData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "SME Services request could not be submitted.");
    }
  }

  async function logout() {
    await request("auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }).catch(() => undefined);
    clearSession();
    setMessage("You have been logged out.");
  }

  if (!authenticated) {
    return <main className="customer-web">
      <section className="customer-web-hero">
        <p className="eyebrow">Customer Web Portal</p>
        <h1>Manage your KariGO account from the web.</h1>
        <p className="lead">Log in to view your profile, wallet, Utilities, SME Services requests and order history. The mobile app remains the richest shopping experience.</p>
        <div className="portal-pill-row">
          <span>Dashboard</span><span>Wallet</span><span>Utilities</span><span>SME Services</span>
        </div>
      </section>
      <section className="section soft portal-auth-grid">
        <article className="info-card">
          <h2>What works in Phase 1</h2>
          <ul className="list">
            <li>Customer login, registration and OTP verification</li>
            <li>Profile, saved addresses, wallet and ledger visibility</li>
            <li>Flutterwave wallet top-up initiation with backend verification</li>
            <li>Utilities and SME Services request/history foundations</li>
          </ul>
          <p className="muted">Food/grocery cart and full checkout on web remain Phase 2. Ride requests remain readiness-only unless separately approved.</p>
        </article>
        <article className="form-card">
          <div className="portal-switch">
            <button type="button" className={authMode === "login" ? "" : "secondary"} onClick={() => setAuthMode("login")}>Login</button>
            <button type="button" className={authMode === "register" ? "" : "secondary"} onClick={() => setAuthMode("register")}>Register</button>
            <button type="button" className={authMode === "verify" ? "" : "secondary"} onClick={() => setAuthMode("verify")}>Verify OTP</button>
          </div>
          {authMode === "login" ? <form onSubmit={submitLogin}>
            <h2>Customer login</h2>
            <label>Phone number<input required value={loginForm.phoneNumber} onChange={(event) => setLoginForm({ ...loginForm, phoneNumber: event.target.value })} autoComplete="tel" /></label>
            <label>Password<input required type="password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} autoComplete="current-password" /></label>
            <button disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
          </form> : null}
          {authMode === "register" ? <form onSubmit={submitRegister}>
            <h2>Create customer account</h2>
            <label>Full name<input required value={registerForm.fullName} onChange={(event) => setRegisterForm({ ...registerForm, fullName: event.target.value })} /></label>
            <label>Phone number<input required value={registerForm.phoneNumber} onChange={(event) => setRegisterForm({ ...registerForm, phoneNumber: event.target.value })} autoComplete="tel" /></label>
            <label>Email optional<input type="email" value={registerForm.email} onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })} /></label>
            <label>Password<input required type="password" minLength={8} value={registerForm.password} onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })} /></label>
            <label>Referral code optional<input value={registerForm.referralCode} onChange={(event) => setRegisterForm({ ...registerForm, referralCode: event.target.value })} /></label>
            <button disabled={loading}>{loading ? "Creating..." : "Create account"}</button>
          </form> : null}
          {authMode === "verify" ? <form onSubmit={submitOtp}>
            <h2>Verify OTP</h2>
            <label>Phone number<input required value={otpForm.phoneNumber} onChange={(event) => setOtpForm({ ...otpForm, phoneNumber: event.target.value })} /></label>
            <label>OTP<input required value={otpForm.otp} onChange={(event) => setOtpForm({ ...otpForm, otp: event.target.value })} inputMode="numeric" /></label>
            <button disabled={loading}>{loading ? "Verifying..." : "Verify and continue"}</button>
          </form> : null}
          {message ? <p className="success">{message}</p> : null}
          {error ? <p className="error" role="alert">{error}</p> : null}
        </article>
      </section>
    </main>;
  }

  return <main className="customer-web portal-shell">
    <aside className="portal-sidebar">
      <strong>KariGO Web</strong>
      <span>{profile?.fullName ?? user?.fullName}</span>
      <nav>{tabs.map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>)}</nav>
    </aside>
    <section className="portal-content">
      <div className="portal-topbar">
        <div>
          <p className="eyebrow">Customer Portal</p>
          <h1>{activeTab}</h1>
        </div>
        <button className="button secondary" onClick={() => void logout()}>Log out</button>
      </div>
      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error" role="alert">{error}</p> : null}
      {loading ? <p className="notice">Loading customer portal data...</p> : null}

      {activeTab === "Dashboard" ? <section className="portal-grid">
        <article className="portal-card"><span>Wallet balance</span><strong>{money(wallet?.availableBalance)}</strong><p>Wallet credits only after backend verification.</p></article>
        <article className="portal-card"><span>Orders</span><strong>{orders.length}</strong><p>Food and grocery checkout remains best in the mobile app for Phase 1.</p></article>
        <article className="portal-card"><span>SME requests</span><strong>{smeRequests.length}</strong><p>{supportedSmeCategoryLabels.join(", ")} now supported.</p></article>
        <article className="portal-card"><span>Addresses</span><strong>{addresses.length}</strong><p>Manage saved delivery and service addresses.</p></article>
      </section> : null}

      {activeTab === "Wallet" ? <section className="portal-stack">
        <article className="portal-card"><h2>KariGO Wallet</h2><p className="metric">{money(wallet?.availableBalance)}</p><p>Status: {wallet?.status ?? "Loading"}</p></article>
        <form className="portal-card" onSubmit={startTopUp}>
          <h2>Top up with Flutterwave</h2>
          <p>Wallet top-up opens Flutterwave externally. KariGO does not credit your wallet from the browser alone.</p>
          <label>Amount NGN<input required type="number" min="100" value={topUpAmount} onChange={(event) => setTopUpAmount(event.target.value)} /></label>
          <button>Start wallet top-up</button>
        </form>
        <article className="portal-card">
          <h2>Verify top-up</h2>
          <label>Top-up reference<input value={pendingTopUpReference} onChange={(event) => setPendingTopUpReference(event.target.value)} /></label>
          <button onClick={() => void verifyTopUp()}>Verify wallet top-up</button>
        </article>
        <section className="portal-card"><h2>Ledger</h2>{ledger.length ? ledger.slice(0, 8).map((entry) => <p key={entry.id}><strong>{entry.reference}</strong> - {entry.direction} {money(entry.amount)} - {label(entry.status)}</p>) : <p>No wallet entries yet.</p>}</section>
      </section> : null}

      {activeTab === "Utilities" ? <section className="portal-stack">
        <form className="portal-card" onSubmit={submitUtility}>
          <h2>Utility request</h2>
          <p>Utilities use backend wallet debit, provider fulfilment and automatic reversal controls. Do not refresh after submitting.</p>
          <div className="form-grid">
            <label>Service type<select value={utilityForm.serviceType} onChange={(event) => setUtilityForm({ ...utilityForm, serviceType: event.target.value as UtilityServiceType, providerId: "", productId: "" })}>{utilityTypes.map((type) => <option key={type} value={type}>{label(type)}</option>)}</select></label>
            <label>Provider<select value={utilityForm.providerId} onChange={(event) => setUtilityForm({ ...utilityForm, providerId: event.target.value, productId: "" })}>{utilityProviderOptions.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label>
            <label>Product optional<select value={utilityForm.productId} onChange={(event) => setUtilityForm({ ...utilityForm, productId: event.target.value })}><option value="">No package selected</option>{utilityProductOptions.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
            <label>Amount NGN<input value={utilityForm.amountNaira} onChange={(event) => setUtilityForm({ ...utilityForm, amountNaira: event.target.value })} /></label>
            <label>Recipient<input required value={utilityForm.recipient} onChange={(event) => setUtilityForm({ ...utilityForm, recipient: event.target.value })} /></label>
            <label>Recipient name optional<input value={utilityForm.recipientName} onChange={(event) => setUtilityForm({ ...utilityForm, recipientName: event.target.value })} /></label>
            {utilityForm.serviceType === "ELECTRICITY" ? <label>Meter type<select value={utilityForm.meterType} onChange={(event) => setUtilityForm({ ...utilityForm, meterType: event.target.value })}><option value="PREPAID">Prepaid</option><option value="POSTPAID">Postpaid</option></select></label> : null}
          </div>
          <button disabled={!utilityForm.providerId || !utilityForm.recipient}>Submit utility request</button>
        </form>
        <section className="portal-card"><h2>Utility history</h2>{utilityTransactions.length ? utilityTransactions.slice(0, 8).map((item) => <p key={item.id}><strong>{item.reference}</strong> - {label(item.serviceType)} - {label(item.status)} - {moneyKobo(item.totalKobo)}</p>) : <p>No utility transactions yet.</p>}</section>
      </section> : null}

      {activeTab === "SME Services" ? <section className="portal-stack">
        <form className="portal-card" onSubmit={submitSmeRequest}>
          <h2>Submit SME Services request</h2>
          <p>Requests are manually reviewed. No instant dispatch, automatic service payment, legal advice automation or vehicle rental contract automation is active.</p>
          <div className="form-grid">
            <label>Service type<select value={smeForm.serviceType} onChange={(event) => setSmeForm({ ...smeForm, serviceType: event.target.value as ServiceProviderType })}>{smeCatalogue.map((item) => <option key={item.type} value={item.type}>{item.label}</option>)}</select></label>
            <label>Address<select value={smeForm.serviceAddressId} onChange={(event) => setSmeForm({ ...smeForm, serviceAddressId: event.target.value })}>{addresses.map((address) => <option key={address.id} value={address.id}>{address.label} - {address.city}</option>)}</select></label>
            <label>Contact phone<input required value={smeForm.contactPhone} onChange={(event) => setSmeForm({ ...smeForm, contactPhone: event.target.value })} /></label>
            <label>Preferred date optional<input value={smeForm.preferredDate} onChange={(event) => setSmeForm({ ...smeForm, preferredDate: event.target.value })} /></label>
          </div>
          {selectedSmeCategory ? <p className="notice">{selectedSmeCategory.description}</p> : null}
          <label>Description<textarea required value={smeForm.description} onChange={(event) => setSmeForm({ ...smeForm, description: event.target.value })} /></label>
          <button disabled={!smeForm.serviceAddressId || !smeForm.description || selectedSmeCategory?.readinessOnly}>Submit SME Services request</button>
        </form>
        <section className="portal-card"><h2>Request history</h2>{smeRequests.length ? smeRequests.slice(0, 8).map((request) => <p key={request.id}><strong>{request.requestNumber}</strong> - {request.serviceLabel} - {label(request.status)}</p>) : <p>No SME Services requests yet.</p>}</section>
      </section> : null}

      {activeTab === "Orders" ? <section className="portal-card"><h2>Order history</h2>{orders.length ? orders.map((order) => <p key={order.id}><strong>{order.orderNumber}</strong> - {order.vendor?.businessName ?? "KariGO"} - {label(order.orderStatus)} - {money(order.totalAmount)}</p>) : <p>No orders yet. Full food/grocery cart and checkout on web is planned for Phase 2.</p>}</section> : null}

      {activeTab === "Addresses" ? <section className="portal-stack">
        <form className="portal-card" onSubmit={createAddress}>
          <h2>Add address</h2>
          <div className="form-grid">
            <label>Label<input value={addressForm.label} onChange={(event) => setAddressForm({ ...addressForm, label: event.target.value })} /></label>
            <label>City<input value={addressForm.city} onChange={(event) => setAddressForm({ ...addressForm, city: event.target.value })} /></label>
            <label>State<input value={addressForm.state} onChange={(event) => setAddressForm({ ...addressForm, state: event.target.value })} /></label>
            <label>Country<input value={addressForm.country} onChange={(event) => setAddressForm({ ...addressForm, country: event.target.value })} /></label>
          </div>
          <label>Address<textarea required value={addressForm.addressLine} onChange={(event) => setAddressForm({ ...addressForm, addressLine: event.target.value })} /></label>
          <label className="check-row"><input type="checkbox" checked={addressForm.isDefault} onChange={(event) => setAddressForm({ ...addressForm, isDefault: event.target.checked })} /> Make default address</label>
          <button>Save address</button>
        </form>
        <section className="portal-card"><h2>Saved addresses</h2>{addresses.length ? addresses.map((address) => <p key={address.id}><strong>{address.label}</strong> - {address.addressLine}, {address.city}, {address.state}</p>) : <p>No saved addresses yet.</p>}</section>
      </section> : null}

      {activeTab === "Profile" ? <form className="portal-card" onSubmit={saveProfile}>
        <h2>Your KariGO account</h2>
        <p>{profile?.phoneNumber}</p>
        <label>Full name<input required value={profileForm.fullName} onChange={(event) => setProfileForm({ ...profileForm, fullName: event.target.value })} /></label>
        <label>Email optional<input type="email" value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} /></label>
        <button>Save profile</button>
      </form> : null}

      {activeTab === "Support" ? <section className="portal-card">
        <h2>Support and help</h2>
        <p>Use this portal for account, wallet, Utilities and SME Services visibility. For urgent pilot support, use the approved KariGO support channel shared with your launch group.</p>
        <p>Never share OTPs, card details, wallet secrets or provider credentials in support messages.</p>
      </section> : null}
    </section>
  </main>;
}
