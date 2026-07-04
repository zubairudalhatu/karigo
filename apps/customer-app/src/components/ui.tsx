import { brand } from "@karigo/config";
import { Link, Redirect } from "expo-router";
import { ReactNode } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../contexts/auth-context";

export function Screen({ children, title, actions, refreshing, onRefresh }: { children: ReactNode; title?: string; actions?: ReactNode; refreshing?: boolean; onRefresh?: () => void }) {
  return <ScrollView contentContainerStyle={styles.screen} refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={brand.colors.primary} /> : undefined}>{title ? <View style={styles.heading}><Text style={styles.title}>{title}</Text>{actions}</View> : null}{children}</ScrollView>;
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
  screen: { backgroundColor: brand.colors.background, flexGrow: 1, gap: 18, padding: 22, paddingTop: 56 },
  heading: { alignItems: "flex-start", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  title: { color: brand.colors.charcoal, fontSize: 28, fontWeight: "900", letterSpacing: -0.4 },
  heroTitle: { color: brand.colors.charcoal, fontSize: 24, fontWeight: "900", letterSpacing: -0.3 },
  sectionTitle: { color: brand.colors.charcoal, fontSize: 18, fontWeight: "900" },
  pageIntro: { color: brand.colors.muted, fontSize: 15, lineHeight: 22 },
  input: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, color: brand.colors.charcoal, minHeight: 50, padding: 14 },
  button: { alignItems: "center", backgroundColor: brand.colors.primary, borderRadius: 14, minHeight: 48, justifyContent: "center", padding: 13 },
  buttonMuted: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderWidth: 1 },
  buttonDanger: { backgroundColor: brand.colors.primaryDark },
  buttonText: { color: brand.colors.white, fontWeight: "700" },
  buttonMutedText: { color: brand.colors.charcoal },
  disabled: { opacity: 0.5 },
  card: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 20, borderWidth: 1, gap: 10, padding: 16 },
  cardTitle: { color: brand.colors.charcoal, fontSize: 18, fontWeight: "900", lineHeight: 24 },
  cardText: { color: brand.colors.charcoal, fontSize: 15, lineHeight: 22 },
  message: { backgroundColor: "#ECFDF3", borderRadius: 10, color: brand.colors.success, lineHeight: 20, padding: 12 },
  error: { backgroundColor: "#FEF2F2", color: brand.colors.primaryDark },
  muted: { color: brand.colors.muted, lineHeight: 20 },
  center: { alignItems: "center", flex: 1, gap: 12, justifyContent: "center", padding: 30 },
  empty: { alignItems: "center", backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 16, borderStyle: "dashed", borderWidth: 1, gap: 8, padding: 28 },
  emptyTitle: { color: brand.colors.charcoal, fontSize: 18, fontWeight: "800" },
  brandHeader: { gap: 6, marginBottom: 2 },
  logo: { height: 42, width: 112 },
  badge: { alignSelf: "flex-start", borderRadius: 999, fontSize: 12, fontWeight: "800", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 6 },
  badgeSuccess: { backgroundColor: "#DCFCE7", color: "#166534" },
  badgeDanger: { backgroundColor: "#FEE2E2", color: "#991B1B" },
  badgeWarning: { backgroundColor: "#FEF3C7", color: "#92400E" },
  badgeInfo: { backgroundColor: "#DBEAFE", color: "#1E40AF" },
  otpCode: { color: brand.colors.charcoal, fontSize: 32, fontWeight: "900", letterSpacing: 4, textAlign: "center" },
  link: { color: brand.colors.primary, fontWeight: "700", paddingVertical: 6 },
  quickNav: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  chipSoft: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  chipText: { color: brand.colors.charcoal, fontWeight: "800" },
  chipTextSoft: { color: brand.colors.primaryDark },
  row: { alignItems: "center", flexDirection: "row", gap: 8 },
  spaceBetween: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  vendorCard: { gap: 12 },
  vendorImage: { alignItems: "center", backgroundColor: "#F3F4F6", borderRadius: 16, height: 108, justifyContent: "center", overflow: "hidden" },
  vendorImageText: { color: brand.colors.primaryDark, fontSize: 22, fontWeight: "900" },
  vendorOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", backgroundColor: "rgba(17, 24, 39, 0.48)", justifyContent: "center" },
  vendorOverlayText: { color: brand.colors.white, fontWeight: "900" },
  productImage: { backgroundColor: "#F3F4F6", borderRadius: 16, height: 150, width: "100%" },
  favorite: { color: brand.colors.primary, fontSize: 18, fontWeight: "900" },
  priceRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  priceLabel: { color: brand.colors.muted, fontSize: 15 },
  priceValue: { color: brand.colors.charcoal, fontSize: 15, fontWeight: "700" },
  payable: { color: brand.colors.charcoal, fontSize: 22, fontWeight: "900", letterSpacing: -0.2 },
  quoteText: { color: brand.colors.muted, fontSize: 12, lineHeight: 18 }
});

export const ui = styles;
