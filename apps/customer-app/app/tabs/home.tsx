import { Feather } from "@expo/vector-icons";
import { brand } from "@karigo/config";
import type { ServiceCategory, VendorSummary } from "@karigo/shared-types";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { vendorsApi } from "../../src/api/vendors.api";
import { Card, Empty, Loading, Message, Protected, Screen, ui } from "../../src/components/ui";
import { KariGoAppTopBar } from "../../src/components/kari-go-app-top-bar";
import { useAuth } from "../../src/contexts/auth-context";
import { friendlyError } from "../../src/lib/errors";

const categories: {
  label: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  href: string;
  serviceCategory?: ServiceCategory;
  tone: string;
}[] = [
  { label: "Food Delivery", description: "Meals from trusted kitchens", icon: "coffee", href: "/catalogue/food", serviceCategory: "FOOD", tone: "#FFF1F2" },
  { label: "Groceries", description: "Daily home essentials", icon: "shopping-bag", href: "/catalogue/groceries", serviceCategory: "GROCERY", tone: "#ECFDF3" },
  { label: "Market Items", description: "Household and local market picks", icon: "shopping-cart", href: "/catalogue/market-items", serviceCategory: "MARKET", tone: "#EFF6FF" },
  { label: "Pharmacy", description: "Approved health vendors only", icon: "plus-square", href: "/catalogue/pharmacy", serviceCategory: "PHARMACY", tone: "#F0FDF4" },
  { label: "Parcel Delivery", description: "Send packages across Kano", icon: "package", href: "/parcel", serviceCategory: "PARCEL", tone: "#FFFBEB" },
  { label: "SME Errands", description: "Business and personal tasks", icon: "briefcase", href: "/parcel?mode=errand", serviceCategory: "ERRAND", tone: "#F5F3FF" }
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
  const { user } = useAuth();
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    vendorsApi.list()
      .then(setVendors)
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setLoading(false));
  }, []);

  const featured = useMemo(() => vendors.filter((vendor) => vendor.isOpen).slice(0, 3), [vendors]);

  return <Protected>
    <KariGoAppTopBar rightAction={{ icon: "bell", label: "Open notifications", onPress: () => router.push("/notifications") }} />
    <Screen topPadding={false}>
      <View style={styles.greeting}>
        <Text style={ui.heroTitle}>Welcome, {firstName(user?.fullName)}</Text>
        <Text style={ui.pageIntro}>Here are top picks for you.</Text>
      </View>

      <View style={ui.spaceBetween}>
        <Text style={ui.sectionTitle}>What do you need today?</Text>
      </View>
      <View style={styles.categoryGrid}>
        {categories.map((category) => <Pressable
          key={category.label}
          accessibilityRole="button"
          accessibilityLabel={`Open ${category.label}`}
          onPress={() => router.push(category.href as never)}
          style={({ pressed }) => [styles.categoryCard, pressed && styles.categoryPressed]}
        >
          <View style={[styles.categoryIcon, { backgroundColor: category.tone }]}>
            <Feather name={category.icon} size={25} color={brand.colors.primary} />
          </View>
          <Text style={styles.categoryLabel}>{category.label}</Text>
          <Text style={styles.categoryDescription}>{category.description}</Text>
        </Pressable>)}
      </View>

      <Text style={ui.sectionTitle}>Today's featured for you</Text>
      <Message error>{error}</Message>
      {loading ? <Loading label="Finding trusted vendors..." /> : featured.length === 0
        ? <Empty message="No featured vendor is available right now. Please check Browse for more options." />
        : featured.map((vendor) => <VendorSpotlight key={vendor.id} vendor={vendor} />)}

      <View style={styles.adPlacement}>
        <Text style={styles.adLabel}>Ad</Text>
        <Text style={styles.adTitle}>Campaign placement available</Text>
        <Text style={ui.muted}>Approved KariGO campaigns may appear here. Ads are labelled and never affect checkout pricing or delivery quotes.</Text>
      </View>
    </Screen>
  </Protected>;
}

const styles = StyleSheet.create({
  greeting: { gap: 4 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  categoryCard: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 20, borderWidth: 1, flexBasis: "47%", flexGrow: 1, gap: 8, minHeight: 146, padding: 14 },
  categoryPressed: { borderColor: brand.colors.primary, transform: [{ scale: 0.99 }] },
  categoryIcon: { alignItems: "center", borderRadius: 18, height: 52, justifyContent: "center", width: 52 },
  categoryLabel: { color: brand.colors.charcoal, fontSize: 15, fontWeight: "900" },
  categoryDescription: { color: brand.colors.muted, fontSize: 12, lineHeight: 17 },
  vendorHeader: { alignItems: "center", flexDirection: "row", gap: 12 },
  vendorLogo: { alignItems: "center", backgroundColor: "#FEF2F2", borderRadius: 18, height: 54, justifyContent: "center", width: 54 },
  vendorLogoText: { color: brand.colors.primaryDark, fontSize: 22, fontWeight: "900" },
  link: { color: brand.colors.primary, fontWeight: "900" },
  adPlacement: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 20, borderStyle: "dashed", borderWidth: 1, gap: 8, padding: 16 },
  adLabel: { alignSelf: "flex-start", backgroundColor: "#F3F4F6", borderRadius: 999, color: brand.colors.muted, fontSize: 11, fontWeight: "900", paddingHorizontal: 8, paddingVertical: 4 },
  adTitle: { color: brand.colors.charcoal, fontSize: 17, fontWeight: "900" }
});
