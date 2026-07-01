"use client";
import { createApiClient, TokenStore } from "@karigo/config";
const KEY = "karigo_vendor_access_token";
export const tokenStore: TokenStore = {
  getToken: () => typeof window === "undefined" ? null : window.localStorage.getItem(KEY),
  setToken: (token) => window.localStorage.setItem(KEY, token),
  clearToken: () => window.localStorage.removeItem(KEY)
};
const listeners = new Set<() => void>();
export function onUnauthorized(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export const api = createApiClient({ baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL, tokenStore, onUnauthorized: () => { tokenStore.clearToken?.(); listeners.forEach((listener) => listener()); } });
