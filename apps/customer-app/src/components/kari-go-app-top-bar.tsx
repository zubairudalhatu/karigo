import { Feather } from "@expo/vector-icons";
import { brand } from "@karigo/config";
import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TopBarAction = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
};

export function KariGoAppTopBar({
  showBack = false,
  title,
  rightAction
}: {
  showBack?: boolean;
  title?: string;
  rightAction?: TopBarAction;
}) {
  const insets = useSafeAreaInsets();

  return <View style={[styles.bar, { paddingTop: insets.top + 10 }]}>
    <View style={styles.side}>
      {showBack ? <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={10}
        onPress={() => router.back()}
        style={styles.iconButton}
      >
        <Feather name="chevron-left" size={24} color={brand.colors.charcoal} />
      </Pressable> : null}
    </View>
    <View style={styles.logoWrap}>
      <Image source={require("../../assets/karigo-logo.png")} style={styles.logo} resizeMode="contain" />
      {title ? <Text style={styles.title}>{title}</Text> : null}
    </View>
    <View style={[styles.side, styles.right]}>
      {rightAction ? <Pressable
        accessibilityRole="button"
        accessibilityLabel={rightAction.label}
        hitSlop={10}
        onPress={rightAction.onPress}
        style={styles.iconButton}
      >
        <Feather name={rightAction.icon} size={21} color={brand.colors.charcoal} />
      </Pressable> : null}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  bar: {
    alignItems: "center",
    backgroundColor: brand.colors.white,
    borderBottomColor: brand.colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingBottom: 14,
    paddingHorizontal: 16
  },
  side: { alignItems: "flex-start", minWidth: 44 },
  right: { alignItems: "flex-end" },
  iconButton: { alignItems: "center", backgroundColor: "#F9FAFB", borderRadius: 999, height: 42, justifyContent: "center", width: 42 },
  logoWrap: { alignItems: "center", flex: 1, gap: 2 },
  logo: { height: 34, width: 148 },
  title: { color: brand.colors.charcoal, fontSize: 12, fontWeight: "800" }
});
