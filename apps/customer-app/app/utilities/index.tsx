import { Feather } from "@expo/vector-icons";
import { brand } from "@karigo/config";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card, Protected, Screen, ui } from "../../src/components/ui";

const services = [
  { label: "Airtime", slug: "airtime", icon: "phone", description: "Run a safe test airtime purchase for a Nigerian phone number." },
  { label: "Data", slug: "data", icon: "wifi", description: "Choose a demo data bundle and run a safe test transaction." },
  { label: "Electricity", slug: "electricity", icon: "zap", description: "Validate a demo meter and receive a fictional test token." },
  { label: "Cable TV", slug: "cable-tv", icon: "tv", description: "Choose a demo package for a safe subscription test." }
] as const;

export default function UtilitiesHome() {
  return <Protected><Screen title="Bills & Utilities">
    <Text style={ui.pageIntro}>Bills & Utilities is currently in test mode. No real airtime, data, electricity token or cable subscription will be delivered.</Text>
    <View style={styles.grid}>
      {services.map((service) => <Pressable
        key={service.slug}
        accessibilityRole="button"
        accessibilityLabel={`Open ${service.label}`}
        onPress={() => router.push(`/utilities/${service.slug}`)}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.icon}><Feather name={service.icon} size={22} color={brand.colors.primary} /></View>
        <Text style={ui.cardTitle}>{service.label}</Text>
        <Text style={ui.muted}>{service.description}</Text>
        <Text style={styles.badge}>Test mode</Text>
      </Pressable>)}
    </View>
    <Card>
      <Text style={ui.cardTitle}>Utility history</Text>
      <Text style={ui.muted}>Review previous Bills & Utilities test transactions separately from delivery orders.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Open utility history" onPress={() => router.push("/utilities/history")}>
        <Text style={styles.link}>View utility history</Text>
      </Pressable>
    </Card>
  </Screen></Protected>;
}

const styles = StyleSheet.create({
  grid: { gap: 12 },
  card: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 20, borderWidth: 1, gap: 8, padding: 16 },
  pressed: { borderColor: brand.colors.primary, transform: [{ scale: 0.99 }] },
  icon: { alignItems: "center", backgroundColor: "#FEF2F2", borderRadius: 16, height: 42, justifyContent: "center", width: 42 },
  badge: { alignSelf: "flex-start", backgroundColor: "#FEF3C7", borderRadius: 999, color: "#92400E", fontSize: 12, fontWeight: "900", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 5 },
  link: { color: brand.colors.primary, fontWeight: "900", paddingTop: 6 }
});
