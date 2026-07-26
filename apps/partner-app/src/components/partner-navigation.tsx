import { brand } from "@karigo/config";
import { usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

const tabs = [
  { label: "Home", path: "/", icon: "H" },
  { label: "Orders", path: "/orders", icon: "O" },
  { label: "Products", path: "/products", icon: "P" },
  { label: "Services", path: "/services", icon: "S" },
  { label: "Profile", path: "/profile", icon: "M" }
];

function isActive(pathname: string, tabPath: string) {
  if (tabPath === "/") return pathname === "/";
  return pathname.startsWith(tabPath);
}

export function PartnerBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname.startsWith("/auth")) return null;

  return (
    <View style={styles.wrap}>
      {tabs.map((tab) => {
        const active = isActive(pathname, tab.path);
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            key={tab.path}
            onPress={() => router.push(tab.path)}
            style={styles.tab}
          >
            <View style={[styles.icon, active ? styles.iconActive : null]}>
              <Text style={[styles.iconText, active ? styles.iconTextActive : null]}>{tab.icon}</Text>
            </View>
            <Text style={[styles.label, active ? styles.labelActive : null]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: 14,
    bottom: 14,
    left: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: brand.colors.border,
    borderRadius: 28,
    backgroundColor: brand.colors.white,
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 4
  },
  icon: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#F3F4F6"
  },
  iconActive: {
    backgroundColor: brand.colors.primary
  },
  iconText: {
    color: brand.colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  iconTextActive: {
    color: brand.colors.white
  },
  label: {
    color: brand.colors.muted,
    fontSize: 11,
    fontWeight: "800"
  },
  labelActive: {
    color: brand.colors.primary
  }
});
