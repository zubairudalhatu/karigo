import { brand } from "@karigo/config";
import { Link, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/auth-context";

const tabs = [
  { label: "Home", href: "/tabs/dashboard", match: ["/tabs/dashboard"] },
  { label: "Deliveries", href: "/jobs", match: ["/jobs"] },
  { label: "Earnings", href: "/earnings", match: ["/earnings"] },
  { label: "Profile", href: "/profile", match: ["/profile", "/notifications"] }
] as const;

export function CaptainBottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const hidden = !user || pathname === "/" || pathname.startsWith("/auth") || pathname.startsWith("/taxi-readiness");
  if (hidden) return null;

  return <View style={[styles.nav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
    {tabs.map((tab) => {
      const active = tab.match.some((prefix) => pathname.startsWith(prefix));
      return <Link key={tab.label} href={tab.href as never} asChild>
        <Pressable accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected: active }} style={[styles.item, active && styles.itemActive]}>
          <View style={[styles.dot, active && styles.dotActive]} />
          <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
        </Pressable>
      </Link>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  nav: { backgroundColor: brand.colors.white, borderTopColor: brand.colors.border, borderTopWidth: 1, bottom: 0, flexDirection: "row", gap: 6, justifyContent: "space-around", left: 0, paddingHorizontal: 10, paddingTop: 10, position: "absolute", right: 0, shadowColor: "#111827", shadowOpacity: 0.08, shadowRadius: 14 },
  item: { alignItems: "center", borderRadius: 16, flex: 1, gap: 5, minHeight: 52, paddingVertical: 7 },
  itemActive: { backgroundColor: "#FEF2F2", borderColor: "#FECACA", borderWidth: 1 },
  dot: { backgroundColor: "#E5E7EB", borderRadius: 999, height: 4, width: 18 },
  dotActive: { backgroundColor: brand.colors.primary },
  label: { color: brand.colors.muted, fontSize: 12, fontWeight: "900" },
  labelActive: { color: brand.colors.primaryDark }
});
