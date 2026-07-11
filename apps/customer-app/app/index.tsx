import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { brand } from "@karigo/config";
import { Loading } from "../src/components/ui";
import { useAuth } from "../src/contexts/auth-context";

export default function CustomerWelcome() {
  const { user, loading } = useAuth();
  if (loading) return <Loading label="Opening KariGO..." />;
  if (user) return <Redirect href="/tabs/home" />;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Image source={require("../assets/karigo-logo.png")} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Everything you need, delivered.</Text>
      <Text style={styles.copy}>Order food, shop groceries, send parcels and request SME services across Kano.</Text>
      <Link href="/auth/login" asChild>
        <Pressable style={styles.button}><Text style={styles.buttonText}>Get started</Text></Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, backgroundColor: brand.colors.white },
  logo: { width: 240, height: 120, marginBottom: 28 },
  title: { color: brand.colors.charcoal, fontSize: 30, fontWeight: "800", textAlign: "center" },
  copy: { color: brand.colors.muted, fontSize: 16, lineHeight: 24, marginVertical: 18, textAlign: "center" },
  button: { backgroundColor: brand.colors.primary, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 15 },
  buttonText: { color: brand.colors.white, fontSize: 16, fontWeight: "700" }
});
