"use client";

import { createApiClient } from "@karigo/config";

const CSRF_COOKIE = "karigo_vendor_csrf";

function readCookie(name: string) {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${encodeURIComponent(name)}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : undefined;
}

export function csrfHeaders(): Record<string, string> {
  const token = readCookie(CSRF_COOKIE);
  return token ? { "x-karigo-csrf": token } : {};
}

const listeners = new Set<() => void>();

export function onUnauthorized(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const api = createApiClient({
  baseUrl: "/api/bff",
  defaultHeaders: csrfHeaders,
  onUnauthorized: () => {
    listeners.forEach((listener) => listener());
  }
});
