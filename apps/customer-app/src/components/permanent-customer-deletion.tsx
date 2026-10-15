import { router } from "expo-router";
import { useRef, useState } from "react";
import { Text } from "react-native";
import { accountDeletionApi } from "../api/account-deletion.api";
import { useAuth } from "../contexts/auth-context";
import { setBiometricSignInEnabled } from "../lib/biometric-auth";
import { readDeletionReceipt, saveDeletionReceipt } from "../lib/deletion-receipt";
import { Button, Card, Field, Message, Protected, Screen, ui } from "./ui";

export function PermanentCustomerDeletion() {
  const { user, logout } = useAuth();
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  async function submit() {
    if (submitting.current || !user || confirmation.trim().toUpperCase() !== "DELETE") return;
    submitting.current = true;
    setBusy(true); setError("");
    try {
      const saved = await readDeletionReceipt();
      const receiptToken = saved?.userId === user.id ? saved.receiptToken : (await accountDeletionApi.prepare()).receiptToken;
      // Persist the capability BEFORE disabling account access, so a lost POST
      // response can be recovered without logging in or submitting again.
      await saveDeletionReceipt({ userId: user.id, receiptToken });
      const request = await accountDeletionApi.request({ accountType: "CUSTOMER", confirmation: "DELETE", receiptToken });
      await saveDeletionReceipt({ userId: user.id, receiptToken, requestReference: request.requestReference });
      await setBiometricSignInEnabled(false);
      await logout();
      router.replace("/account-deletion-status" as never);
    } catch {
      setError("Could not finish recording your deletion request. Check the saved deletion receipt before trying again; do not share its private access data.");
    } finally { submitting.current = false; setBusy(false); }
  }
  return <Protected><Screen title="Delete account permanently">
    <Card><Text style={ui.cardTitle}>Permanent Customer account deletion</Text>
      <Text style={ui.muted}>This permanently removes ordinary personal data, saved addresses, photos, preferences and device registrations. Your account cannot be restored after cleanup.</Text>
      <Text style={ui.muted}>Deletion may take up to 30 days. Account access is disabled when you submit. Unresolved balances, purchases or disputes must be reconciled by KariGO before cleanup.</Text>
      <Text style={ui.muted}>Limited financial/legal records may be retained where required by law, with unnecessary personal details removed. Exact retention durations are subject to legal review.</Text>
      <Text style={ui.muted}>Keep your saved deletion receipt to check progress after sign-out. A one-time completion email is sent if your account has an email; otherwise the receipt provides completion confirmation. Support is available for problems but is not required to initiate deletion.</Text>
    </Card>
    <Field value={confirmation} onChangeText={setConfirmation} placeholder="Type DELETE to confirm" autoCapitalize="characters" accessibilityLabel="Confirm permanent deletion" />
    <Message error>{error}</Message>
    <Button title={busy ? "Requesting deletion…" : "Delete account permanently"} tone="danger" disabled={busy || confirmation.trim().toUpperCase() !== "DELETE"} onPress={() => void submit()} />
    <Button title="Check saved deletion receipt" tone="muted" onPress={() => router.push("/account-deletion-status" as never)} />
  </Screen></Protected>;
}
