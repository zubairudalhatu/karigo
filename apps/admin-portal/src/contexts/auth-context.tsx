"use client";

import type { LoginRequest } from "@karigo/shared-types";
import { KariGoApiError } from "@karigo/shared-types";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { authApi, type AdminPortalUser } from "../api/auth.api";
import { onUnauthorized } from "../api/client";
import { normalizeNigerianPhoneNumber } from "../lib/phone";

interface AuthContextValue {
  user: AdminPortalUser | null;
  loading: boolean;
  login(body: LoginRequest | {email:string;password:string}): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isAuthStatus(error: unknown): boolean {
  return error instanceof KariGoApiError && error.status === 401;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminPortalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const off = onUnauthorized(() => setUser(null));
    let active = true;

    async function bootstrap() {
      try {
        const currentUser = await authApi.me();
        if (!active) return;

        if (currentUser.role === "ADMIN") {
          setUser(currentUser);
        } else {
          setUser(null);
        }
      } catch (error) {
        if (isAuthStatus(error)) {
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
          const result = "email" in body ? await authApi.emailLogin(body) : await authApi.login({
            ...body,
            phoneNumber: normalizeNigerianPhoneNumber(body.phoneNumber)
          });

          if ("verificationRequired" in result) {
            throw new Error(result.message || "Verify your phone number to finish account setup.");
          }

          if (!result.user) {
            throw new Error("Your session could not be created. Please try again.");
          }

          if (result.user.role !== "ADMIN") {
            throw new Error("This account is not authorised for the Admin Portal.");
          }

          setUser(result.user);
        },
        logout: async () => {
          await authApi.logout().catch(() => undefined);
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
