import {
  ApiErrorResponse,
  ApiSuccessResponse,
  KariGoApiError
} from "@karigo/shared-types";

export const DEFAULT_API_BASE_URL = "http://localhost:4000/api/v1";

export interface TokenStore {
  getToken(): string | null | Promise<string | null>;
  setToken?(token: string): void | Promise<void>;
  clearToken?(): void | Promise<void>;
}

export interface ApiClientOptions {
  baseUrl?: string;
  tokenStore?: TokenStore;
  defaultHeaders?: Record<string, string>;
  onUnauthorized?: (status: number) => void | Promise<void>;
  refreshAuth?: () => boolean | Promise<boolean>;
}

export interface ApiRequestOptions extends Omit<RequestInit, "body" | "headers"> {
  body?: unknown;
  headers?: Record<string, string>;
  authenticated?: boolean;
}

export function normalizeApiBaseUrl(value?: string): string {
  return (value?.trim() || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = normalizeApiBaseUrl(options.baseUrl);

  async function request<T>(path: string, requestOptions: ApiRequestOptions = {}, hasRetried = false): Promise<T> {
    const token = requestOptions.authenticated === false ? null : await options.tokenStore?.getToken();
    const response = await fetch(`${baseUrl}/${path.replace(/^\/+/, "")}`, {
      ...requestOptions,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options.defaultHeaders,
        ...requestOptions.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: requestOptions.body === undefined ? undefined : JSON.stringify(requestOptions.body)
    });

    const payload = (await response.json().catch(() => null)) as ApiSuccessResponse<T> | ApiErrorResponse | null;
    if (!response.ok || !payload || payload.success === false) {
      if (requestOptions.authenticated !== false && response.status === 401 && !hasRetried && options.refreshAuth) {
        const refreshed = await options.refreshAuth();
        if (refreshed) {
          return request<T>(path, requestOptions, true);
        }
      }
      if (
        requestOptions.authenticated !== false &&
        (response.status === 401 || response.status === 403)
      ) {
        await options.onUnauthorized?.(response.status);
      }
      const error = payload && payload.success === false ? payload : undefined;
      throw new KariGoApiError(
        error?.message || `Request failed with status ${response.status}`,
        error?.error_code,
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
