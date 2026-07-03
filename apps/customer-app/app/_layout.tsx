import { Stack } from "expo-router";
import { brand } from "@karigo/config";
import { AuthProvider } from "../src/contexts/auth-context";
import { CartProvider } from "../src/contexts/cart-context";

export default function RootLayout() {
  return <AuthProvider><CartProvider><Stack screenOptions={{ headerTintColor: brand.colors.primary, headerBackTitle: "Back" }}>
    <Stack.Screen name="index" options={{ headerShown: false }} />
    <Stack.Screen name="auth/login" options={{ title: "Login" }} />
    <Stack.Screen name="auth/signup" options={{ title: "Create account" }} />
    <Stack.Screen name="auth/otp" options={{ title: "Verify OTP" }} />
    <Stack.Screen name="tabs/home" options={{ title: "Home" }} />
    <Stack.Screen name="vendors/[id]" options={{ title: "Vendor" }} />
    <Stack.Screen name="products/[id]" options={{ title: "Product details" }} />
    <Stack.Screen name="cart" options={{ title: "Cart" }} />
    <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
    <Stack.Screen name="orders/index" options={{ title: "Orders" }} />
    <Stack.Screen name="orders/[id]" options={{ title: "Order details" }} />
    <Stack.Screen name="support/index" options={{ title: "Support centre" }} />
    <Stack.Screen name="support/[id]" options={{ title: "Support ticket" }} />
    <Stack.Screen name="addresses" options={{ title: "Addresses" }} />
    <Stack.Screen name="addresses/[id]" options={{ title: "Address details" }} />
    <Stack.Screen name="profile" options={{ title: "Profile" }} />
    <Stack.Screen name="parcel" options={{ title: "Send parcel" }} />
    <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
  </Stack></CartProvider></AuthProvider>;
}
