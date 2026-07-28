import { normalizeApiBaseUrl } from "@karigo/config";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ACCESS_COOKIE = "karigo_vendor_access";
const REFRESH_COOKIE = "karigo_vendor_refresh";
const CSRF_COOKIE = "karigo_vendor_csrf";
const REQUIRED_ROLE = "VENDOR";

const PUBLIC_AUTH_PATHS = [
  "auth/login",
  "auth/vendor/activate",
  "auth/vendor/activation-link/request",
  "auth/password-reset/request",
  "auth/password-reset/confirm",
  "auth/resend-otp",
  "auth/verify-otp"
];

type BackendPayload = {
  success?: boolean;
  message?: string;
  data?: unknown;
  error_code?: string;
  details?: unknown;
};

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function productionPortal() {
  return process.env.VERCEL_ENV === "production" || process.env.APP_ENV === "production" || process.env.PORTAL_ENV === "production";
}

function apiBaseUrl() {
  const configured = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!configured?.trim() && productionPortal()) {
    throw new Error("Partner Workspace BFF requires API_BASE_URL or NEXT_PUBLIC_API_BASE_URL in production.");
  }
  return normalizeApiBaseUrl(configured);
}

function cookieSecure() {
  return process.env.COOKIE_SECURE === "false" ? false : process.env.NODE_ENV !== "development";
}

function cookieMaxAge(name: "access" | "refresh") {
  const fallback = name === "access" ? 15 * 60 : 30 * 24 * 60 * 60;
  const configured = Number(process.env[name === "access" ? "SESSION_TTL_SECONDS" : "REFRESH_TOKEN_TTL_SECONDS"]);
  return Number.isFinite(configured) && configured > 0 ? configured : fallback;
}

function sameSite(): "lax" | "strict" {
  return process.env.COOKIE_SAME_SITE === "strict" ? "strict" : "lax";
}

function normalizeOrigin(value?: string | null) {
  return value?.trim().replace(/\/+$/, "");
}

function portalOrigins(request: NextRequest) {
  return [
    request.nextUrl.origin,
    process.env.VENDOR_PORTAL_ORIGIN,
    process.env.NEXT_PUBLIC_VENDOR_PORTAL_ORIGIN
  ].map((origin) => normalizeOrigin(origin)).filter(Boolean) as string[];
}

function isAllowedOrigin(request: NextRequest) {
  const origin = normalizeOrigin(request.headers.get("origin"));
  const referer = request.headers.get("referer");
  const allowed = portalOrigins(request);
  if (origin) return allowed.includes(origin);
  if (referer) {
    try {
      return allowed.includes(new URL(referer).origin.replace(/\/+$/, ""));
    } catch {
      return false;
    }
  }
  return process.env.NODE_ENV === "development";
}

function csrfToken() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function setSessionCookies(response: NextResponse, accessToken: string, refreshToken?: string) {
  response.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: sameSite(),
    path: "/",
    maxAge: cookieMaxAge("access")
  });
  if (refreshToken) {
    response.cookies.set(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: cookieSecure(),
      sameSite: sameSite(),
      path: "/",
      maxAge: cookieMaxAge("refresh")
    });
  }
  response.cookies.set(CSRF_COOKIE, csrfToken(), {
    httpOnly: false,
    secure: cookieSecure(),
    sameSite: sameSite(),
    path: "/",
    maxAge: cookieMaxAge("refresh")
  });
}

function clearSessionCookies(response: NextResponse) {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE]) {
    response.cookies.set(name, "", {
      httpOnly: name !== CSRF_COOKIE,
      secure: cookieSecure(),
      sameSite: sameSite(),
      path: "/",
      maxAge: 0
    });
  }
}

function publicAuthPath(path: string) {
  return PUBLIC_AUTH_PATHS.some((item) => path === item || path.startsWith(`${item}/`));
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizePayload(payload: BackendPayload): BackendPayload {
  if (!isPlainRecord(payload?.data)) return payload;
  const { accessToken: _accessToken, refreshToken: _refreshToken, refreshTokenId: _refreshTokenId, ...safeData } = payload.data;
  return { ...payload, data: safeData };
}

function jsonError(message: string, status = 403, errorCode = "BFF_SESSION_REJECTED") {
  return NextResponse.json({ success: false, message, error_code: errorCode }, { status });
}

function validateCsrf(request: NextRequest, path: string) {
  if (!unsafeMethods.has(request.method)) return null;
  if (!isAllowedOrigin(request)) {
    return jsonError("Request origin is not allowed.", 403, "CSRF_ORIGIN_REJECTED");
  }
  const hasSession = Boolean(request.cookies.get(ACCESS_COOKIE)?.value || request.cookies.get(REFRESH_COOKIE)?.value);
  if (!hasSession || publicAuthPath(path)) return null;
  const header = request.headers.get("x-karigo-csrf");
  const cookie = request.cookies.get(CSRF_COOKIE)?.value;
  if (!header || !cookie || header !== cookie) {
    return jsonError("CSRF validation failed.", 403, "CSRF_TOKEN_REJECTED");
  }
  return null;
}

async function readBody(request: NextRequest, path: string) {
  if (request.method === "GET" || request.method === "HEAD") return undefined;
  if (path === "auth/logout") {
    return JSON.stringify({ refreshToken: request.cookies.get(REFRESH_COOKIE)?.value });
  }
  const bytes = await request.arrayBuffer();
  return bytes.byteLength ? bytes : undefined;
}

async function fetchBackend(path: string, request: NextRequest, accessToken?: string, body?: BodyInit) {
  const headers = new Headers();
  headers.set("Accept", "application/json");
  const contentType = request.headers.get("content-type");
  if (path === "auth/logout") headers.set("Content-Type", "application/json");
  else if (contentType) headers.set("Content-Type", contentType);
  if (accessToken && !publicAuthPath(path)) headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(`${apiBaseUrl()}/${path}`, {
    method: request.method,
    headers,
    body,
    cache: "no-store"
  });
}

async function refreshSession(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;
  const response = await fetch(`${apiBaseUrl()}/auth/refresh`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store"
    })
    .catch(() => null);
  if (!response) return null;
  const payload = await response.json().catch(() => null) as BackendPayload | null;
  const data = isPlainRecord(payload?.data) ? payload.data : null;
  if (!response.ok || payload?.success === false || typeof data?.accessToken !== "string") return null;
  return data as { accessToken: string; refreshToken?: string; user?: { role?: string } };
}

export async function handleBffRequest(request: NextRequest, pathParts: string[]) {
  const path = pathParts.join("/");
  const csrfFailure = validateCsrf(request, path);
  if (csrfFailure) return csrfFailure;

  const body = await readBody(request, path);
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  let backendResponse: Response;
  try {
    backendResponse = await fetchBackend(path, request, accessToken, body);
  } catch (error) {
    console.error(`Partner BFF backend request failed path=${path} reason=${error instanceof Error ? error.message : "unknown"}`);
    return jsonError("KariGO services are temporarily unavailable. Please try again shortly.", 503, "BFF_BACKEND_UNAVAILABLE");
  }
  let refreshed: { accessToken: string; refreshToken?: string; user?: { role?: string } } | null = null;

  if (backendResponse.status === 401 && !publicAuthPath(path) && path !== "auth/logout") {
    refreshed = await refreshSession(request);
    if (refreshed?.accessToken) {
      try {
        backendResponse = await fetchBackend(path, request, refreshed.accessToken, body);
      } catch (error) {
        console.error(`Partner BFF backend retry failed path=${path} reason=${error instanceof Error ? error.message : "unknown"}`);
        return jsonError("KariGO services are temporarily unavailable. Please try again shortly.", 503, "BFF_BACKEND_UNAVAILABLE");
      }
    }
  }

  const contentType = backendResponse.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const response = jsonError(
      backendResponse.status >= 500
        ? "KariGO services are temporarily unavailable. Please try again shortly."
        : "Request could not be completed safely.",
      backendResponse.status,
      "BFF_BACKEND_NON_JSON"
    );
    if (backendResponse.status === 401) clearSessionCookies(response);
    return response;
  }

  const payload = await backendResponse.json().catch(() => null) as BackendPayload | null;
  const data = isPlainRecord(payload?.data) ? payload.data : undefined;
  const accessFromPayload = typeof data?.accessToken === "string" ? data.accessToken : undefined;
  const refreshFromPayload = typeof data?.refreshToken === "string" ? data.refreshToken : undefined;
  const role = data?.user && typeof data.user === "object" ? (data.user as { role?: string }).role : undefined;

  if (accessFromPayload && !role) {
    const response = jsonError("Your session could not be created. Please try again.", 502, "BFF_SESSION_USER_MISSING");
    clearSessionCookies(response);
    return response;
  }

  if (accessFromPayload && role !== REQUIRED_ROLE) {
    const response = jsonError("This account is not authorised for the Partner Workspace.", 403, "PORTAL_ROLE_REJECTED");
    clearSessionCookies(response);
    return response;
  }

  const response = NextResponse.json(payload ? sanitizePayload(payload) : { success: false, message: "Backend response was unavailable." }, {
    status: backendResponse.status
  });
  if (refreshed?.accessToken) setSessionCookies(response, refreshed.accessToken, refreshed.refreshToken);
  if (accessFromPayload) setSessionCookies(response, accessFromPayload, refreshFromPayload);
  if (path === "auth/logout" || backendResponse.status === 401 || backendResponse.status === 403) clearSessionCookies(response);
  return response;
}
