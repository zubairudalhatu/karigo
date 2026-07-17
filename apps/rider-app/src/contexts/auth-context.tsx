import type { AuthenticatedUser, LoginRequest } from "@karigo/shared-types";
import { KariGoApiError } from "@karigo/shared-types";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { authApi } from "../api/auth.api";
import { onUnauthorized, refreshTokenStore, tokenStore } from "../api/client";
import { normalizeNigerianPhoneNumber } from "../lib/phone";

interface AuthValue { user: AuthenticatedUser | null; loading: boolean; login(body: LoginRequest): Promise<void>; logout(): Promise<void>; }
const AuthContext = createContext<AuthValue | null>(null);

function isAuthStatus(error: unknown) {
  return error instanceof KariGoApiError && (error.status === 401 || error.status === 403);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsubscribe = onUnauthorized(() => setUser(null));
    let active = true;

    async function bootstrap() {
      const token = await tokenStore.getToken();
      const refreshToken = await refreshTokenStore.getToken();
      if (!token && !refreshToken) {
        if (active) setLoading(false);
        return;
      }

      try {
        const current = await authApi.me();
        if (!active) return;
        current.role === "RIDER" ? setUser(current) : await tokenStore.clearToken?.();
      } catch (error) {
        if (isAuthStatus(error)) await tokenStore.clearToken?.();
      } finally {
        if (active) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  return <AuthContext.Provider value={{
    user, loading,
    login: async (body) => {
      const result = await authApi.login({
        ...body,
        phoneNumber: normalizeNigerianPhoneNumber(body.phoneNumber)
      });
      if (result.user.role !== "RIDER") throw new Error("This account cannot use the Captain app.");
      await tokenStore.setToken?.(result.accessToken);
      if (result.refreshToken) await refreshTokenStore.setToken(result.refreshToken);
      setUser(result.user);
    },
    logout: async () => {
      const refreshToken = await refreshTokenStore.getToken();
      if (refreshToken) {
        await authApi.logout({ refreshToken }).catch(() => undefined);
      }
      await tokenStore.clearToken?.();
      setUser(null);
    }
  }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used inside AuthProvider"); return value; }
