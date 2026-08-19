import {
  ApiNetworkError,
  ApiParseError,
  ApiTimeoutError,
  SessionCorruptionError,
  SessionPersistenceError,
  SessionTemporarilyUnavailableError,
  StaleAuthOperationError,
  logMobileAuthDiagnostic
} from "@karigo/config";
import type { AuthenticatedUser, LoginRequest } from "@karigo/shared-types";
import { KariGoApiError } from "@karigo/shared-types";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { authApi } from "../api/auth.api";
import { deactivateCaptainPushNotifications } from "../lib/captain-notifications";
import { disableActiveWorkBackgroundLocation } from "../lib/background-location";

import { authSessionStore, onUnauthorized, refreshTokenStore } from "../api/client";
import { authenticateWithBiometrics, getBiometricCapability, getBiometricSignInEnabled, setBiometricSignInEnabled } from "../lib/biometric-auth";
import { normalizeNigerianPhoneNumber } from "../lib/phone";

interface AuthValue {
  user: AuthenticatedUser | null;
  loading: boolean;
  sessionMessage: string;
  sessionRepairRequired: boolean;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  login(body: LoginRequest): Promise<void>;
  refreshWithBiometrics(): Promise<void>;
  setBiometricSignIn(enabled: boolean): Promise<void>;
  resetSavedLogin(): Promise<void>;
  logout(): Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);

function isAuthStatus(error: unknown) {
  return error instanceof KariGoApiError && error.status === 401;
}

function isTemporarySessionFailure(error: unknown): boolean {
  return error instanceof ApiNetworkError ||
    error instanceof ApiTimeoutError ||
    error instanceof ApiParseError ||
    error instanceof SessionTemporarilyUnavailableError ||
    (error instanceof KariGoApiError && (
      error.status === 429 ||
      error.status === 502 ||
      error.status === 503 ||
      error.status === 504
    ));
}

function canUseCaptainApp(user: AuthenticatedUser) {
  return user.role === "RIDER" || user.role === "CUSTOMER";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState("");
  const [sessionRepairRequired, setSessionRepairRequired] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  useEffect(() => {
    const unsubscribe = onUnauthorized((meta) => {
      if (!authSessionStore.isCurrent(meta?.generation)) {
        return;
      }
      setUser(null);
      setSessionMessage("Your session has expired. Please sign in again.");
    });
    let active = true;

    async function bootstrap() {
      const generation = authSessionStore.beginOperation();
      const [capability, enabled] = await Promise.all([
        getBiometricCapability().catch(() => ({ available: false, hasHardware: false, enrolled: false })),
        getBiometricSignInEnabled().catch(() => false)
      ]);
      if (active && authSessionStore.isCurrent(generation)) {
        setBiometricAvailable(capability.available);
        setBiometricEnabledState(enabled);
      }

      try {
        const session = await authSessionStore.readSession();
        if (!session) {
          if (active && authSessionStore.isCurrent(generation)) setLoading(false);
          return;
        }

        const current = await authApi.me();
        if (!active || !authSessionStore.isCurrent(generation)) return;
        if (canUseCaptainApp(current)) {
          setUser(current);
          setSessionMessage("");
          setSessionRepairRequired(false);
        } else {
          await authSessionStore.clearSession(generation);
          setUser(null);
          setSessionMessage("This account cannot use the Captain app.");
        }
      } catch (error) {
        if (!active || !authSessionStore.isCurrent(generation)) {
          return;
        }
        if (error instanceof SessionCorruptionError) {
          setUser(null);
          setSessionRepairRequired(true);
          setSessionMessage("Your saved Captain login could not be read safely. Reset saved login, then sign in again.");
          logMobileAuthDiagnostic("captain", "bootstrap_session_repair_required", { generation });
        } else if (isAuthStatus(error)) {
          await authSessionStore.clearSession(generation);
          setUser(null);
          setSessionMessage("Your session has expired. Please sign in again.");
          logMobileAuthDiagnostic("captain", "bootstrap_session_expired", { generation });
        } else if (isTemporarySessionFailure(error)) {
          setSessionMessage("KariGO Captain could not reconnect right now. Your saved login was kept, so please try again shortly.");
          logMobileAuthDiagnostic("captain", "bootstrap_temporary_failure", { generation });
        }
      } finally {
        if (active && authSessionStore.isCurrent(generation)) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  async function saveSession(accessToken: string, refreshToken: string | undefined, nextUser: AuthenticatedUser, generation: number) {
    if (!canUseCaptainApp(nextUser)) throw new Error("This account cannot use the Captain app.");
    if (!refreshToken) {
      throw new SessionPersistenceError("KariGO Captain did not receive a complete login session. Please try again.");
    }
    await authSessionStore.persistTokenPair(accessToken, refreshToken, generation);
    if (!authSessionStore.isCurrent(generation)) {
      throw new StaleAuthOperationError();
    }
    setSessionRepairRequired(false);
    setSessionMessage("");
    setUser(nextUser);
  }

  return <AuthContext.Provider value={{
    user, loading, sessionMessage, sessionRepairRequired, biometricAvailable, biometricEnabled,
    login: async (body) => {
      const generation = authSessionStore.beginNewSession();
      const result = await authApi.login({
        ...body,
        phoneNumber: normalizeNigerianPhoneNumber(body.phoneNumber)
      });
      await saveSession(result.accessToken, result.refreshToken, result.user, generation);
    },
    refreshWithBiometrics: async () => {
      const refreshToken = await refreshTokenStore.getToken();
      if (!refreshToken) throw new Error("Biometric sign-in needs a saved KariGO Captain session. Please sign in with your password first.");
      const enabled = await getBiometricSignInEnabled();
      if (!enabled) throw new Error("Biometric sign-in is not enabled on this device.");
      await authenticateWithBiometrics("Sign in to KariGO Captain");
      const generation = authSessionStore.beginNewSession();
      const result = await authApi.refresh({ refreshToken });
      await saveSession(result.accessToken, result.refreshToken, result.user, generation);
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
    resetSavedLogin: async () => {
      await authSessionStore.resetSavedLogin();
      setUser(null);
      setSessionRepairRequired(false);
      setSessionMessage("Saved login reset. Please sign in again.");
    },
    logout: async () => {
      await Promise.allSettled([
        deactivateCaptainPushNotifications(),
        disableActiveWorkBackgroundLocation()
      ]);
      const refreshToken = await refreshTokenStore.getToken();
      const generation = authSessionStore.beginNewSession();
      if (refreshToken) {
        await authApi.logout({ refreshToken }).catch(() => undefined);
      }
      await authSessionStore.clearSession(generation);
      setUser(null);
    }
  }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used inside AuthProvider"); return value; }
