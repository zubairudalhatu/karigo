import type { AuthenticatedUser, ConfirmPasswordResetRequest, LoginRequest, LoginResult, LogoutRequest, RefreshSessionRequest, RequestPasswordResetRequest, RequestPasswordResetResult } from "@karigo/shared-types";
import { api } from "./client";

export const authApi = {
  login: (body: LoginRequest) => api.post<LoginResult>("auth/login", body, { authenticated: false, retryOnNetworkFailure: true }),
  refresh: (body: RefreshSessionRequest) => api.post<LoginResult>("auth/refresh", body, { authenticated: false }),
  requestPasswordReset: (body: RequestPasswordResetRequest) =>
    api.post<RequestPasswordResetResult>("auth/password-reset/request", body, { authenticated: false }),
  confirmPasswordReset: (body: ConfirmPasswordResetRequest) =>
    api.post<{ passwordReset: boolean }>("auth/password-reset/confirm", body, { authenticated: false }),
  logout: (body: LogoutRequest) => api.post<{ loggedOut: boolean }>("auth/logout", body),
  me: () => api.get<AuthenticatedUser>("auth/me")
};
