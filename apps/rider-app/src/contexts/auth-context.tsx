import type { AuthenticatedUser, LoginRequest } from "@karigo/shared-types";
import { KariGoApiError } from "@karigo/shared-types";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { authApi } from "../api/auth.api";
import { onUnauthorized, refreshTokenStore, tokenStore } from "../api/client";
import { authenticateWithBiometrics, getBiometricCapability, getBiometricSignInEnabled, setBiometricSignInEnabled } from "../lib/biometric-auth";
import { normalizeNigerianPhoneNumber } from "../lib/phone";

interface AuthValue {
  user: AuthenticatedUser | null;
  loading: boolean;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  login(body: LoginRequest): Promise<void>;
  refreshWithBiometrics(): Promise<void>;
  setBiometricSignIn(enabled: boolean): Promise<void>;
  logout(): Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);

function isAuthStatus(error: unknown) {
  return error instanceof KariGoApiError && (error.status === 401 || error.status === 403);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  useEffect(() => {
    const unsubscribe = onUnauthorized(() => setUser(null));
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
        current.role === "RIDER" ? setUser(current) : await tokenStore.clearToken?.();
      } catch (error) {
        if (isAuthStatus(error)) await tokenStore.clearToken?.();
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
    if (nextUser.role !== "RIDER") throw new Error("This account cannot use the Captain app.");
    await tokenStore.setToken?.(accessToken);
    if (refreshToken) await refreshTokenStore.setToken(refreshToken);
    setUser(nextUser);
  }

  return <AuthContext.Provider value={{
    user, loading, biometricAvailable, biometricEnabled,
    login: async (body) => {
      const result = await authApi.login({
        ...body,
        phoneNumber: normalizeNigerianPhoneNumber(body.phoneNumber)
      });
      await saveSession(result.accessToken, result.refreshToken, result.user);
    },
    refreshWithBiometrics: async () => {
      const refreshToken = await refreshTokenStore.getToken();
      if (!refreshToken) throw new Error("Biometric sign-in needs a saved KariGO Captain session. Please sign in with your password first.");
      const enabled = await getBiometricSignInEnabled();
      if (!enabled) throw new Error("Biometric sign-in is not enabled on this device.");
      await authenticateWithBiometrics("Sign in to KariGO Captain");
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
      await authenticateWithBiometrics("Enable KariGO Captain biometric sign-in");
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
  }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used inside AuthProvider"); return value; }
