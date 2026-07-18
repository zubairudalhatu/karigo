"use client";

import type { AuthenticatedUser, LoginRequest } from "@karigo/shared-types";
import { KariGoApiError } from "@karigo/shared-types";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { authApi } from "../api/auth.api";
import { onUnauthorized, refreshTokenStore, tokenStore } from "../api/client";
import { normalizeNigerianPhoneNumber } from "../lib/phone";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  loading: boolean;
  login(body: LoginRequest): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isAuthStatus(error: unknown): boolean {
  return error instanceof KariGoApiError && (error.status === 401 || error.status === 403);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const off = onUnauthorized(() => setUser(null));
    let active = true;

    async function bootstrap() {
      const token = await tokenStore.getToken();
      const refreshToken = refreshTokenStore.getToken();
      if (!token && !refreshToken) {
        if (active) setLoading(false);
        return;
      }

      try {
        const currentUser = await authApi.me();
        if (!active) return;

        if (currentUser.role === "VENDOR") {
          setUser(currentUser);
        } else {
          await tokenStore.clearToken?.();
          setUser(null);
        }
      } catch (error) {
        if (isAuthStatus(error)) {
          await tokenStore.clearToken?.();
          if (active) setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void bootstrap();

    return () => {
      active = false;
      off();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login: async (body) => {
          const result = await authApi.login({
            ...body,
            phoneNumber: normalizeNigerianPhoneNumber(body.phoneNumber)
          });

          if (!result.accessToken) {
            throw new Error("Login response did not include an access token.");
          }

          if (result.user.role !== "VENDOR") {
            throw new Error("This account cannot use the vendor dashboard.");
          }

          await tokenStore.setToken?.(result.accessToken);
          if (result.refreshToken) refreshTokenStore.setToken(result.refreshToken);
          setUser(result.user);
        },
        logout: async () => {
          const refreshToken = refreshTokenStore.getToken();
          if (refreshToken) {
            await authApi.logout({ refreshToken }).catch(() => undefined);
          }
          await tokenStore.clearToken?.();
          setUser(null);
        }
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
