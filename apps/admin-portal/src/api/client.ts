"use client";
import { createApiClient, TokenStore } from "@karigo/config";
const KEY = "karigo_admin_access_token"; export const tokenStore: TokenStore = { getToken: () => typeof window === "undefined" ? null : localStorage.getItem(KEY), setToken: (t) => localStorage.setItem(KEY, t), clearToken: () => localStorage.removeItem(KEY) };
const listeners = new Set<() => void>(); export function onUnauthorized(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export const api = createApiClient({ baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL, tokenStore, onUnauthorized: () => { tokenStore.clearToken?.(); listeners.forEach((fn) => fn()); } });
