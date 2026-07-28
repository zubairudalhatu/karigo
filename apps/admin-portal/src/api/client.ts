"use client";

import { createApiClient } from "@karigo/config";

const CSRF_COOKIE = "karigo_admin_csrf";

function readCookie(name: string) {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${encodeURIComponent(name)}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : undefined;
}

function csrfHeaders(): Record<string, string> {
  const token = readCookie(CSRF_COOKIE);
  return token ? { "x-karigo-csrf": token } : {};
}

const listeners = new Set<() => void>();

export function onUnauthorized(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export const api = createApiClient({
  baseUrl: "/api/bff",
  defaultHeaders: csrfHeaders,
  onUnauthorized: () => {
    listeners.forEach((fn) => fn());
  }
});
