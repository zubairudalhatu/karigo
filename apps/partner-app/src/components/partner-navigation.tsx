import { Feather } from "@expo/vector-icons";
import { brand } from "@karigo/config";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { partnerApi } from "../api/partner.api";
import { useAuth } from "../contexts/auth-context";

const tabs = [
  { label: "Home", path: "/", icon: "home" },
  { label: "Orders", path: "/orders", icon: "clipboard" },
  { label: "Products", path: "/products", icon: "shopping-bag" },
  { label: "Services", path: "/services", icon: "tool" },
  { label: "Earnings", path: "/earnings", icon: "dollar-sign" },
  { label: "Profile", path: "/profile", icon: "user" }
] satisfies Array<{ label: string; path: string; icon: keyof typeof Feather.glyphMap }>;

function isActive(pathname: string, tabPath: string) {
  if (tabPath === "/") return pathname === "/";
  return pathname.startsWith(tabPath);
}

export function PartnerBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [approved, setApproved] = useState(false);
  const [capabilities, setCapabilities] = useState<{ canManageProducts: boolean; canManageServices: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    if (!user || pathname.startsWith("/auth") || pathname.startsWith("/register")) {
      setApproved(false);
      setCapabilities(null);
      return;
    }

    Promise.all([partnerApi.onboardingState(), partnerApi.capabilities()])
      .then(([state, nextCapabilities]) => {
        if (!active) return;
        setApproved(state.state === "approved" && nextCapabilities.canAccessWorkspace);
        setCapabilities(nextCapabilities);
      })
      .catch(() => {
        if (active) {
          setApproved(false);
          setCapabilities(null);
        }
      });

    return () => {
      active = false;
    };
  }, [pathname, user?.id]);

  if (pathname.startsWith("/auth") || pathname.startsWith("/register")) return null;
  if (!approved) return null;

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]}>
      {tabs.filter((tab) => {
        if (tab.path === "/products") return capabilities?.canManageProducts;
        if (tab.path === "/services") return capabilities?.canManageServices;
        return true;
      }).map((tab) => {
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
              <Feather name={tab.icon} size={19} color={active ? brand.colors.white : brand.colors.muted} />
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
    left: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: brand.colors.border,
    borderRadius: 28,
    backgroundColor: brand.colors.white,
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 8,
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
  label: {
    color: brand.colors.muted,
    fontSize: 10,
    fontWeight: "800"
  },
  labelActive: {
    color: brand.colors.primary
  }
});
