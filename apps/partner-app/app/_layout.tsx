import { brand } from "@karigo/config";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../src/contexts/auth-context";
import { PartnerBottomNav } from "../src/components/partner-navigation";

const headerless = { headerShown: false };
const backOnly = { headerTitle: "", title: "", headerBackTitle: "Back" };

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerBackTitle: "Back",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: brand.colors.white },
          headerTintColor: brand.colors.charcoal
        }}
      >
        <Stack.Screen name="index" options={headerless} />
        <Stack.Screen name="auth/login" options={headerless} />
        <Stack.Screen name="orders/index" options={headerless} />
        <Stack.Screen name="orders/[orderId]" options={backOnly} />
        <Stack.Screen name="products/index" options={headerless} />
        <Stack.Screen name="services/index" options={headerless} />
        <Stack.Screen name="documents/index" options={headerless} />
        <Stack.Screen name="profile/index" options={headerless} />
        <Stack.Screen name="+not-found" options={backOnly} />
      </Stack>
      <PartnerBottomNav />
      <StatusBar style="dark" />
    </AuthProvider>
  );
}
