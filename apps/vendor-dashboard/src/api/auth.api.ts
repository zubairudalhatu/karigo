import type { AuthenticatedUser, LoginRequest, LoginVerificationRequiredResult } from "@karigo/shared-types";
import { api } from "./client";

type PortalLoginResult = { user: AuthenticatedUser } | LoginVerificationRequiredResult;

export const authApi = {
  login: (body: LoginRequest) => api.post<PortalLoginResult>("auth/login", body, { authenticated: false }),
  activateVendorAccount: (body: { token: string; password: string }) =>
    api.post<PortalLoginResult>("auth/vendor/activate", body, { authenticated: false }),
  requestVendorActivationLink: (body: { phoneNumber?: string; email?: string }) =>
    api.post<{ requestAccepted: boolean; message: string }>("auth/vendor/activation-link/request", body, { authenticated: false }),
  logout: () => api.post<{ loggedOut: boolean }>("auth/logout", {}),
  me: () => api.get<AuthenticatedUser>("auth/me")
};
