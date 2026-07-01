import type { AuthenticatedUser, LoginRequest } from "@karigo/shared-types";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { authApi } from "../api/auth.api";
import { onUnauthorized, tokenStore } from "../api/client";

interface AuthValue { user: AuthenticatedUser | null; loading: boolean; login(body: LoginRequest): Promise<void>; logout(): Promise<void>; }
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsubscribe = onUnauthorized(() => setUser(null));
    authApi.me().then((current) => current.role === "RIDER" ? setUser(current) : tokenStore.clearToken?.()).catch(() => tokenStore.clearToken?.()).finally(() => setLoading(false));
    return unsubscribe;
  }, []);
  return <AuthContext.Provider value={{
    user, loading,
    login: async (body) => {
      const result = await authApi.login(body);
      if (result.user.role !== "RIDER") throw new Error("This account cannot use the rider app.");
      await tokenStore.setToken?.(result.accessToken); setUser(result.user);
    },
    logout: async () => { await tokenStore.clearToken?.(); setUser(null); }
  }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used inside AuthProvider"); return value; }
