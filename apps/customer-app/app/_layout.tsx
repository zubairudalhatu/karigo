import { Stack } from "expo-router";
import { brand } from "@karigo/config";
import { AuthProvider } from "../src/contexts/auth-context";
import { CartProvider } from "../src/contexts/cart-context";

export default function RootLayout() {
  return <AuthProvider><CartProvider><Stack screenOptions={{ headerTintColor: brand.colors.primary }} /></CartProvider></AuthProvider>;
}
