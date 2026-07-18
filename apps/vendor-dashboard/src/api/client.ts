"use client";
import { createApiClient, normalizeApiBaseUrl, TokenStore } from "@karigo/config";

const KEY = "karigo_vendor_access_token";
const REFRESH_KEY = "karigo_vendor_refresh_token";
const API_BASE_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

export const tokenStore: TokenStore = {
  getToken: () => typeof window === "undefined" ? null : window.localStorage.getItem(KEY),
  setToken: (token) => window.localStorage.setItem(KEY, token),
  clearToken: () => {
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  }
};

export const refreshTokenStore = {
  getToken: () => typeof window === "undefined" ? null : window.localStorage.getItem(REFRESH_KEY),
  setToken: (token: string) => window.localStorage.setItem(REFRESH_KEY, token),
  clearToken: () => window.localStorage.removeItem(REFRESH_KEY)
};
const listeners = new Set<() => void>();
export function onUnauthorized(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export const api = createApiClient({
  baseUrl: API_BASE_URL,
  tokenStore,
  refreshAuth: async () => {
    const refreshToken = refreshTokenStore.getToken();
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
      tokenStore.clearToken?.();
      return false;
    }

    tokenStore.setToken?.(payload.data.accessToken);
    refreshTokenStore.setToken(payload.data.refreshToken);
    return true;
  },
  onUnauthorized: () => {
    tokenStore.clearToken?.();
    listeners.forEach((listener) => listener());
  }
});
