import { Redirect, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { brand } from "@karigo/config";
import { Loading } from "../src/components/ui";
import { useAuth } from "../src/contexts/auth-context";

export default function CustomerWelcome() {
  const { user, loading } = useAuth();
  if (loading) return <Loading label="Opening KariGO..." />;
  if (user) return <Redirect href="/tabs/home" />;

  return <View style={styles.container}>
    <StatusBar style="dark" />
    <Image source={require("../assets/karigo-logo.png")} style={styles.logo} resizeMode="contain" />
    <Text style={styles.title}>Everything you need, delivered.</Text>
    <Text style={styles.copy}>Order food, shop groceries, send parcels and request SME Services across Kano.</Text>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Get started"
      onPress={() => router.replace("/tabs/home")}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <Text style={styles.buttonText}>Get started</Text>
    </Pressable>
    <Text style={styles.helper}>You can browse first. Login or sign up when you are ready to order.</Text>
  </View>;
}

const styles = StyleSheet.create({
  container: { alignItems: "center", backgroundColor: brand.colors.white, flex: 1, justifyContent: "center", padding: 28 },
  logo: { height: 120, marginBottom: 28, width: 240 },
  title: { color: brand.colors.charcoal, fontSize: 30, fontWeight: "900", letterSpacing: -0.4, textAlign: "center" },
  copy: { color: brand.colors.muted, fontSize: 16, lineHeight: 24, marginVertical: 18, textAlign: "center" },
  button: { backgroundColor: brand.colors.primary, borderRadius: 14, minWidth: 180, paddingHorizontal: 32, paddingVertical: 15 },
  buttonPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  buttonText: { color: brand.colors.white, fontSize: 16, fontWeight: "800", textAlign: "center" },
  helper: { color: brand.colors.muted, fontSize: 13, lineHeight: 19, marginTop: 14, maxWidth: 280, textAlign: "center" }
});
