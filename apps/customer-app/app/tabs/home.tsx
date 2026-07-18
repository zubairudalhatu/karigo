import { Feather } from "@expo/vector-icons";
import { brand } from "@karigo/config";
import type { ServiceCategory, VendorSummary } from "@karigo/shared-types";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { adsApi, CustomerHomeAd } from "../../src/api/ads.api";
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
  { label: "KariGO Rides", icon: "navigation", href: process.env.EXPO_PUBLIC_TAXI_SERVICE_ENABLED === "true" && process.env.EXPO_PUBLIC_TAXI_STAGING_DISPATCH_ENABLED === "true" ? "/taxi/request" : "/readiness/taxi", tone: "#F3F4F6", state: "readiness", statusLabel: process.env.EXPO_PUBLIC_TAXI_SERVICE_ENABLED === "true" && process.env.EXPO_PUBLIC_TAXI_STAGING_DISPATCH_ENABLED === "true" ? "Operations review" : "Join waitlist", requiresAuth: process.env.EXPO_PUBLIC_TAXI_SERVICE_ENABLED === "true" && process.env.EXPO_PUBLIC_TAXI_STAGING_DISPATCH_ENABLED === "true" },
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
  { label: "Airtime", icon: "phone", href: "/utilities/airtime", tone: "#FEF2F2", state: "readiness", statusLabel: "Preparing", requiresAuth: true },
  { label: "Data", icon: "wifi", href: "/utilities/data", tone: "#FEF2F2", state: "readiness", statusLabel: "Preparing", requiresAuth: true },
  { label: "Electricity", icon: "zap", href: "/utilities/electricity", tone: "#FEF2F2", state: "readiness", statusLabel: "Preparing", requiresAuth: true },
  { label: "Cable TV", icon: "tv", href: "/utilities/cable-tv", tone: "#FEF2F2", state: "readiness", statusLabel: "Preparing", requiresAuth: true }
];

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
        <Text style={ui.muted}>{vendor.businessCategory} · {vendor.city ?? "Launch city"}</Text>
      </View>
    </View>
    <Text style={ui.pageIntro} numberOfLines={2}>{vendor.description ?? "Trusted KariGO vendor serving selected launch areas."}</Text>
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
  const [ads, setAds] = useState<CustomerHomeAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [guestPrompt, setGuestPrompt] = useState("");

  useEffect(() => {
    vendorsApi.list()
      .then(setVendors)
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    adsApi.customerHome()
      .then((response) => setAds(response.items))
      .catch(() => setAds([]));
  }, []);

  const featured = useMemo(() => vendors.filter((vendor) => vendor.isOpen).slice(0, 3), [vendors]);
  const homeAd = ads[0];
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

  function openAd(ad: CustomerHomeAd) {
    if (!ad.ctaUrl) return;
    if (ad.ctaUrl.startsWith("/")) {
      router.push(ad.ctaUrl as never);
      return;
    }
    void Linking.openURL(ad.ctaUrl);
  }

  if (authLoading) return <Loading label="Opening KariGO..." />;

  return <>
    <KariGoAppTopBar rightAction={user
      ? { icon: "bell", label: "Open notifications", onPress: () => router.push("/notifications") }
      : { icon: "log-in", label: "Sign in", onPress: () => router.push("/auth/login") }} />
    <Screen topPadding={false}>
      {!user ? <Card>
        <View style={styles.greeting}>
          <Text style={styles.launchPill}>Kano + Abuja launch cities</Text>
          <Text style={ui.heroTitle}>Hi, welcome to KariGO</Text>
        </View>
        <Text style={ui.pageIntro}>Explore vendors, services and delivery options across Kano and Abuja. Login or sign up when you are ready to order, track deliveries or use account features.</Text>
        <View style={styles.authActions}>
          <Button title="Login" onPress={() => router.push("/auth/login")} />
          <Button title="Sign up" tone="muted" onPress={() => router.push("/auth/signup")} />
        </View>
        {guestPrompt ? <Message>{guestPrompt}</Message> : null}
      </Card> : <Card>
        <View style={styles.greeting}>
          <Text style={styles.launchPill}>Kano + Abuja launch cities</Text>
          <Text style={ui.heroTitle}>Welcome, {firstName(user?.fullName)}</Text>
          <Text style={ui.pageIntro}>Here are trusted picks in your launch city.</Text>
        </View>
      </Card>}

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

      <Pressable
        accessibilityRole={homeAd?.ctaUrl ? "button" : "text"}
        accessibilityLabel={homeAd ? `${homeAd.label}: ${homeAd.title}` : "Ad campaign placement available"}
        onPress={() => homeAd ? openAd(homeAd) : undefined}
        style={styles.adPlacement}
      >
        <Text style={styles.adLabel}>Ad</Text>
        <Text style={styles.adTitle}>{homeAd?.title ?? "Campaign placement available"}</Text>
        <Text style={ui.muted}>{homeAd?.body ?? "Approved KariGO campaigns may appear here. Ads are labelled and never affect checkout pricing or delivery quotes."}</Text>
        <Text style={styles.adSponsor}>{homeAd ? `Sponsored by ${homeAd.sponsorName}` : "Vendor and partner ads require Admin approval."}</Text>
        {homeAd?.ctaLabel ? <Text style={styles.link}>{homeAd.ctaLabel}</Text> : null}
      </Pressable>
    </Screen>
  </>;
}

const styles = StyleSheet.create({
  greeting: { gap: 6 },
  launchPill: { alignSelf: "flex-start", backgroundColor: "#FEF2F2", borderRadius: 999, color: brand.colors.primaryDark, fontSize: 11, fontWeight: "900", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 5, textTransform: "uppercase" },
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
  adPlacement: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 20, borderStyle: "dashed", borderWidth: 1, gap: 8, padding: 16 },
  adLabel: { alignSelf: "flex-start", backgroundColor: "#F3F4F6", borderRadius: 999, color: brand.colors.muted, fontSize: 11, fontWeight: "900", paddingHorizontal: 8, paddingVertical: 4 },
  adTitle: { color: brand.colors.charcoal, fontSize: 17, fontWeight: "900" },
  adSponsor: { color: brand.colors.muted, fontSize: 12, fontWeight: "800" }
});
