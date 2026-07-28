import type { AuthenticatedUser, LoginRequest, LoginResult } from "@karigo/shared-types";
import { api } from "./client";

type PortalLoginResult = Omit<LoginResult, "accessToken" | "refreshToken"> &
  Partial<Pick<LoginResult, "accessToken" | "refreshToken">>;

export const authApi = {
  login: (body: LoginRequest) => api.post<PortalLoginResult>("auth/login", body, { authenticated: false }),
  logout: () => api.post<{ loggedOut: boolean }>("auth/logout", {}),
  me: () => api.get<AuthenticatedUser>("auth/me")
};
