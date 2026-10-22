import {
  DEFAULT_AUTH_API_TIMEOUT_MS,
  RefreshAuthResult,
  SessionCorruptionError,
  SessionPersistenceError,
  StaleAuthOperationError,
  createApiClient,
  createVersionedAuthSessionStore,
  logMobileAuthDiagnostic,
  validateMobileApiBaseUrl
} from "@karigo/config";
import { AppState, Platform } from "react-native";
import { createCaptainIosSessionStore } from "../lib/captain-ios-session";
import * as SecureStore from "expo-secure-store";
import { diagnosedSessionStorage } from "../lib/background-session";
import { locationDiagnostic } from "../lib/location-diagnostics";

const LEGACY_TOKEN_KEY = "karigo_rider_access_token";
const LEGACY_REFRESH_TOKEN_KEY = "karigo_rider_refresh_token";
const SESSION_KEY = "karigo_captain_session_v2";
const API_BASE_URL = validateMobileApiBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL,
  {
    appName: "Captain App",
    production: process.env.APP_VARIANT === "production"
  }
);

const iosSessionStore = Platform.OS === "ios" ? createCaptainIosSessionStore({
  storage: diagnosedSessionStorage(SecureStore),
  afterFirstUnlock: SecureStore.AFTER_FIRST_UNLOCK,
  isForeground: () => AppState.currentState === "active",
  verifyLegacyAccess: async accessToken => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_AUTH_API_TIMEOUT_MS);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, { headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` }, signal: controller.signal });
      const payload = await response.json().catch(() => null);
      if (response.status === 401 || response.status === 403) return "";
      if (!response.ok || !payload?.success || !payload?.data?.id) throw new SessionPersistenceError("Captain session validation could not complete.");
      return payload.data.id as string;
    } finally { clearTimeout(timeout); }
  }
}) : null;
export const authSessionStore = iosSessionStore ?? createVersionedAuthSessionStore({
  appName: "Captain App",
  storage: diagnosedSessionStorage(SecureStore, reason => { void locationDiagnostic("AUTH", { reason }); }),
  sessionKey: SESSION_KEY,
  legacyAccessTokenKey: LEGACY_TOKEN_KEY,
  legacyRefreshTokenKey: LEGACY_REFRESH_TOKEN_KEY
});

export const tokenStore = authSessionStore.tokenStore;
export const refreshTokenStore = authSessionStore.refreshTokenStore;

type UnauthorizedListener = (meta?: { generation?: number }) => void;

const unauthorizedListeners = new Set<UnauthorizedListener>();
let refreshFlight: { generation?: number; promise: Promise<RefreshAuthResult> } | null = null;

export function onUnauthorized(listener: UnauthorizedListener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

function refreshFailureIsTemporary(status: number, errorCode?: string): boolean {
  if (status === 429 || status >= 500) {
    return true;
  }
  return errorCode === "PROVIDER_TEMPORARILY_UNAVAILABLE" ||
    errorCode === "SERVICE_UNAVAILABLE" ||
    errorCode === "NETWORK_UNAVAILABLE";
}

function refreshFailureIsDefinitive(status: number, errorCode?: string): boolean {
  const normalizedCode = errorCode?.toUpperCase() ?? "";
  return status === 400 ||
    status === 401 ||
    status === 403 ||
    normalizedCode.includes("REFRESH_TOKEN_INVALID") ||
    normalizedCode.includes("REFRESH_TOKEN_EXPIRED") ||
    normalizedCode.includes("REFRESH_TOKEN_REVOKED") ||
    normalizedCode.includes("REFRESH_TOKEN_REUSED") ||
    normalizedCode.includes("ACCOUNT_DISABLED") ||
    normalizedCode.includes("USER_DISABLED");
}

async function fetchRefreshSession(refreshToken: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_AUTH_API_TIMEOUT_MS);

  try {
    return await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function performRefreshAuth(operationGeneration?: number): Promise<RefreshAuthResult> {
  if (!authSessionStore.isCurrent(operationGeneration)) {
    logMobileAuthDiagnostic("captain", "refresh_stale_before_start", { generation: operationGeneration });
    return "stale";
  }

  const session = await authSessionStore.readSession();
  if (!session?.refreshToken) {
    void locationDiagnostic("AUTH", { sessionAvailable: false, reason: "REFRESH_TOKEN_UNAVAILABLE" });
    logMobileAuthDiagnostic("captain", "refresh_no_saved_session", { generation: operationGeneration });
    return "rejected";
  }

  try {
    const response = await fetchRefreshSession(session.refreshToken);
    const payload = await response.json().catch(() => null) as {
      success?: boolean;
      error_code?: string;
      message?: string;
      data?: { accessToken?: string; refreshToken?: string };
    } | null;

    if (!response.ok || !payload?.success) {
      void locationDiagnostic("AUTH", { sessionAvailable: false, reason: "REFRESH_FAILED" });
      const errorCode = payload?.error_code;
      if (refreshFailureIsTemporary(response.status, errorCode)) {
        logMobileAuthDiagnostic("captain", "refresh_temporary_failure", {
          status: response.status,
          errorCode,
          generation: operationGeneration
        });
        return "temporarily_unavailable";
      }
      if (refreshFailureIsDefinitive(response.status, errorCode)) {
        await authSessionStore.clearSession(operationGeneration);
        logMobileAuthDiagnostic("captain", "refresh_rejected", {
          status: response.status,
          errorCode,
          generation: operationGeneration
        });
        return "rejected";
      }
      logMobileAuthDiagnostic("captain", "refresh_unclassified_failure", {
        status: response.status,
        errorCode,
        generation: operationGeneration
      });
      return "temporarily_unavailable";
    }

    const nextAccessToken = payload.data?.accessToken;
    const nextRefreshToken = payload.data?.refreshToken;
    if (!nextAccessToken || !nextRefreshToken) {
      logMobileAuthDiagnostic("captain", "refresh_missing_token_pair", { generation: operationGeneration });
      return "temporarily_unavailable";
    }

    if (iosSessionStore) await iosSessionStore.persistRefreshedPair(session, nextAccessToken, nextRefreshToken, operationGeneration);
    else await authSessionStore.persistTokenPair(nextAccessToken, nextRefreshToken, operationGeneration);
    logMobileAuthDiagnostic("captain", "refresh_succeeded", { generation: operationGeneration });
    return "refreshed";
  } catch (error) {
    if (error instanceof StaleAuthOperationError) {
      logMobileAuthDiagnostic("captain", "refresh_stale_after_start", { generation: operationGeneration });
      return "stale";
    }
    if (error instanceof SessionCorruptionError || error instanceof SessionPersistenceError) {
      throw error;
    }
    logMobileAuthDiagnostic("captain", "refresh_network_or_timeout", { generation: operationGeneration });
    return "temporarily_unavailable";
  }
}

async function refreshAuth(meta: { generation?: number }): Promise<RefreshAuthResult> {
  const operationGeneration = meta.generation;
  if (
    refreshFlight &&
    refreshFlight.generation === operationGeneration &&
    authSessionStore.isCurrent(operationGeneration)
  ) {
    logMobileAuthDiagnostic("captain", "refresh_joined_existing", { generation: operationGeneration });
    return refreshFlight.promise;
  }

  const flight = {
    generation: operationGeneration,
    promise: performRefreshAuth(operationGeneration)
  };
  refreshFlight = flight;
  try {
    return await flight.promise;
  } finally {
    if (refreshFlight === flight) {
      refreshFlight = null;
    }
  }
}

export const api = createApiClient({
  baseUrl: API_BASE_URL,
  tokenStore,
  getSessionGeneration: authSessionStore.currentGeneration,
  refreshAuth,
  onUnauthorized: async (status, meta) => {
    await authSessionStore.clearSession(meta?.generation);
    if (authSessionStore.isCurrent(meta?.generation)) {
      logMobileAuthDiagnostic("captain", "unauthorized_session_cleared", {
        status,
        generation: meta?.generation,
        errorCode: meta?.errorCode
      });
      unauthorizedListeners.forEach((listener) => listener({ generation: meta?.generation }));
    } else {
      logMobileAuthDiagnostic("captain", "unauthorized_stale_ignored", {
        status,
        generation: meta?.generation
      });
    }
  }
});

export { API_BASE_URL };

export async function migrateCaptainSessionAfterForegroundAuth(userId: string) {
  if (iosSessionStore) await iosSessionStore.migrateForegroundSession(userId);
}

export async function captainLogoutRefreshToken() {
  if (Platform.OS !== "ios") return await refreshTokenStore.getToken();
  try { return await refreshTokenStore.getToken(); } catch { return null; }
}
