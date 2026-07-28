import { normalizeApiBaseUrl } from "@karigo/config";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const API_BASE_URL = normalizeApiBaseUrl(process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL);
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
  data?: Record<string, unknown>;
  error_code?: string;
  details?: unknown;
};

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

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

function portalOrigins(request: NextRequest) {
  return [
    request.nextUrl.origin,
    process.env.VENDOR_PORTAL_ORIGIN,
    process.env.NEXT_PUBLIC_VENDOR_PORTAL_ORIGIN
  ].filter(Boolean) as string[];
}

function isAllowedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const allowed = portalOrigins(request);
  if (origin) return allowed.includes(origin);
  if (referer) {
    try {
      return allowed.includes(new URL(referer).origin);
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

function sanitizePayload(payload: BackendPayload): BackendPayload {
  if (!payload?.data || typeof payload.data !== "object") return payload;
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
  return fetch(`${API_BASE_URL}/${path}`, {
    method: request.method,
    headers,
    body,
    cache: "no-store"
  });
}

async function refreshSession(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store"
  });
  const payload = await response.json().catch(() => null) as BackendPayload | null;
  if (!response.ok || payload?.success === false || !payload?.data?.accessToken) return null;
  return payload.data as { accessToken: string; refreshToken?: string; user?: { role?: string } };
}

export async function handleBffRequest(request: NextRequest, pathParts: string[]) {
  const path = pathParts.join("/");
  const csrfFailure = validateCsrf(request, path);
  if (csrfFailure) return csrfFailure;

  const body = await readBody(request, path);
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  let backendResponse = await fetchBackend(path, request, accessToken, body);
  let refreshed: { accessToken: string; refreshToken?: string; user?: { role?: string } } | null = null;

  if (backendResponse.status === 401 && !publicAuthPath(path) && path !== "auth/logout") {
    refreshed = await refreshSession(request);
    if (refreshed?.accessToken) {
      backendResponse = await fetchBackend(path, request, refreshed.accessToken, body);
    }
  }

  const contentType = backendResponse.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const raw = await backendResponse.arrayBuffer();
    const response = new NextResponse(raw, { status: backendResponse.status });
    if (backendResponse.status === 401) clearSessionCookies(response);
    return response;
  }

  const payload = await backendResponse.json().catch(() => null) as BackendPayload | null;
  const data = payload?.data;
  const accessFromPayload = typeof data?.accessToken === "string" ? data.accessToken : undefined;
  const refreshFromPayload = typeof data?.refreshToken === "string" ? data.refreshToken : undefined;
  const role = data?.user && typeof data.user === "object" ? (data.user as { role?: string }).role : undefined;

  if (accessFromPayload && role && role !== REQUIRED_ROLE) {
    const response = jsonError("This account cannot use the partner workspace.", 403, "PORTAL_ROLE_REJECTED");
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
