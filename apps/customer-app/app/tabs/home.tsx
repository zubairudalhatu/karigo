import { Feather } from "@expo/vector-icons";
import { brand } from "@karigo/config";
import type { ServiceCategory, VendorSummary } from "@karigo/shared-types";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { vendorsApi } from "../../src/api/vendors.api";
import { Button, Card, Empty, Loading, Message, Screen, ui } from "../../src/components/ui";
import { KariGoAppTopBar } from "../../src/components/kari-go-app-top-bar";
import { useAuth } from "../../src/contexts/auth-context";
import { friendlyError } from "../../src/lib/errors";

const categories: {
  label: string;
  subtitle?: string;
  icon: keyof typeof Feather.glyphMap;
  href: string;
  serviceCategory?: ServiceCategory;
  tone: string;
  state: "active" | "readiness";
  statusLabel?: string;
  requiresAuth?: boolean;
}[] = [
  { label: "Food Delivery", icon: "coffee", href: "/catalogue/food", serviceCategory: "FOOD", tone: "#FFF1F2", state: "active" },
  { label: "Groceries", icon: "shopping-bag", href: "/catalogue/groceries", serviceCategory: "GROCERY", tone: "#ECFDF3", state: "active" },
  { label: "Taxi", icon: "navigation", href: process.env.EXPO_PUBLIC_TAXI_SERVICE_ENABLED === "true" && process.env.EXPO_PUBLIC_TAXI_STAGING_DISPATCH_ENABLED === "true" ? "/taxi/request" : "/readiness/taxi", tone: "#F3F4F6", state: "readiness", statusLabel: process.env.EXPO_PUBLIC_TAXI_SERVICE_ENABLED === "true" && process.env.EXPO_PUBLIC_TAXI_STAGING_DISPATCH_ENABLED === "true" ? "Test mode" : "Coming soon", requiresAuth: process.env.EXPO_PUBLIC_TAXI_SERVICE_ENABLED === "true" && process.env.EXPO_PUBLIC_TAXI_STAGING_DISPATCH_ENABLED === "true" },
  { label: "Market Items", icon: "shopping-cart", href: "/catalogue/market-items", serviceCategory: "MARKET", tone: "#EFF6FF", state: "active" },
  {
    label: "Pharmacy",
    icon: "plus-square",
    href: process.env.EXPO_PUBLIC_PHARMACY_MARKETPLACE_ENABLED === "true" ? "/catalogue/pharmacy" : "/readiness/pharmacy",
    serviceCategory: "PHARMACY",
    tone: "#F0FDF4",
    state: process.env.EXPO_PUBLIC_PHARMACY_MARKETPLACE_ENABLED === "true" ? "active" : "readiness",
    statusLabel: process.env.EXPO_PUBLIC_PHARMACY_MARKETPLACE_ENABLED === "true" ? undefined : "Preparing launch"
  },
  { label: "Parcel Delivery", icon: "package", href: "/parcel", serviceCategory: "PARCEL", tone: "#FFFBEB", state: "active", requiresAuth: true },
  { label: "SME Services", subtitle: "Book trusted service providers", icon: "tool", href: "/sme-services", serviceCategory: "CORPORATE", tone: "#F5F3FF", state: "active", requiresAuth: true },
  { label: "Airtime", icon: "phone", href: "/utilities/airtime", tone: "#FEF2F2", state: "readiness", statusLabel: "Test mode", requiresAuth: true },
  { label: "Data", icon: "wifi", href: "/utilities/data", tone: "#FEF2F2", state: "readiness", statusLabel: "Test mode", requiresAuth: true },
  { label: "Electricity", icon: "zap", href: "/utilities/electricity", tone: "#FEF2F2", state: "readiness", statusLabel: "Test mode", requiresAuth: true },
  { label: "Cable TV", icon: "tv", href: "/utilities/cable-tv", tone: "#FEF2F2", state: "readiness", statusLabel: "Test mode", requiresAuth: true }
];

const utilityServices = categories.filter((category) => ["Airtime", "Data", "Electricity", "Cable TV"].includes(category.label));

function firstName(fullName?: string | null) {
  const name = fullName?.trim();
  if (!name) return "to KariGO";
  return name.split(/\s+/)[0] || "to KariGO";
}

function VendorSpotlight({ vendor }: { vendor: VendorSummary }) {
  return <Card>
    <View style={styles.vendorHeader}>
      <View style={styles.vendorLogo}><Text style={styles.vendorLogoText}>{vendor.businessName.slice(0, 1).toUpperCase()}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={ui.cardTitle}>{vendor.businessName}</Text>
        <Text style={ui.muted}>{vendor.businessCategory} · {vendor.city ?? "Kano"}</Text>
      </View>
    </View>
    <Text style={ui.pageIntro} numberOfLines={2}>{vendor.description ?? "Trusted KariGO vendor serving selected Kano areas."}</Text>
    <View style={ui.priceRow}>
      <Text style={ui.priceLabel}>{vendor.isOpen ? "Available now" : "Currently closed"}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`View ${vendor.businessName} store`} onPress={() => router.push(`/vendors/${vendor.id}`)}>
        <Text style={styles.link}>View Store</Text>
      </Pressable>
    </View>
  </Card>;
}

export default function CustomerHome() {
  const { user, loading: authLoading } = useAuth();
  const { width } = useWindowDimensions();
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [guestPrompt, setGuestPrompt] = useState("");

  useEffect(() => {
    vendorsApi.list()
      .then(setVendors)
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setLoading(false));
  }, []);

  const featured = useMemo(() => vendors.filter((vendor) => vendor.isOpen).slice(0, 3), [vendors]);
  const columns = width >= 380 ? 3 : 2;
  const serviceTileBasis = `${(100 / columns) - 2}%` as const;

  function openCategory(category: typeof categories[number]) {
    if (!user && category.requiresAuth) {
      setGuestPrompt(`${category.label} needs a KariGO account. Login or sign up to continue.`);
      return;
    }
    setGuestPrompt("");
    router.push(category.href as never);
  }

  if (authLoading) return <Loading label="Opening KariGO..." />;

  return <>
    <KariGoAppTopBar rightAction={user
      ? { icon: "bell", label: "Open notifications", onPress: () => router.push("/notifications") }
      : { icon: "log-in", label: "Sign in", onPress: () => router.push("/auth/login") }} />
    <Screen topPadding={false}>
      {!user ? <Card>
        <Text style={ui.heroTitle}>Hi, welcome to KariGO</Text>
        <Text style={ui.pageIntro}>Explore vendors, services and delivery options across Kano. Login or sign up when you are ready to order, track deliveries or use account features.</Text>
        <View style={styles.authActions}>
          <Button title="Login" onPress={() => router.push("/auth/login")} />
          <Button title="Sign up" tone="muted" onPress={() => router.push("/auth/signup")} />
        </View>
        {guestPrompt ? <Message>{guestPrompt}</Message> : null}
      </Card> : <View style={styles.greeting}>
        <Text style={ui.heroTitle}>Welcome, {firstName(user?.fullName)}</Text>
        <Text style={ui.pageIntro}>Here are top picks for you.</Text>
      </View>}

      <View style={ui.spaceBetween}>
        <Text style={ui.sectionTitle}>What do you need today?</Text>
      </View>
      <View style={styles.categoryGrid}>
        {categories.map((category) => <Pressable
          key={category.label}
          accessibilityRole="button"
          accessibilityLabel={`Open ${category.label}`}
          onPress={() => openCategory(category)}
          style={({ pressed }) => [styles.categoryCard, { flexBasis: serviceTileBasis }, pressed && styles.categoryPressed]}
        >
          <View style={[styles.categoryIcon, { backgroundColor: category.tone }]}>
            <Feather name={category.icon} size={21} color={category.state === "readiness" ? brand.colors.charcoal : brand.colors.primary} />
          </View>
          <Text style={styles.categoryLabel}>{category.label}</Text>
          {category.subtitle ? <Text style={styles.categorySubtitle}>{category.subtitle}</Text> : null}
          {category.statusLabel ? <Text style={styles.serviceStatus}>{category.statusLabel}</Text> : null}
        </Pressable>)}
      </View>

      <Text style={ui.sectionTitle}>Today's featured for you</Text>
      <Message error>{error}</Message>
      {loading ? <Loading label="Finding trusted vendors..." /> : featured.length === 0
        ? <Empty message="No featured vendor is available right now. Please check Browse for more options." />
        : featured.map((vendor) => <VendorSpotlight key={vendor.id} vendor={vendor} />)}

      <View style={styles.utilitiesSection}>
        <View>
          <Text style={ui.sectionTitle}>Bills & Utilities</Text>
          <Text style={ui.pageIntro}>Run safe test-mode utility transactions while live providers are still disabled.</Text>
        </View>
        <View style={styles.utilityGrid}>
          {utilityServices.map((service) => <Pressable
            key={service.label}
            accessibilityRole="button"
            accessibilityLabel={`Open ${service.label} test mode`}
            onPress={() => openCategory(service)}
            style={({ pressed }) => [styles.utilityTile, pressed && styles.categoryPressed]}
          >
            <Feather name={service.icon} size={19} color={brand.colors.primary} />
            <Text style={styles.utilityLabel}>{service.label}</Text>
            <Text style={styles.serviceStatus}>Test mode</Text>
          </Pressable>)}
        </View>
      </View>

      <View style={styles.adPlacement}>
        <Text style={styles.adLabel}>Ad</Text>
        <Text style={styles.adTitle}>Campaign placement available</Text>
        <Text style={ui.muted}>Approved KariGO campaigns may appear here. Ads are labelled and never affect checkout pricing or delivery quotes.</Text>
      </View>
    </Screen>
  </>;
}

const styles = StyleSheet.create({
  greeting: { gap: 4 },
  authActions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  categoryCard: { alignItems: "center", backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 18, borderWidth: 1, flexGrow: 1, gap: 6, minHeight: 104, padding: 10 },
  categoryPressed: { borderColor: brand.colors.primary, transform: [{ scale: 0.99 }] },
  categoryIcon: { alignItems: "center", borderRadius: 16, height: 42, justifyContent: "center", width: 42 },
  categoryLabel: { color: brand.colors.charcoal, fontSize: 12.5, fontWeight: "900", lineHeight: 16, textAlign: "center" },
  categorySubtitle: { color: brand.colors.muted, fontSize: 10.5, fontWeight: "700", lineHeight: 13, textAlign: "center" },
  serviceStatus: { color: brand.colors.muted, fontSize: 10.5, fontWeight: "800", lineHeight: 14, textAlign: "center" },
  vendorHeader: { alignItems: "center", flexDirection: "row", gap: 12 },
  vendorLogo: { alignItems: "center", backgroundColor: "#FEF2F2", borderRadius: 18, height: 54, justifyContent: "center", width: 54 },
  vendorLogoText: { color: brand.colors.primaryDark, fontSize: 22, fontWeight: "900" },
  link: { color: brand.colors.primary, fontWeight: "900" },
  utilitiesSection: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 20, borderWidth: 1, gap: 14, padding: 16 },
  utilityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  utilityTile: { alignItems: "center", backgroundColor: "#F9FAFB", borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, flexBasis: "47%", flexGrow: 1, gap: 5, minHeight: 86, padding: 10 },
  utilityLabel: { color: brand.colors.charcoal, fontSize: 13, fontWeight: "900", textAlign: "center" },
  adPlacement: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 20, borderStyle: "dashed", borderWidth: 1, gap: 8, padding: 16 },
  adLabel: { alignSelf: "flex-start", backgroundColor: "#F3F4F6", borderRadius: 999, color: brand.colors.muted, fontSize: 11, fontWeight: "900", paddingHorizontal: 8, paddingVertical: 4 },
  adTitle: { color: brand.colors.charcoal, fontSize: 17, fontWeight: "900" }
});
