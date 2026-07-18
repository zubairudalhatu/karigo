import type { AuthenticatedUser, LoginRequest, LoginResult, LogoutRequest, RefreshSessionRequest } from "@karigo/shared-types";
import { api } from "./client";
export const authApi = {
  login: (body: LoginRequest) => api.post<LoginResult>("auth/login", body, { authenticated: false }),
  activateVendorAccount: (body: { token: string; password: string }) =>
    api.post<LoginResult>("auth/vendor/activate", body, { authenticated: false }),
  requestVendorActivationLink: (body: { phoneNumber?: string; email?: string }) =>
    api.post<{ requestAccepted: boolean; message: string }>("auth/vendor/activation-link/request", body, { authenticated: false }),
  refresh: (body: RefreshSessionRequest) => api.post<LoginResult>("auth/refresh", body, { authenticated: false }),
  logout: (body: LogoutRequest) => api.post<{ loggedOut: boolean }>("auth/logout", body),
  me: () => api.get<AuthenticatedUser>("auth/me")
};
