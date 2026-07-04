import { brand } from "@karigo/config";
import { Link, router, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/auth-context";
import { useCart } from "../contexts/cart-context";

const navItems = [
  { label: "Home", icon: "H", href: "/tabs/home", match: ["/tabs/home"] },
  { label: "Browse", icon: "B", href: "/catalogue/food", match: ["/catalogue", "/vendors", "/products", "/parcel"] },
  { label: "Cart", icon: "C", href: "/cart", match: ["/cart", "/checkout"] },
  { label: "Orders", icon: "O", href: "/orders", match: ["/orders"] },
  { label: "Profile", icon: "P", href: "/profile", match: ["/profile", "/addresses", "/support", "/notifications"] }
];

export function CustomerBottomNav() {
  const { user } = useAuth();
  const cart = useCart();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const hidden = !user || pathname === "/" || pathname.startsWith("/auth");
  if (hidden) return null;

  return <View style={[styles.nav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
    {navItems.map((item) => {
      const active = item.match.some((prefix) => pathname.startsWith(prefix));
      return <Link key={item.label} href={item.href as never} asChild>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} style={styles.navItem}>
          <View>
            <Text style={[styles.icon, active && styles.active]}>{item.icon}</Text>
            {item.label === "Cart" && cart.count > 0 ? <Text style={styles.badge}>{cart.count}</Text> : null}
          </View>
          <Text style={[styles.label, active && styles.active]}>{item.label}</Text>
        </Pressable>
      </Link>;
    })}
  </View>;
}

export function CartNotice() {
  const { user } = useAuth();
  const cart = useCart();
  if (!user || !cart.notice) return null;

  return <View style={styles.notice}>
    <Text style={styles.noticeText}>{cart.notice.message}</Text>
    <Pressable accessibilityRole="button" onPress={() => { cart.clearNotice(); router.push("/cart"); }}>
      <Text style={styles.noticeAction}>View cart</Text>
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  nav: { backgroundColor: brand.colors.white, borderTopColor: brand.colors.border, borderTopWidth: 1, bottom: 0, flexDirection: "row", gap: 4, justifyContent: "space-around", left: 0, paddingTop: 8, position: "absolute", right: 0 },
  navItem: { alignItems: "center", flex: 1, gap: 2, minHeight: 54 },
  icon: { color: brand.colors.muted, fontSize: 13, fontWeight: "900", textAlign: "center" },
  label: { color: brand.colors.muted, fontSize: 11, fontWeight: "800" },
  active: { color: brand.colors.primary },
  badge: { backgroundColor: brand.colors.primary, borderRadius: 999, color: brand.colors.white, fontSize: 10, fontWeight: "900", minWidth: 18, overflow: "hidden", paddingHorizontal: 5, paddingVertical: 2, position: "absolute", right: -14, textAlign: "center", top: -4 },
  notice: { alignItems: "center", backgroundColor: brand.colors.charcoal, borderRadius: 16, bottom: 86, flexDirection: "row", gap: 12, justifyContent: "space-between", left: 18, paddingHorizontal: 16, paddingVertical: 12, position: "absolute", right: 18 },
  noticeText: { color: brand.colors.white, flex: 1, fontWeight: "800" },
  noticeAction: { color: brand.colors.white, fontWeight: "900", textDecorationLine: "underline" }
});
