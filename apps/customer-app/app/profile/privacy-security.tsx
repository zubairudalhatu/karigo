import { Feather } from "@expo/vector-icons";
import { brand } from "@karigo/config";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, Card, Message, Protected, Screen, ui } from "../../src/components/ui";
import { useAuth } from "../../src/contexts/auth-context";
import { friendlyError } from "../../src/lib/errors";

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
  const { biometricAvailable, biometricEnabled, logout, setBiometricSignIn } = useAuth();
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricMessage, setBiometricMessage] = useState("");
  const [biometricError, setBiometricError] = useState("");

  async function toggleBiometric() {
    setBiometricBusy(true);
    setBiometricMessage("");
    setBiometricError("");
    try {
      await setBiometricSignIn(!biometricEnabled);
      setBiometricMessage(!biometricEnabled ? "Biometric sign-in enabled on this device." : "Biometric sign-in disabled on this device.");
    } catch (e) {
      setBiometricError(friendlyError(e));
    } finally {
      setBiometricBusy(false);
    }
  }

  return <Protected>
    <Screen title="Privacy and security">
      <Text style={ui.pageIntro}>Manage account safety, privacy links and support-managed security requests.</Text>

      <Card>
        <Text style={ui.cardTitle}>Account access</Text>
        <SecurityRow
          icon="lock"
          title="Change password"
          body="Update your password inside KariGO after confirming your current password."
        />
        <SecurityRow
          icon="log-out"
          title="Manage sessions"
          body="You can sign out of this device now. Full session management remains support-managed until separately enabled."
        />
        <View style={styles.actions}>
          <Button title="Change password" tone="muted" onPress={() => router.push("/profile/change-password")} />
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
          <Button title="View Privacy Policy" tone="muted" onPress={() => router.push("/profile/privacy-policy")} />
          <Button title="View Terms" tone="muted" onPress={() => router.push("/profile/terms")} />
        </View>
      </Card>

      <Card>
        <Text style={ui.cardTitle}>Security tips</Text>
        <SecurityRow icon="shield" title="Protect your OTP" body="KariGO will never ask you to share an OTP, payment PIN or password in chat." />
        <SecurityRow icon="credit-card" title="Pay safely" body="Use only payment options shown inside KariGO and wait for backend verification before treating an order as paid." />
        <SecurityRow icon="trash-2" title="Delete or deactivate account" body="Request a support-reviewed deletion or deactivation. KariGO will verify ownership, active orders and retention requirements first." />
        <Button title="Request account deletion/deactivation" tone="danger" onPress={() => router.push("/profile/delete-account")} />
      </Card>

      <Card>
        <Text style={ui.cardTitle}>Biometric sign-in</Text>
        <Text style={ui.muted}>Use your device fingerprint or face unlock to refresh a saved KariGO session. If the backend refresh token is missing or revoked, password sign-in is still required.</Text>
        <Text style={ui.muted}>Device support: {biometricAvailable ? "Available" : "Set up biometrics in your phone settings first."}</Text>
        <Message>{biometricMessage}</Message>
        <Message error>{biometricError}</Message>
        <Button title={biometricBusy ? "Updating..." : biometricEnabled ? "Disable biometric sign-in" : "Enable biometric sign-in"} tone="muted" onPress={toggleBiometric} disabled={biometricBusy || (!biometricAvailable && !biometricEnabled)} />
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
