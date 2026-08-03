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
import { authSessionStore, onUnauthorized, refreshTokenStore } from "../api/client";
import { normalizeNigerianPhoneNumber } from "../lib/phone";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  loading: boolean;
  sessionMessage: string;
  sessionRepairRequired: boolean;
  login(body: LoginRequest): Promise<void>;
  resetSavedLogin(): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isAuthStatus(error: unknown): boolean {
  return error instanceof KariGoApiError && error.status === 401;
}

function isDefinitiveAuthFailure(error: unknown): boolean {
  if (!(error instanceof KariGoApiError) || error.status !== 401) return false;
  const code = error.errorCode.toUpperCase();
  return code === "API_REQUEST_FAILED" ||
    code.includes("TOKEN_INVALID") ||
    code.includes("TOKEN_EXPIRED") ||
    code.includes("TOKEN_REVOKED") ||
    code.includes("REFRESH_TOKEN_INVALID") ||
    code.includes("REFRESH_TOKEN_EXPIRED") ||
    code.includes("REFRESH_TOKEN_REVOKED") ||
    code.includes("ACCOUNT_DISABLED") ||
    code.includes("USER_DISABLED");
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

function canUsePartnerApp(user: AuthenticatedUser): boolean {
  return user.role === "VENDOR" || user.role === "CUSTOMER" || user.role === "RIDER";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState("");
  const [sessionRepairRequired, setSessionRepairRequired] = useState(false);

  useEffect(() => {
    const off = onUnauthorized((meta) => {
      if (!authSessionStore.isCurrent(meta?.generation)) {
        return;
      }
      setUser(null);
      setSessionMessage("Your session has expired. Please sign in again.");
    });
    let active = true;

    async function bootstrap() {
      const generation = authSessionStore.beginOperation();
      try {
        const session = await authSessionStore.readSession();
        if (!session) {
          if (active && authSessionStore.isCurrent(generation)) setLoading(false);
          return;
        }

        const currentUser = await authApi.me();
        if (!active || !authSessionStore.isCurrent(generation)) return;

        if (canUsePartnerApp(currentUser)) {
          setUser(currentUser);
          setSessionMessage("");
          setSessionRepairRequired(false);
        } else {
          await authSessionStore.clearSession(generation);
          setUser(null);
          setSessionMessage("This KariGO account cannot access Partner onboarding.");
        }
      } catch (error) {
        if (!active || !authSessionStore.isCurrent(generation)) {
          return;
        }
        if (error instanceof SessionCorruptionError) {
          setUser(null);
          setSessionRepairRequired(true);
          setSessionMessage("Your saved Partner login could not be read safely. Reset saved login, then sign in again.");
          logMobileAuthDiagnostic("partner", "bootstrap_session_repair_required", { generation });
        } else if (isDefinitiveAuthFailure(error)) {
          await authSessionStore.clearSession(generation);
          setUser(null);
          setSessionMessage("Your session has expired. Please sign in again.");
          logMobileAuthDiagnostic("partner", "bootstrap_session_expired", { generation });
        } else if (isAuthStatus(error)) {
          setSessionMessage("KariGO Partner could not confirm your saved login right now. Your saved login was kept.");
          logMobileAuthDiagnostic("partner", "bootstrap_auth_status_preserved", { generation });
        } else if (isTemporarySessionFailure(error)) {
          setSessionMessage("KariGO Partner could not reconnect right now. Your saved login was kept, so please try again shortly.");
          logMobileAuthDiagnostic("partner", "bootstrap_temporary_failure", { generation });
        }
      } finally {
        if (active && authSessionStore.isCurrent(generation)) setLoading(false);
      }
    }

    void bootstrap();

    return () => {
      active = false;
      off();
    };
  }, []);

  async function saveSession(accessToken: string, refreshToken: string | undefined, nextUser: AuthenticatedUser, generation: number) {
    if (!accessToken) {
      throw new SessionPersistenceError("Login response did not include an access token.");
    }
    if (!refreshToken) {
      throw new SessionPersistenceError("Login response did not include a refresh token.");
    }
    if (!canUsePartnerApp(nextUser)) {
      throw new Error("This KariGO account cannot access Partner onboarding. Contact KariGO support if this looks wrong.");
    }
    await authSessionStore.persistTokenPair(accessToken, refreshToken, generation);
    if (!authSessionStore.isCurrent(generation)) {
      throw new StaleAuthOperationError();
    }
    setSessionRepairRequired(false);
    setSessionMessage("");
    setUser(nextUser);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        sessionMessage,
        sessionRepairRequired,
        login: async (body) => {
          const generation = authSessionStore.beginNewSession();
          const result = await authApi.login({
            ...body,
            phoneNumber: normalizeNigerianPhoneNumber(body.phoneNumber)
          });
          await saveSession(result.accessToken, result.refreshToken, result.user, generation);
        },
        resetSavedLogin: async () => {
          await authSessionStore.resetSavedLogin();
          setUser(null);
          setSessionRepairRequired(false);
          setSessionMessage("Saved login reset. Please sign in again.");
        },
        logout: async () => {
          const refreshToken = await refreshTokenStore.getToken();
          const generation = authSessionStore.beginNewSession();
          if (refreshToken) {
            await authApi.logout({ refreshToken }).catch(() => undefined);
          }
          await authSessionStore.clearSession(generation);
          setUser(null);
        }
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
