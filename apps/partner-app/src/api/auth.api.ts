import type { AuthenticatedUser, LoginRequest, LoginResult, LogoutRequest, RefreshSessionRequest } from "@karigo/shared-types";
import { api } from "./client";

export const authApi = {
  login: (body: LoginRequest) => api.post<LoginResult>("auth/login", body, { authenticated: false }),
  refresh: (body: RefreshSessionRequest) => api.post<LoginResult>("auth/refresh", body, { authenticated: false }),
  logout: (body: LogoutRequest) => api.post<{ loggedOut: boolean }>("auth/logout", body),
  me: () => api.get<AuthenticatedUser>("auth/me")
};
