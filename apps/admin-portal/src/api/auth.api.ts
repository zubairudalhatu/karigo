import type { AuthenticatedUser, LoginRequest, LoginVerificationRequiredResult } from "@karigo/shared-types";
import { api } from "./client";

type PortalLoginResult = { user: AuthenticatedUser } | LoginVerificationRequiredResult;

export const authApi = {
  login: (body: LoginRequest) => api.post<PortalLoginResult>("auth/login", body, { authenticated: false }),
  logout: () => api.post<{ loggedOut: boolean }>("auth/logout", {}),
  me: () => api.get<AuthenticatedUser>("auth/me")
};
