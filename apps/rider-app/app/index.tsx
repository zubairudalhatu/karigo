import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Link, Redirect } from "expo-router";
import { brand } from "@karigo/config";
import { Loading } from "../src/components/ui";
import { useAuth } from "../src/contexts/auth-context";

export default function CaptainWelcome() {
  const { user, loading } = useAuth();
  if (loading) return <Loading label="Opening KariGO Captain..." />;
  if (user) return <Redirect href="/tabs/dashboard" />;

  return (
    <View style={styles.container}>
      <Image source={require("../assets/karigo-logo.png")} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>KariGO Captain</Text>
      <Text style={styles.copy}>One app for approved Delivery Captains today, with Ride Captain applications prepared for KariGO Rides operations review.</Text>
      <Link href="/auth/login" asChild>
        <Pressable style={styles.button}><Text style={styles.buttonText}>Captain login</Text></Pressable>
      </Link>
      <Link href="/auth/apply" asChild>
        <Pressable style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Apply to become a Captain</Text></Pressable>
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
  buttonText: { color: brand.colors.white, fontSize: 16, fontWeight: "700" },
  secondaryButton: { borderColor: brand.colors.border, borderRadius: 12, borderWidth: 1, marginTop: 12, paddingHorizontal: 24, paddingVertical: 13 },
  secondaryButtonText: { color: brand.colors.charcoal, fontSize: 15, fontWeight: "800" }
});
