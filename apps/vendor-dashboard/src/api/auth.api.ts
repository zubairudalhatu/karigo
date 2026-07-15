import type { AuthenticatedUser, LoginRequest, LoginResult } from "@karigo/shared-types";
import { api } from "./client";
export const authApi = {
  login: (body: LoginRequest) => api.post<LoginResult>("auth/login", body, { authenticated: false }),
  activateVendorAccount: (body: { token: string; password: string }) =>
    api.post<LoginResult>("auth/vendor/activate", body, { authenticated: false }),
  me: () => api.get<AuthenticatedUser>("auth/me")
};
