import { brand } from "@karigo/config";
import { Link, Redirect } from "expo-router";
import { ReactNode } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../contexts/auth-context";

export function Screen({ children, title, subtitle, refreshing, onRefresh }: { children: ReactNode; title?: string; subtitle?: string; refreshing?: boolean; onRefresh?: () => void }) {
  return <ScrollView
    contentContainerStyle={ui.screen}
    refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={brand.colors.primary} /> : undefined}
  >
    {title ? <View style={ui.screenHeading}><Text style={ui.title}>{title}</Text>{subtitle ? <Text style={ui.pageIntro}>{subtitle}</Text> : null}</View> : null}
    {children}
  </ScrollView>;
}

export function Field(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput accessibilityLabel={props.placeholder} placeholderTextColor={brand.colors.muted} {...props} style={[ui.input, props.style]} />;
}

export function PasswordField(props: React.ComponentProps<typeof TextInput> & { visible: boolean; onToggleVisible: () => void }) {
  const { visible, onToggleVisible, ...inputProps } = props;
  return <View style={ui.passwordWrap}>
    <TextInput
      accessibilityLabel={inputProps.placeholder}
      placeholderTextColor={brand.colors.muted}
      {...inputProps}
      secureTextEntry={!visible}
      style={[ui.input, ui.passwordInput, inputProps.style]}
    />
    <Pressable accessibilityRole="button" accessibilityLabel={visible ? "Hide password" : "Show password"} onPress={onToggleVisible} style={ui.passwordToggle}>
      <Text style={ui.passwordToggleText}>{visible ? "Hide" : "Show"}</Text>
    </Pressable>
  </View>;
}

export function Button({ title, onPress, disabled, tone = "primary" }: { title: string; onPress?: () => void; disabled?: boolean; tone?: "primary" | "muted" | "danger" }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={onPress} style={[ui.button, tone === "muted" && ui.buttonMuted, tone === "danger" && ui.buttonDanger, disabled && ui.disabled]}>
    <Text style={[ui.buttonText, tone === "muted" && ui.buttonMutedText]}>{title}</Text>
  </Pressable>;
}

export function Card({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "soft" | "dark" }) {
  return <View style={[ui.card, tone === "soft" && ui.cardSoft, tone === "dark" && ui.cardDark]}>{children}</View>;
}

export function Message({ children, error = false }: { children?: ReactNode; error?: boolean }) {
  return children ? <Text accessibilityRole={error ? "alert" : "text"} style={[ui.message, error && ui.error]}>{children}</Text> : null;
}

export function Loading({ label = "Loading..." }: { label?: string }) {
  return <View style={ui.center}><ActivityIndicator color={brand.colors.primary} /><Text style={ui.muted}>{label}</Text></View>;
}

export function Empty({ message }: { message: string }) {
  return <View style={ui.empty}><Text style={ui.emptyTitle}>Nothing here yet</Text><Text style={ui.muted}>{message}</Text></View>;
}

export function BrandHeader({ eyebrow }: { eyebrow?: string }) {
  return <View style={ui.brandHeader}><Image source={require("../../assets/karigo-logo.png")} style={ui.logo} resizeMode="contain" /><Text style={ui.muted}>{eyebrow ?? "Reliable delivery, one job at a time."}</Text></View>;
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.replaceAll(" ", "_").toUpperCase();
  const label = status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  const tone = ["COMPLETED", "PAID", "DELIVERED", "ONLINE", "AVAILABLE", "ACTIVE"].includes(normalized) ? ui.badgeSuccess
    : ["FAILED", "CANCELLED", "VENDOR_REJECTED", "OFFLINE", "UNAVAILABLE", "SUSPENDED"].includes(normalized) ? ui.badgeDanger
      : ["PREPARING", "READY_FOR_PICKUP", "ON_THE_WAY", "RIDER_ASSIGNED", "BUSY", "ON_DELIVERY", "RIDER_ARRIVING_PICKUP"].includes(normalized) ? ui.badgeWarning
        : ui.badgeInfo;
  return <Text style={[ui.badge, tone]}>{label}</Text>;
}

export function NavLink({ href, label }: { href: string; label: string }) {
  return <Link href={href as never} style={ui.link}>{label}</Link>;
}

export function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading label="Opening KariGO Rider..." />;
  if (!user) return <Redirect href="/auth/login" />;
  return children;
}

export const ui = StyleSheet.create({
  screen: { backgroundColor: brand.colors.background, flexGrow: 1, gap: 16, padding: 20, paddingBottom: 112, paddingTop: 28 },
  screenHeading: { gap: 5 },
  title: { color: brand.colors.charcoal, fontSize: 25, fontWeight: "900", letterSpacing: -0.25 },
  heroTitle: { color: brand.colors.charcoal, fontSize: 28, fontWeight: "900", letterSpacing: -0.4 },
  sectionTitle: { color: brand.colors.charcoal, fontSize: 18, fontWeight: "900" },
  pageIntro: { color: brand.colors.muted, fontSize: 14.5, lineHeight: 21 },
  input: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 14, borderWidth: 1, color: brand.colors.charcoal, minHeight: 50, padding: 14 },
  passwordWrap: { position: "relative" },
  passwordInput: { paddingRight: 82 },
  passwordToggle: { alignItems: "center", bottom: 7, justifyContent: "center", position: "absolute", right: 8, top: 7, width: 66 },
  passwordToggleText: { color: brand.colors.primary, fontWeight: "900" },
  button: { alignItems: "center", backgroundColor: brand.colors.primary, borderRadius: 14, justifyContent: "center", minHeight: 50, padding: 14 },
  buttonMuted: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderWidth: 1 },
  buttonDanger: { backgroundColor: brand.colors.primaryDark },
  buttonText: { color: brand.colors.white, fontWeight: "800" },
  buttonMutedText: { color: brand.colors.charcoal },
  disabled: { opacity: 0.5 },
  card: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 20, borderWidth: 1, gap: 10, padding: 16 },
  cardSoft: { backgroundColor: "#FFF7F7", borderColor: "#FECACA" },
  cardDark: { backgroundColor: brand.colors.charcoal, borderColor: brand.colors.charcoal },
  message: { backgroundColor: "#ECFDF3", borderRadius: 12, color: brand.colors.success, lineHeight: 20, padding: 12 },
  error: { backgroundColor: "#FEF2F2", color: brand.colors.primaryDark },
  muted: { color: brand.colors.muted, lineHeight: 20 },
  center: { alignItems: "center", flex: 1, gap: 12, justifyContent: "center", padding: 30 },
  empty: { alignItems: "center", backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 18, borderStyle: "dashed", borderWidth: 1, gap: 8, padding: 28 },
  emptyTitle: { color: brand.colors.charcoal, fontSize: 18, fontWeight: "800" },
  link: { color: brand.colors.primary, fontWeight: "800", paddingVertical: 6 },
  brandHeader: { alignItems: "flex-start", gap: 5, marginBottom: 2 },
  logo: { height: 40, width: 112 },
  badge: { alignSelf: "flex-start", borderRadius: 999, fontSize: 12, fontWeight: "900", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 6 },
  badgeSuccess: { backgroundColor: "#DCFCE7", color: "#166534" },
  badgeDanger: { backgroundColor: "#FEE2E2", color: "#991B1B" },
  badgeWarning: { backgroundColor: "#FEF3C7", color: "#92400E" },
  badgeInfo: { backgroundColor: "#DBEAFE", color: "#1E40AF" },
  row: { alignItems: "center", flexDirection: "row", gap: 10 },
  spaceBetween: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  pill: { alignSelf: "flex-start", backgroundColor: "#F3F4F6", borderRadius: 999, color: brand.colors.muted, fontSize: 12, fontWeight: "900", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 5 }
});
