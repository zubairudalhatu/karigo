import type { AuthenticatedUser, LoginRequest, LoginVerificationRequiredResult, RegisterCustomerRequest, VerifyOtpRequest } from "@karigo/shared-types";
import { KariGoApiError } from "@karigo/shared-types";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { authApi } from "../api/auth.api";
import { onUnauthorized, refreshTokenStore, tokenStore } from "../api/client";
import { authenticateWithBiometrics, getBiometricCapability, getBiometricSignInEnabled, setBiometricSignInEnabled } from "../lib/biometric-auth";
import { normalizeNigerianPhoneNumber } from "../lib/phone";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  loading: boolean;
  sessionMessage: string;
  register(body: RegisterCustomerRequest): ReturnType<typeof authApi.register>;
  verifyOtp(body: VerifyOtpRequest): Promise<void>;
  login(body: LoginRequest): Promise<void | LoginVerificationRequiredResult>;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  refreshWithBiometrics(): Promise<void>;
  setBiometricSignIn(enabled: boolean): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isAuthStatus(error: unknown) {
  return error instanceof KariGoApiError && (error.status === 401 || error.status === 403);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState("");
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);

  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      setUser(null);
      setSessionMessage("Your session has expired. Please sign in again.");
    });
    let active = true;

    async function bootstrap() {
      const [capability, enabled] = await Promise.all([
        getBiometricCapability().catch(() => ({ available: false, hasHardware: false, enrolled: false })),
        getBiometricSignInEnabled().catch(() => false)
      ]);
      if (active) {
        setBiometricAvailable(capability.available);
        setBiometricEnabledState(enabled);
      }

      const token = await tokenStore.getToken();
      const refreshToken = await refreshTokenStore.getToken();
      if (!token && !refreshToken) {
        if (active) setLoading(false);
        return;
      }

      try {
        const current = await authApi.me();
        if (!active) return;
        current.role === "CUSTOMER" ? setUser(current) : await tokenStore.clearToken?.();
      } catch (error) {
        if (isAuthStatus(error)) {
          await tokenStore.clearToken?.();
          setSessionMessage("Your session has expired. Please sign in again.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  async function saveSession(accessToken: string, refreshToken: string | undefined, nextUser: AuthenticatedUser) {
    if (nextUser.role !== "CUSTOMER") throw new Error("This account cannot use the customer app.");
    await tokenStore.setToken?.(accessToken);
    if (refreshToken) await refreshTokenStore.setToken(refreshToken);
    setSessionMessage("");
    setUser(nextUser);
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      sessionMessage,
      register: authApi.register,
      verifyOtp: async (body) => {
        const result = await authApi.verifyOtp(body);
        await saveSession(result.accessToken, result.refreshToken, result.user);
      },
      login: async (body) => {
        const result = await authApi.login({
          ...body,
          phoneNumber: normalizeNigerianPhoneNumber(body.phoneNumber)
        });
        if ("verificationRequired" in result) {
          return result;
        }
        await saveSession(result.accessToken, result.refreshToken, result.user);
      },
      biometricAvailable,
      biometricEnabled,
      refreshWithBiometrics: async () => {
        const refreshToken = await refreshTokenStore.getToken();
        if (!refreshToken) throw new Error("Biometric sign-in needs a saved KariGO session. Please sign in with your password first.");
        const enabled = await getBiometricSignInEnabled();
        if (!enabled) throw new Error("Biometric sign-in is not enabled on this device.");
        await authenticateWithBiometrics("Sign in to KariGO");
        const result = await authApi.refresh({ refreshToken });
        await saveSession(result.accessToken, result.refreshToken, result.user);
      },
      setBiometricSignIn: async (enabled) => {
        if (!enabled) {
          await setBiometricSignInEnabled(false);
          setBiometricEnabledState(false);
          return;
        }
        const capability = await getBiometricCapability();
        setBiometricAvailable(capability.available);
        if (!capability.available) {
          throw new Error("Set up fingerprint or face unlock on this device before enabling biometric sign-in.");
        }
        const refreshToken = await refreshTokenStore.getToken();
        if (!refreshToken) {
          throw new Error("Please sign in with your password before enabling biometric sign-in.");
        }
        await authenticateWithBiometrics("Enable KariGO biometric sign-in");
        await setBiometricSignInEnabled(true);
        setBiometricEnabledState(true);
      },
      logout: async () => {
        const refreshToken = await refreshTokenStore.getToken();
        if (refreshToken) {
          await authApi.logout({ refreshToken }).catch(() => undefined);
        }
        await tokenStore.clearToken?.();
        setUser(null);
      }
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
