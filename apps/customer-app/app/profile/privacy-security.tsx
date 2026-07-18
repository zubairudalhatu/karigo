import { Feather } from "@expo/vector-icons";
import { brand } from "@karigo/config";
import { router } from "expo-router";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Button, Card, Protected, Screen, ui } from "../../src/components/ui";
import { useAuth } from "../../src/contexts/auth-context";

const privacyUrl = "https://www.karigo.com.ng/privacy";
const termsUrl = "https://www.karigo.com.ng/terms";

function SecurityRow({ icon, title, body }: { icon: keyof typeof Feather.glyphMap; title: string; body: string }) {
  return <View style={styles.row}>
    <View style={styles.iconCircle}><Feather name={icon} size={18} color={brand.colors.primary} /></View>
    <View style={styles.rowCopy}>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={ui.muted}>{body}</Text>
    </View>
  </View>;
}

export default function PrivacySecurityScreen() {
  const { logout } = useAuth();

  return <Protected>
    <Screen title="Privacy and security">
      <Text style={ui.pageIntro}>Manage account safety, privacy links and support-managed security requests.</Text>

      <Card>
        <Text style={ui.cardTitle}>Account access</Text>
        <SecurityRow
          icon="lock"
          title="Change password"
          body="Use Support Centre if you need help changing your password or recovering account access."
        />
        <SecurityRow
          icon="log-out"
          title="Manage sessions"
          body="You can sign out of this device now. Full session management remains support-managed until separately enabled."
        />
        <View style={styles.actions}>
          <Button title="Open Support Centre" tone="muted" onPress={() => router.push("/support")} />
          <Button title="Sign out on this device" tone="muted" onPress={async () => { await logout(); router.replace("/auth/login"); }} />
        </View>
      </Card>

      <Card>
        <Text style={ui.cardTitle}>Privacy links</Text>
        <SecurityRow
          icon="file-text"
          title="Privacy Policy"
          body="Review how KariGO handles account, delivery, payment and support information."
        />
        <SecurityRow
          icon="clipboard"
          title="Terms"
          body="Review customer responsibilities, payment rules, support review and service availability."
        />
        <View style={styles.actions}>
          <Button title="Open Privacy Policy" tone="muted" onPress={() => Linking.openURL(privacyUrl)} />
          <Button title="Open Terms" tone="muted" onPress={() => Linking.openURL(termsUrl)} />
        </View>
      </Card>

      <Card>
        <Text style={ui.cardTitle}>Security tips</Text>
        <SecurityRow icon="shield" title="Protect your OTP" body="KariGO will never ask you to share an OTP, payment PIN or password in chat." />
        <SecurityRow icon="credit-card" title="Pay safely" body="Use only payment options shown inside KariGO and wait for backend verification before treating an order as paid." />
        <SecurityRow icon="trash-2" title="Delete or deactivate account" body="Open a support ticket to request account deactivation or deletion review. KariGO will verify account ownership first." />
      </Card>

      <Card>
        <Text style={ui.cardTitle}>Biometric sign-in</Text>
        <Text style={ui.muted}>Biometric and passwordless sign-in are not enabled in this app build. KariGO will show a clear setup flow only after the backend and device controls are approved.</Text>
      </Card>
    </Screen>
  </Protected>;
}

const styles = StyleSheet.create({
  actions: { gap: 10 },
  iconCircle: { alignItems: "center", backgroundColor: "#FEF2F2", borderRadius: 999, height: 38, justifyContent: "center", width: 38 },
  row: { alignItems: "flex-start", flexDirection: "row", gap: 12, paddingVertical: 8 },
  rowCopy: { flex: 1, gap: 3 },
  rowTitle: { color: brand.colors.charcoal, fontSize: 15, fontWeight: "900" }
});
