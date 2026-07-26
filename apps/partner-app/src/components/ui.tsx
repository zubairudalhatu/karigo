import { brand } from "@karigo/config";
import { ReactElement, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControlProps,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function Screen({
  children,
  refreshControl,
  scroll = true
}: {
  children: ReactNode;
  refreshControl?: ReactElement<RefreshControlProps>;
  scroll?: boolean;
}) {
  const content = <View style={styles.content}>{children}</View>;

  return (
    <SafeAreaView style={styles.safeArea}>
      {scroll ? <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={refreshControl}>{content}</ScrollView> : content}
    </SafeAreaView>
  );
}

export function Hero({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.hero}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.heroTitle}>{title}</Text>
      {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function MutedText({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function Badge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "success" | "warning" | "info" }) {
  return (
    <View style={[styles.badge, badgeToneStyles[tone]]}>
      <Text style={[styles.badgeText, badgeTextToneStyles[tone]]}>{label}</Text>
    </View>
  );
}

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  variant = "primary"
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" ? styles.secondaryButton : styles.primaryButton,
        disabled ? styles.disabledButton : null,
        pressed && !disabled ? styles.pressedButton : null
      ]}
    >
      <Text style={[styles.buttonText, variant === "secondary" ? styles.secondaryButtonText : null]}>{label}</Text>
    </Pressable>
  );
}

export function TextField({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor="#9CA3AF"
        style={[styles.input, props.style]}
      />
    </View>
  );
}

export function LoadingState({ label = "Loading Partner Workspace..." }: { label?: string }) {
  return (
    <Screen scroll={false}>
      <View style={styles.centered}>
        <ActivityIndicator color={brand.colors.primary} />
        <Text style={styles.loadingText}>{label}</Text>
      </View>
    </Screen>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.muted}>{body}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: brand.colors.background
  },
  scrollContent: {
    paddingBottom: 112
  },
  content: {
    flex: 1,
    gap: 16,
    padding: 20
  },
  hero: {
    gap: 8,
    paddingVertical: 8
  },
  eyebrow: {
    color: brand.colors.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  heroTitle: {
    color: brand.colors.charcoal,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34
  },
  heroSubtitle: {
    color: brand.colors.muted,
    fontSize: 15,
    lineHeight: 22
  },
  card: {
    gap: 12,
    borderWidth: 1,
    borderColor: brand.colors.border,
    borderRadius: 24,
    backgroundColor: brand.colors.white,
    padding: 18,
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2
  },
  sectionTitle: {
    color: brand.colors.charcoal,
    fontSize: 18,
    fontWeight: "900"
  },
  muted: {
    color: brand.colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  badgeNeutral: {
    backgroundColor: "#F3F4F6"
  },
  badgeSuccess: {
    backgroundColor: "#DCFCE7"
  },
  badgeWarning: {
    backgroundColor: "#FEF3C7"
  },
  badgeInfo: {
    backgroundColor: "#DBEAFE"
  },
  badgeTextNeutral: {
    color: brand.colors.charcoal
  },
  badgeTextSuccess: {
    color: brand.colors.success
  },
  badgeTextWarning: {
    color: brand.colors.warning
  },
  badgeTextInfo: {
    color: brand.colors.info
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800"
  },
  statCard: {
    flex: 1,
    minWidth: "30%",
    borderRadius: 18,
    backgroundColor: "#F9FAFB",
    padding: 14
  },
  statValue: {
    color: brand.colors.charcoal,
    fontSize: 22,
    fontWeight: "900"
  },
  statLabel: {
    color: brand.colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingHorizontal: 18
  },
  primaryButton: {
    backgroundColor: brand.colors.primary
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: brand.colors.border,
    backgroundColor: brand.colors.white
  },
  disabledButton: {
    opacity: 0.55
  },
  pressedButton: {
    opacity: 0.88
  },
  buttonText: {
    color: brand.colors.white,
    fontSize: 15,
    fontWeight: "900"
  },
  secondaryButtonText: {
    color: brand.colors.charcoal
  },
  field: {
    gap: 8
  },
  fieldLabel: {
    color: brand.colors.charcoal,
    fontSize: 13,
    fontWeight: "800"
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: brand.colors.border,
    borderRadius: 16,
    backgroundColor: brand.colors.white,
    color: brand.colors.charcoal,
    paddingHorizontal: 14,
    fontSize: 15
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12
  },
  loadingText: {
    color: brand.colors.muted,
    fontWeight: "700"
  },
  emptyTitle: {
    color: brand.colors.charcoal,
    fontSize: 16,
    fontWeight: "900"
  }
});

const badgeToneStyles = {
  neutral: styles.badgeNeutral,
  success: styles.badgeSuccess,
  warning: styles.badgeWarning,
  info: styles.badgeInfo
};

const badgeTextToneStyles = {
  neutral: styles.badgeTextNeutral,
  success: styles.badgeTextSuccess,
  warning: styles.badgeTextWarning,
  info: styles.badgeTextInfo
};
