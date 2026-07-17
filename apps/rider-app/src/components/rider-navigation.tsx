import { Feather } from "@expo/vector-icons";
import { brand } from "@karigo/config";
import { Link, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/auth-context";

const tabs = [
  { label: "Home", icon: "home", href: "/tabs/dashboard", match: ["/tabs/dashboard"] },
  { label: "Deliveries", icon: "briefcase", href: "/jobs", match: ["/jobs"] },
  { label: "Earnings", icon: "credit-card", href: "/earnings", match: ["/earnings"] },
  { label: "Profile", icon: "user", href: "/profile", match: ["/profile", "/notifications"] }
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
        <Pressable accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected: active }} style={styles.item}>
          <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
            <Feather name={tab.icon} size={21} color={active ? brand.colors.primary : brand.colors.muted} />
          </View>
          <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
        </Pressable>
      </Link>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  nav: { backgroundColor: brand.colors.white, borderTopColor: brand.colors.border, borderTopWidth: 1, bottom: 0, flexDirection: "row", gap: 4, justifyContent: "space-around", left: 0, paddingHorizontal: 8, paddingTop: 8, position: "absolute", right: 0, shadowColor: "#111827", shadowOpacity: 0.08, shadowRadius: 14 },
  item: { alignItems: "center", flex: 1, gap: 3, minHeight: 56, paddingVertical: 6 },
  iconWrap: { alignItems: "center", borderRadius: 16, height: 32, justifyContent: "center", width: 42 },
  iconWrapActive: { backgroundColor: "#FEF2F2", borderColor: "#FECACA", borderWidth: 1 },
  label: { color: brand.colors.muted, fontSize: 11, fontWeight: "900" },
  labelActive: { color: brand.colors.primaryDark }
});
