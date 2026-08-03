"use client";

import type { AuthenticatedUser, LoginRequest } from "@karigo/shared-types";
import { KariGoApiError } from "@karigo/shared-types";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { authApi } from "../api/auth.api";
import { onUnauthorized } from "../api/client";
import { vendorApi } from "../api/vendor.api";
import { normalizeNigerianPhoneNumber } from "../lib/phone";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  loading: boolean;
  login(body: LoginRequest): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isAuthStatus(error: unknown): boolean {
  return error instanceof KariGoApiError && error.status === 401;
}

async function assertPartnerWorkspaceAccess() {
  const capabilities = await vendorApi.capabilities();
  if (!capabilities.canAccessWorkspace) {
    throw new Error(capabilities.message || "This account is not active for Partner Workspace access.");
  }
  return capabilities;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const off = onUnauthorized(() => setUser(null));
    let active = true;

    async function bootstrap() {
      try {
        const currentUser = await authApi.me();
        if (!active) return;
        await assertPartnerWorkspaceAccess();
        if (active) setUser(currentUser);
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
          const result = await authApi.login({
            ...body,
            phoneNumber: normalizeNigerianPhoneNumber(body.phoneNumber)
          });

          if ("verificationRequired" in result) {
            throw new Error(result.message || "Verify your phone number to finish account setup.");
          }

          if (!result.user) {
            throw new Error("Your session could not be created. Please try again.");
          }

          await assertPartnerWorkspaceAccess();

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
