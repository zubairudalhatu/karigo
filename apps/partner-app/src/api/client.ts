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
import * as SecureStore from "expo-secure-store";

const LEGACY_TOKEN_KEY = "karigo_partner_access_token";
const LEGACY_REFRESH_TOKEN_KEY = "karigo_partner_refresh_token";
const SESSION_KEY = "karigo_partner_session_v2";
const API_BASE_URL = validateMobileApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL, {
  appName: "Partner App",
  production: process.env.APP_VARIANT === "production"
});

export const authSessionStore = createVersionedAuthSessionStore({
  appName: "Partner App",
  storage: SecureStore,
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
  return () => {
    unauthorizedListeners.delete(listener);
  };
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
    logMobileAuthDiagnostic("partner", "refresh_stale_before_start", { generation: operationGeneration });
    return "stale";
  }

  const session = await authSessionStore.readSession();
  if (!session?.refreshToken) {
    logMobileAuthDiagnostic("partner", "refresh_no_saved_session", { generation: operationGeneration });
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
      const errorCode = payload?.error_code;
      if (refreshFailureIsTemporary(response.status, errorCode)) {
        logMobileAuthDiagnostic("partner", "refresh_temporary_failure", { status: response.status, errorCode, generation: operationGeneration });
        return "temporarily_unavailable";
      }
      if (refreshFailureIsDefinitive(response.status, errorCode)) {
        await authSessionStore.clearSession(operationGeneration);
        logMobileAuthDiagnostic("partner", "refresh_rejected", { status: response.status, errorCode, generation: operationGeneration });
        return "rejected";
      }
      logMobileAuthDiagnostic("partner", "refresh_unclassified_failure", { status: response.status, errorCode, generation: operationGeneration });
      return "temporarily_unavailable";
    }

    const nextAccessToken = payload.data?.accessToken;
    const nextRefreshToken = payload.data?.refreshToken;
    if (!nextAccessToken || !nextRefreshToken) {
      logMobileAuthDiagnostic("partner", "refresh_missing_token_pair", { generation: operationGeneration });
      return "temporarily_unavailable";
    }

    await authSessionStore.persistTokenPair(nextAccessToken, nextRefreshToken, operationGeneration);
    logMobileAuthDiagnostic("partner", "refresh_succeeded", { generation: operationGeneration });
    return "refreshed";
  } catch (error) {
    if (error instanceof StaleAuthOperationError) {
      logMobileAuthDiagnostic("partner", "refresh_stale_after_start", { generation: operationGeneration });
      return "stale";
    }
    if (error instanceof SessionCorruptionError || error instanceof SessionPersistenceError) {
      throw error;
    }
    logMobileAuthDiagnostic("partner", "refresh_network_or_timeout", { generation: operationGeneration });
    return "temporarily_unavailable";
  }
}

async function refreshAuth(meta: { generation?: number }): Promise<RefreshAuthResult> {
  const operationGeneration = meta.generation;
  if (refreshFlight && refreshFlight.generation === operationGeneration && authSessionStore.isCurrent(operationGeneration)) {
    logMobileAuthDiagnostic("partner", "refresh_joined_existing", { generation: operationGeneration });
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
      logMobileAuthDiagnostic("partner", "unauthorized_session_cleared", {
        status,
        generation: meta?.generation,
        errorCode: meta?.errorCode
      });
      unauthorizedListeners.forEach((listener) => listener({ generation: meta?.generation }));
    } else {
      logMobileAuthDiagnostic("partner", "unauthorized_stale_ignored", { status, generation: meta?.generation });
    }
  }
});

export { API_BASE_URL };
