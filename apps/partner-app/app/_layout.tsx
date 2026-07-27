import { brand } from "@karigo/config";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../src/contexts/auth-context";
import { PartnerBottomNav } from "../src/components/partner-navigation";
import { PartnerRegistrationProvider } from "../src/contexts/partner-registration-context";

const headerless = { headerShown: false };
const backOnly = { headerTitle: "", title: "", headerBackTitle: "Back" };

export default function RootLayout() {
  return (
    <AuthProvider>
      <PartnerRegistrationProvider>
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
          <Stack.Screen name="auth/forgot-password" options={backOnly} />
          <Stack.Screen name="auth/reset-password" options={backOnly} />
          <Stack.Screen name="register/index" options={headerless} />
          <Stack.Screen name="register/verify" options={backOnly} />
          <Stack.Screen name="register/password" options={backOnly} />
          <Stack.Screen name="register/account-type" options={backOnly} />
          <Stack.Screen name="register/business" options={backOnly} />
          <Stack.Screen name="register/service-details" options={backOnly} />
          <Stack.Screen name="register/documents" options={backOnly} />
          <Stack.Screen name="register/review" options={backOnly} />
          <Stack.Screen name="register/success" options={headerless} />
          <Stack.Screen name="orders/index" options={headerless} />
          <Stack.Screen name="orders/[orderId]" options={backOnly} />
          <Stack.Screen name="products/index" options={headerless} />
          <Stack.Screen name="products/new" options={backOnly} />
          <Stack.Screen name="products/[productId]" options={backOnly} />
          <Stack.Screen name="services/index" options={headerless} />
          <Stack.Screen name="earnings/index" options={headerless} />
          <Stack.Screen name="payout/index" options={backOnly} />
          <Stack.Screen name="documents/index" options={headerless} />
          <Stack.Screen name="profile/index" options={headerless} />
          <Stack.Screen name="profile/edit" options={backOnly} />
          <Stack.Screen name="+not-found" options={backOnly} />
        </Stack>
        <PartnerBottomNav />
        <StatusBar style="dark" />
      </PartnerRegistrationProvider>
    </AuthProvider>
  );
}
