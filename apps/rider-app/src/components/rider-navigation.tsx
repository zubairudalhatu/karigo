import { brand } from "@karigo/config";
import { Link, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/auth-context";

const tabs = [
  { label: "Home", href: "/tabs/dashboard", match: ["/tabs/dashboard"] },
  { label: "Jobs", href: "/jobs", match: ["/jobs"] },
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
  nav: { backgroundColor: brand.colors.white, borderTopColor: brand.colors.border, borderTopWidth: 1, bottom: 0, flexDirection: "row", gap: 6, justifyContent: "space-around", left: 0, paddingHorizontal: 10, paddingTop: 8, position: "absolute", right: 0 },
  item: { alignItems: "center", borderRadius: 14, flex: 1, gap: 4, minHeight: 50, paddingVertical: 6 },
  itemActive: { backgroundColor: "#FEF2F2" },
  dot: { backgroundColor: "transparent", borderRadius: 999, height: 4, width: 18 },
  dotActive: { backgroundColor: brand.colors.primary },
  label: { color: brand.colors.muted, fontSize: 12, fontWeight: "900" },
  labelActive: { color: brand.colors.primaryDark }
});
