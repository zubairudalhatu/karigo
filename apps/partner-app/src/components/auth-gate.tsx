import { Redirect } from "expo-router";
import { ReactNode } from "react";
import { LoadingState } from "./ui";
import { useAuth } from "../contexts/auth-context";

export function AuthGate({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();

  if (loading) return <LoadingState />;
  if (!user) return <Redirect href="/auth/login" />;

  return <>{children}</>;
}
