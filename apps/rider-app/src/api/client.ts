import { createApiClient, normalizeApiBaseUrl, TokenStore } from "@karigo/config";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "karigo_rider_access_token";
const REFRESH_TOKEN_KEY = "karigo_rider_refresh_token";
const API_BASE_URL = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);

export const tokenStore: TokenStore = {
  getToken: () => SecureStore.getItemAsync(TOKEN_KEY),
  setToken: (token) => SecureStore.setItemAsync(TOKEN_KEY, token),
  clearToken: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }
};

export const refreshTokenStore = {
  getToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  setToken: (token: string) => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token),
  clearToken: () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
};

const unauthorizedListeners = new Set<() => void>();
export function onUnauthorized(listener: () => void) {
  unauthorizedListeners.add(listener);
  return () => { unauthorizedListeners.delete(listener); };
}

export const api = createApiClient({
  baseUrl: API_BASE_URL,
  tokenStore,
  refreshAuth: async () => {
    const refreshToken = await refreshTokenStore.getToken();
    if (!refreshToken) return false;

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refreshToken })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success || !payload.data?.accessToken || !payload.data?.refreshToken) {
      await tokenStore.clearToken?.();
      return false;
    }

    await tokenStore.setToken?.(payload.data.accessToken);
    await refreshTokenStore.setToken(payload.data.refreshToken);
    return true;
  },
  onUnauthorized: async () => {
    await tokenStore.clearToken?.();
    unauthorizedListeners.forEach((listener) => listener());
  }
});
