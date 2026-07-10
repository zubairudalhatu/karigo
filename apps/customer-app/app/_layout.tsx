import { Stack } from "expo-router";
import { brand } from "@karigo/config";
import { AuthProvider } from "../src/contexts/auth-context";
import { CartProvider } from "../src/contexts/cart-context";
import { CartNotice, CustomerBottomNav } from "../src/components/customer-navigation";

const headerless = { headerShown: false };
const backOnly = { headerTitle: "", title: "", headerBackTitle: "Back" };

export default function RootLayout() {
  return <AuthProvider><CartProvider><><Stack screenOptions={{
    headerBackTitle: "Back",
    headerShadowVisible: false,
    headerStyle: { backgroundColor: brand.colors.white },
    headerTintColor: brand.colors.charcoal
  }}>
    <Stack.Screen name="index" options={headerless} />
    <Stack.Screen name="auth/login" options={headerless} />
    <Stack.Screen name="auth/signup" options={backOnly} />
    <Stack.Screen name="auth/otp" options={backOnly} />
    <Stack.Screen name="tabs/home" options={headerless} />
    <Stack.Screen name="vendors/[id]" options={backOnly} />
    <Stack.Screen name="catalogue/[category]" options={backOnly} />
    <Stack.Screen name="products/[id]" options={backOnly} />
    <Stack.Screen name="readiness/[service]" options={backOnly} />
    <Stack.Screen name="taxi/waitlist" options={backOnly} />
    <Stack.Screen name="utilities/index" options={headerless} />
    <Stack.Screen name="utilities/[service]" options={backOnly} />
    <Stack.Screen name="utilities/history" options={backOnly} />
    <Stack.Screen name="utilities/transactions/[id]" options={backOnly} />
    <Stack.Screen name="cart" options={backOnly} />
    <Stack.Screen name="checkout" options={backOnly} />
    <Stack.Screen name="orders/index" options={headerless} />
    <Stack.Screen name="orders/[id]" options={backOnly} />
    <Stack.Screen name="support/index" options={headerless} />
    <Stack.Screen name="support/[id]" options={backOnly} />
    <Stack.Screen name="addresses" options={headerless} />
    <Stack.Screen name="addresses/[id]" options={backOnly} />
    <Stack.Screen name="profile" options={headerless} />
    <Stack.Screen name="vendor/apply" options={backOnly} />
    <Stack.Screen name="vendor/application-status" options={backOnly} />
    <Stack.Screen name="parcel" options={backOnly} />
    <Stack.Screen name="notifications" options={headerless} />
  </Stack><CustomerBottomNav /><CartNotice /></></CartProvider></AuthProvider>;
}
