import { Feather } from "@expo/vector-icons";
import { brand } from "@karigo/config";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { utilitiesApi, UtilityAvailability } from "../../src/api/utilities.api";
import { Card, Protected, Screen, ui } from "../../src/components/ui";
import { fallbackCustomerPaymentConfig } from "../../src/lib/payment-status";

const services = [
  { type: "AIRTIME", label: "Airtime", slug: "airtime", icon: "phone", description: "Select a mobile network and review an airtime request." },
  { type: "DATA", label: "Data", slug: "data", icon: "wifi", description: "Select a mobile network and data plan before review." },
  { type: "ELECTRICITY", label: "Electricity", slug: "electricity", icon: "zap", description: "Select a distribution company and meter type before review." },
  { type: "CABLE_TV", label: "Cable TV", slug: "cable-tv", icon: "tv", description: "Select a TV provider and bouquet before review." }
] as const;

const availabilityLabel: Record<UtilityAvailability, string> = {
  AVAILABLE: "Available",
  PREPARING_LAUNCH: "Preparing launch",
  TEMPORARILY_UNAVAILABLE: "Temporarily unavailable"
};
export default function UtilitiesHome() {
  const [utilitiesStatusNote, setUtilitiesStatusNote] = useState(fallbackCustomerPaymentConfig.utilitiesStatusNote);
  const [availability, setAvailability] = useState<Record<string, UtilityAvailability>>({});

  useEffect(() => {
    utilitiesApi.readiness()
      .then((readiness) => {
        setAvailability(Object.fromEntries(readiness.services.map((item) => [item.serviceType, item.availability])));
        setUtilitiesStatusNote("Utilities are opening in controlled stages. Each service shows its current launch state below.");
      })
      .catch(() => {
        setUtilitiesStatusNote(fallbackCustomerPaymentConfig.utilitiesStatusNote);
        setAvailability({});
      });
  }, []);

  return <Protected><Screen title="Bills & Utilities">
    <Text style={ui.pageIntro}>{utilitiesStatusNote}</Text>
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
        <Text style={styles.badge}>{availabilityLabel[availability[service.type] ?? "TEMPORARILY_UNAVAILABLE"]}</Text>
      </Pressable>)}
    </View>
    <Card>
      <Text style={ui.cardTitle}>Utility history</Text>
      <Text style={ui.muted}>Review previous Bills & Utilities records separately from delivery orders.</Text>
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
