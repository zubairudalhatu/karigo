import { brand } from "@karigo/config";
import { Link, Redirect } from "expo-router";
import { ReactNode } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../contexts/auth-context";

export function Screen({ children, title, actions }: { children: ReactNode; title?: string; actions?: ReactNode }) {
  return <ScrollView contentContainerStyle={styles.screen}>{title ? <View style={styles.heading}><Text style={styles.title}>{title}</Text>{actions}</View> : null}{children}</ScrollView>;
}

export function Field(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput accessibilityLabel={props.placeholder} placeholderTextColor={brand.colors.muted} {...props} style={[styles.input, props.style]} />;
}

export function Button({ title, onPress, disabled, tone = "primary" }: { title: string; onPress?: () => void; disabled?: boolean; tone?: "primary" | "muted" | "danger" }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={onPress} style={[styles.button, tone === "muted" && styles.buttonMuted, tone === "danger" && styles.buttonDanger, disabled && styles.disabled]}><Text style={[styles.buttonText, tone === "muted" && styles.buttonMutedText]}>{title}</Text></Pressable>;
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Message({ children, error = false }: { children?: ReactNode; error?: boolean }) {
  return children ? <Text accessibilityRole={error ? "alert" : "text"} style={[styles.message, error && styles.error]}>{children}</Text> : null;
}

export function Loading({ label = "Loading..." }: { label?: string }) {
  return <View style={styles.center}><ActivityIndicator color={brand.colors.primary} /><Text style={styles.muted}>{label}</Text></View>;
}

export function Empty({ message }: { message: string }) {
  return <View style={styles.empty}><Text style={styles.emptyTitle}>Nothing here yet</Text><Text style={styles.muted}>{message}</Text></View>;
}

export function BrandHeader({ eyebrow }: { eyebrow?: string }) {
  return <View style={styles.brandHeader}><Image source={require("../../assets/karigo-logo.png")} style={styles.logo} resizeMode="contain" /><Text style={styles.muted}>{eyebrow ?? brand.tagline}</Text></View>;
}

export function StatusBadge({ status }: { status: string }) {
  const label = status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  const tone = ["COMPLETED", "PAID", "DELIVERED", "VENDOR_ACCEPTED"].includes(status) ? styles.badgeSuccess
    : ["FAILED", "CANCELLED", "VENDOR_REJECTED", "REFUNDED"].includes(status) ? styles.badgeDanger
    : ["PREPARING", "READY_FOR_PICKUP", "ON_THE_WAY", "RIDER_ASSIGNED"].includes(status) ? styles.badgeWarning
    : styles.badgeInfo;
  return <Text style={[styles.badge, tone]}>{label}</Text>;
}

export function NavLink({ href, label }: { href: string; label: string }) {
  return <Link href={href as never} style={styles.link}>{label}</Link>;
}

export function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading label="Opening KariGO..." />;
  if (!user) return <Redirect href="/auth/login" />;
  return children;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: brand.colors.background, flexGrow: 1, gap: 14, padding: 20, paddingTop: 48 },
  heading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  title: { color: brand.colors.charcoal, fontSize: 26, fontWeight: "800" },
  input: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 12, borderWidth: 1, color: brand.colors.charcoal, minHeight: 50, padding: 14 },
  button: { alignItems: "center", backgroundColor: brand.colors.primary, borderRadius: 12, minHeight: 50, justifyContent: "center", padding: 14 },
  buttonMuted: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderWidth: 1 },
  buttonDanger: { backgroundColor: brand.colors.primaryDark },
  buttonText: { color: brand.colors.white, fontWeight: "700" },
  buttonMutedText: { color: brand.colors.charcoal },
  disabled: { opacity: 0.5 },
  card: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, gap: 8, padding: 16 },
  message: { backgroundColor: "#ECFDF3", borderRadius: 10, color: brand.colors.success, lineHeight: 20, padding: 12 },
  error: { backgroundColor: "#FEF2F2", color: brand.colors.primaryDark },
  muted: { color: brand.colors.muted },
  center: { alignItems: "center", flex: 1, gap: 12, justifyContent: "center", padding: 30 },
  empty: { alignItems: "center", backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 16, borderStyle: "dashed", borderWidth: 1, gap: 8, padding: 28 },
  emptyTitle: { color: brand.colors.charcoal, fontSize: 18, fontWeight: "800" },
  brandHeader: { gap: 4, marginBottom: 4 },
  logo: { height: 46, width: 122 },
  badge: { alignSelf: "flex-start", borderRadius: 999, fontSize: 12, fontWeight: "800", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 6 },
  badgeSuccess: { backgroundColor: "#DCFCE7", color: "#166534" },
  badgeDanger: { backgroundColor: "#FEE2E2", color: "#991B1B" },
  badgeWarning: { backgroundColor: "#FEF3C7", color: "#92400E" },
  badgeInfo: { backgroundColor: "#DBEAFE", color: "#1E40AF" },
  link: { color: brand.colors.primary, fontWeight: "700", paddingVertical: 6 }
});

export const ui = styles;
