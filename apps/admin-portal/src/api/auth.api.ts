import type { AuthenticatedUser, LoginRequest, LoginResult } from "@karigo/shared-types"; import { api } from "./client";
export const authApi = { login: (b: LoginRequest) => api.post<LoginResult>("auth/login", b, { authenticated: false }), me: () => api.get<AuthenticatedUser>("auth/me") };
