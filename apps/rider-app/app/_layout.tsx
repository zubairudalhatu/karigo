import { Stack } from "expo-router";
import { brand } from "@karigo/config";
import { AuthProvider } from "../src/contexts/auth-context";

export default function RootLayout() {
  return <AuthProvider><Stack screenOptions={{ headerTintColor: brand.colors.primary }} /></AuthProvider>;
}
