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
      <Text style={ui.muted}>This permanently removes ordinary Customer personal data, saved addresses, photos, preferences and Customer device registrations. Your Customer account cannot be restored after cleanup. If another legitimate KariGO role remains active, only its required shared identity and role data remain; Customer-only personal data is still removed.</Text>
      <Text style={ui.muted}>Deletion may take up to 30 days. Customer access is disabled when you submit. Unresolved balances, purchases or disputes must be reconciled by KariGO before cleanup. A legal hold delays cleanup only for the affected records.</Text>
      <Text style={ui.muted}>Minimum financial/service records may remain for 7 years from the end of the transaction financial year; fraud/dispute records for 7 years from resolution. Unnecessary personal details are removed. Legal holds affect only the relevant records. See the Privacy Policy for the full retention schedule effective 15 October 2026.</Text>
      <Text style={ui.muted}>Keep your saved deletion receipt to check progress after sign-out. A one-time completion email is sent if your account has an email; otherwise the receipt provides completion confirmation. Support is available for problems but is not required to initiate deletion.</Text>
    </Card>
    <Field value={confirmation} onChangeText={setConfirmation} placeholder="Type DELETE to confirm" autoCapitalize="characters" accessibilityLabel="Confirm permanent deletion" />
    <Message error>{error}</Message>
    <Button title={busy ? "Requesting deletion…" : "Delete account permanently"} tone="danger" disabled={busy || confirmation.trim().toUpperCase() !== "DELETE"} onPress={() => void submit()} />
    <Button title="Check saved deletion receipt" tone="muted" onPress={() => router.push("/account-deletion-status" as never)} />
  </Screen></Protected>;
}
