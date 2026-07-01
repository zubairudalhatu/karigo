import type { AuthenticatedUser, LoginRequest, LoginResult } from "@karigo/shared-types";
import { api } from "./client";
export const authApi = { login: (body: LoginRequest) => api.post<LoginResult>("auth/login", body, { authenticated: false }), me: () => api.get<AuthenticatedUser>("auth/me") };
