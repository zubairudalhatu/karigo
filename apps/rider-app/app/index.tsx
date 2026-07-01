import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { brand } from "@karigo/config";

export default function RiderWelcome() {
  return (
    <View style={styles.container}>
      <Image source={require("../assets/karigo-logo.png")} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Deliver with KariGO</Text>
      <Text style={styles.copy}>Manage verified delivery jobs, milestone updates and earnings in one place.</Text>
      <Link href="/auth/login" asChild>
        <Pressable style={styles.button}><Text style={styles.buttonText}>Rider login</Text></Pressable>
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

