import type { AuthenticatedUser, LoginRequest, LoginVerificationRequiredResult } from "@karigo/shared-types";
import { api } from "./client";

export type AdminPortalUser = Omit<AuthenticatedUser, "phoneNumber"> & {phoneNumber?:string|null};
type PortalLoginResult = { user: AdminPortalUser } | LoginVerificationRequiredResult;

export const authApi = {
  emailLogin: (body: {email:string;password:string}) => api.post<PortalLoginResult>("auth/admin-email/login", body, { authenticated: false }),
  login: (body: LoginRequest) => api.post<PortalLoginResult>("auth/login", body, { authenticated: false }),
  logout: () => api.post<{ loggedOut: boolean }>("auth/logout", {}),
  me: () => api.get<AdminPortalUser>("auth/me")
};
