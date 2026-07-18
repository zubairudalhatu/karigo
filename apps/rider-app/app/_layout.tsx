import { Stack } from "expo-router";
import { brand } from "@karigo/config";
import { AuthProvider } from "../src/contexts/auth-context";
import { CaptainBottomNav } from "../src/components/rider-navigation";

const hiddenHeader = {
  headerShown: false
};

const backOnlyHeader = {
  headerBackTitle: "Back",
  headerShadowVisible: false,
  headerStyle: { backgroundColor: brand.colors.white },
  headerTitle: "",
  title: ""
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <>
        <Stack
          screenOptions={{
            headerBackTitle: "Back",
            headerShadowVisible: false,
            headerStyle: { backgroundColor: brand.colors.white },
            headerTintColor: brand.colors.charcoal,
            headerTitle: ""
          }}
        >
          <Stack.Screen name="index" options={hiddenHeader} />
          <Stack.Screen name="auth/login" options={hiddenHeader} />
          <Stack.Screen name="auth/apply" options={hiddenHeader} />
          <Stack.Screen name="tabs/dashboard" options={hiddenHeader} />
          <Stack.Screen name="jobs/index" options={backOnlyHeader} />
          <Stack.Screen name="jobs/[id]" options={backOnlyHeader} />
          <Stack.Screen name="earnings" options={backOnlyHeader} />
          <Stack.Screen name="notifications" options={backOnlyHeader} />
          <Stack.Screen name="profile" options={backOnlyHeader} />
          <Stack.Screen name="legal/privacy" options={backOnlyHeader} />
          <Stack.Screen name="legal/terms" options={backOnlyHeader} />
          <Stack.Screen name="taxi-readiness" options={backOnlyHeader} />
        </Stack>
        <CaptainBottomNav />
      </>
    </AuthProvider>
  );
}
