import {
  ApiErrorResponse,
  ApiSuccessResponse,
  KariGoApiError
} from "@karigo/shared-types";

export const DEFAULT_API_BASE_URL = "http://localhost:4000/api/v1";
export const DEFAULT_API_TIMEOUT_MS = 15_000;
export const DEFAULT_AUTH_API_TIMEOUT_MS = 20_000;
export const DEFAULT_HEALTH_API_TIMEOUT_MS = 10_000;

export class ApiResponseError extends KariGoApiError {
  constructor(message: string, errorCode?: string, status?: number, details?: unknown) {
    super(message, errorCode, status, details);
    this.name = "ApiResponseError";
  }
}

export class ApiNetworkError extends Error {
  constructor(message = "Network request failed. Please check your connection and try again.") {
    super(message);
    this.name = "ApiNetworkError";
  }
}

export class ApiTimeoutError extends Error {
  constructor(message = "The request timed out. Please check your connection and try again.") {
    super(message);
    this.name = "ApiTimeoutError";
  }
}

export class ApiParseError extends Error {
  constructor(message = "The server response could not be read safely.") {
    super(message);
    this.name = "ApiParseError";
  }
}

export class ApiBaseUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiBaseUrlError";
  }
}

export class SessionTemporarilyUnavailableError extends Error {
  constructor(message = "Your saved login is still secure. KariGO could not reconnect right now, so please try again shortly.") {
    super(message);
    this.name = "SessionTemporarilyUnavailableError";
  }
}

export class SessionRefreshRejectedError extends Error {
  constructor(message = "Your saved login has expired. Please sign in again.") {
    super(message);
    this.name = "SessionRefreshRejectedError";
  }
}

export class StaleAuthOperationError extends Error {
  constructor(message = "A newer login session is already active.") {
    super(message);
    this.name = "StaleAuthOperationError";
  }
}

export class SessionPersistenceError extends Error {
  constructor(message = "KariGO could not save your login securely on this device.") {
    super(message);
    this.name = "SessionPersistenceError";
  }
}

export class SessionCorruptionError extends Error {
  constructor(message = "Your saved login could not be read safely.") {
    super(message);
    this.name = "SessionCorruptionError";
  }
}

export interface TokenStore {
  getToken(): string | null | Promise<string | null>;
  setToken?(token: string): void | Promise<void>;
  clearToken?(): void | Promise<void>;
}

export interface AuthOperationMeta {
  generation?: number;
  path: string;
  status?: number;
  errorCode?: string;
}

export type RefreshAuthResult =
  | boolean
  | "refreshed"
  | "rejected"
  | "temporarily_unavailable"
  | "stale";

export interface ApiClientOptions {
  baseUrl?: string;
  tokenStore?: TokenStore;
  defaultHeaders?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>);
  onUnauthorized?: (status: number, meta?: AuthOperationMeta) => void | Promise<void>;
  onForbidden?: (status: number) => void | Promise<void>;
  refreshAuth?: (meta: AuthOperationMeta) => RefreshAuthResult | Promise<RefreshAuthResult>;
  getSessionGeneration?: () => number | undefined;
  requestTimeoutMs?: number;
  authTimeoutMs?: number;
  healthTimeoutMs?: number;
}

export interface ApiRequestOptions extends Omit<RequestInit, "body" | "headers"> {
  body?: unknown;
  headers?: Record<string, string>;
  authenticated?: boolean;
  timeoutMs?: number;
  retryOnTemporaryFailure?: boolean;
  retryOnNetworkFailure?: boolean;
}

export interface MobileApiBaseUrlValidationOptions {
  appName: string;
  production?: boolean;
  requireApiV1?: boolean;
}

function isTemporaryHttpStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function isNetworkLikeError(error: unknown): boolean {
  return error instanceof ApiNetworkError || error instanceof ApiTimeoutError;
}

function refreshSucceeded(result: RefreshAuthResult): boolean {
  return result === true || result === "refreshed";
}

function retryDelayMs(): number {
  return 300 + Math.floor(Math.random() * 151);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePath(path: string): string {
  return path.replace(/^\/+/, "");
}

function defaultTimeoutForPath(
  normalizedPath: string,
  options: ApiClientOptions,
  requestTimeout?: number
): number {
  if (requestTimeout) {
    return requestTimeout;
  }
  if (normalizedPath.startsWith("auth/")) {
    return options.authTimeoutMs ?? DEFAULT_AUTH_API_TIMEOUT_MS;
  }
  if (normalizedPath === "health" || normalizedPath.endsWith("/health")) {
    return options.healthTimeoutMs ?? DEFAULT_HEALTH_API_TIMEOUT_MS;
  }
  return options.requestTimeoutMs ?? DEFAULT_API_TIMEOUT_MS;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: init.signal ?? controller.signal
    });
  } catch (error) {
    if (
      controller.signal.aborted ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      throw new ApiTimeoutError();
    }
    throw new ApiNetworkError();
  } finally {
    clearTimeout(timeout);
  }
}

async function readJsonPayload<T>(response: Response): Promise<ApiSuccessResponse<T> | ApiErrorResponse | null> {
  return await response.json().catch(() => null) as ApiSuccessResponse<T> | ApiErrorResponse | null;
}

function shouldRetryAuthMe(path: string, method: string, hasRetried: boolean): boolean {
  return !hasRetried && method === "GET" && normalizePath(path) === "auth/me";
}

function isSafeProductionHost(hostname: string): boolean {
  const lowerHostname = hostname.toLowerCase();
  return lowerHostname !== "localhost" &&
    lowerHostname !== "127.0.0.1" &&
    lowerHostname !== "::1" &&
    !lowerHostname.endsWith(".local");
}

export function normalizeApiBaseUrl(value?: string): string {
  return (value?.trim() || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

export function validateMobileApiBaseUrl(value: string | undefined, options: MobileApiBaseUrlValidationOptions): string {
  const baseUrl = normalizeApiBaseUrl(value);
  const requireApiV1 = options.requireApiV1 ?? true;

  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new ApiBaseUrlError(`${options.appName} API base URL is invalid.`);
  }

  if (options.production) {
    if (parsed.protocol !== "https:") {
      throw new ApiBaseUrlError(`${options.appName} production API base URL must use HTTPS.`);
    }
    if (!isSafeProductionHost(parsed.hostname)) {
      throw new ApiBaseUrlError(`${options.appName} production API base URL cannot point to a local host.`);
    }
    if (requireApiV1 && !parsed.pathname.replace(/\/+$/, "").endsWith("/api/v1")) {
      throw new ApiBaseUrlError(`${options.appName} production API base URL must include /api/v1.`);
    }
  }

  return baseUrl;
}

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = normalizeApiBaseUrl(options.baseUrl);

  async function request<T>(path: string, requestOptions: ApiRequestOptions = {}, hasRetried = false): Promise<T> {
    const {
      authenticated,
      body,
      headers,
      timeoutMs,
      retryOnNetworkFailure,
      retryOnTemporaryFailure,
      ...fetchOptions
    } = requestOptions;
    const normalizedPath = normalizePath(path);
    const method = (fetchOptions.method ?? "GET").toString().toUpperCase();
    const operationGeneration = options.getSessionGeneration?.();
    const token = authenticated === false ? null : await options.tokenStore?.getToken();
    const defaultHeaders = typeof options.defaultHeaders === "function"
      ? await options.defaultHeaders()
      : options.defaultHeaders;
    const requestUrl = `${baseUrl}/${normalizedPath}`;
    const effectiveTimeoutMs = defaultTimeoutForPath(normalizedPath, options, timeoutMs);

    let response: Response;
    try {
      response = await fetchWithTimeout(requestUrl, {
        ...fetchOptions,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...defaultHeaders,
          ...headers,
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: body === undefined ? undefined : JSON.stringify(body)
      }, effectiveTimeoutMs);
    } catch (error) {
      const retryNetwork = retryOnNetworkFailure || shouldRetryAuthMe(normalizedPath, method, hasRetried);
      if (!hasRetried && retryNetwork && isNetworkLikeError(error)) {
        await delay(retryDelayMs());
        return request<T>(path, requestOptions, true);
      }
      throw error;
    }

    if (
      !hasRetried &&
      isTemporaryHttpStatus(response.status) &&
      (retryOnTemporaryFailure || shouldRetryAuthMe(normalizedPath, method, hasRetried))
    ) {
      await delay(retryDelayMs());
      return request<T>(path, requestOptions, true);
    }

    const payload = await readJsonPayload<T>(response);
    if (!payload && response.ok) {
      throw new ApiParseError();
    }

    if (!response.ok || !payload || payload.success === false) {
      const error = payload && payload.success === false ? payload : undefined;
      const errorCode = error?.error_code;

      if (authenticated !== false && response.status === 401 && !hasRetried && options.refreshAuth) {
        const refreshResult = await options.refreshAuth({
          generation: operationGeneration,
          path: normalizedPath,
          status: response.status,
          errorCode
        });
        if (refreshSucceeded(refreshResult)) {
          return request<T>(path, requestOptions, true);
        }
        if (refreshResult === "temporarily_unavailable") {
          throw new SessionTemporarilyUnavailableError();
        }
        if (refreshResult === "stale") {
          throw new StaleAuthOperationError();
        }
      }

      if (authenticated !== false && response.status === 401) {
        await options.onUnauthorized?.(response.status, {
          generation: operationGeneration,
          path: normalizedPath,
          status: response.status,
          errorCode
        });
      }
      if (authenticated !== false && response.status === 403) {
        await options.onForbidden?.(response.status);
      }
      if (!payload) {
        throw new ApiResponseError(`Request failed with status ${response.status}`, undefined, response.status);
      }
      throw new ApiResponseError(
        error?.message || `Request failed with status ${response.status}`,
        errorCode,
        response.status,
        error?.details
      );
    }

    return payload.data;
  }

  return {
    baseUrl,
    request,
    get: <T>(path: string, config?: ApiRequestOptions) => request<T>(path, { ...config, method: "GET" }),
    post: <T>(path: string, body?: unknown, config?: ApiRequestOptions) =>
      request<T>(path, { ...config, method: "POST", body }),
    patch: <T>(path: string, body?: unknown, config?: ApiRequestOptions) =>
      request<T>(path, { ...config, method: "PATCH", body }),
    delete: <T>(path: string, config?: ApiRequestOptions) => request<T>(path, { ...config, method: "DELETE" })
  };
}
