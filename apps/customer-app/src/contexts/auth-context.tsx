import type { AuthenticatedUser, LoginRequest, RegisterCustomerRequest, VerifyOtpRequest } from "@karigo/shared-types";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { authApi } from "../api/auth.api";
import { onUnauthorized, tokenStore } from "../api/client";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  loading: boolean;
  register(body: RegisterCustomerRequest): ReturnType<typeof authApi.register>;
  verifyOtp(body: VerifyOtpRequest): Promise<void>;
  login(body: LoginRequest): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onUnauthorized(() => setUser(null));
    authApi.me()
      .then((current) => current.role === "CUSTOMER" ? setUser(current) : tokenStore.clearToken?.())
      .catch(() => tokenStore.clearToken?.())
      .finally(() => setLoading(false));
    return unsubscribe;
  }, []);

  async function saveSession(accessToken: string, nextUser: AuthenticatedUser) {
    if (nextUser.role !== "CUSTOMER") throw new Error("This account cannot use the customer app.");
    await tokenStore.setToken?.(accessToken);
    setUser(nextUser);
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      register: authApi.register,
      verifyOtp: async (body) => {
        const result = await authApi.verifyOtp(body);
        await saveSession(result.accessToken, result.user);
      },
      login: async (body) => {
        const result = await authApi.login(body);
        await saveSession(result.accessToken, result.user);
      },
      logout: async () => {
        await tokenStore.clearToken?.();
        setUser(null);
      }
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
