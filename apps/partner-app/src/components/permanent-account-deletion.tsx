import { useState } from "react";
import { Text } from "react-native";
import * as SecureStore from "expo-secure-store";
import { api, authSessionStore } from "../api/client";
import { useAuth } from "../contexts/auth-context";
import { Card, MutedText, PrimaryButton, TextField } from "./ui";

const KEY = "karigo_partner_private_deletion_receipt";
type Receipt = { requestReference: string; status: string; deadlineAt?: string; completedAt?: string };
type SavedReceipt = { receiptToken: string; userId: string; reference?: string };

export function PermanentAccountDeletion() {
  const { user, logout } = useAuth();
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function request() {
    if (!user || confirmation !== "DELETE") return;
    const generation = authSessionStore.currentGeneration();
    const checkSession = () => { if (!authSessionStore.isCurrent(generation)) throw new Error("Account changed."); };
    setBusy(true); setMessage("");
    try {
      const stored = await SecureStore.getItemAsync(KEY);
      checkSession();
      let saved: SavedReceipt | null = stored ? JSON.parse(stored) : null;
      if (!saved || saved.userId !== user.id) {
        const proof = await api.post<{ receiptToken: string; reference: string }>("partner-mobile/account/prepare-deletion");
        checkSession();
        saved = { userId: user.id, receiptToken: proof.receiptToken, reference: proof.reference };
        await SecureStore.setItemAsync(KEY, JSON.stringify(saved), { keychainAccessible: SecureStore.WHEN_UNLOCKED });
      }
      checkSession();
      const receipt = await api.post<Receipt>("partner-mobile/account/permanent-deletion", { expectedUserId: user.id, confirmation, receiptToken: saved.receiptToken });
      checkSession();
      await SecureStore.setItemAsync(KEY, JSON.stringify({ ...saved, reference: receipt.requestReference }), { keychainAccessible: SecureStore.WHEN_UNLOCKED });
      setMessage(`Permanent account deletion recorded: ${receipt.requestReference}. Ordinary data is removed within 30 days after blockers are resolved. Keep this device for your private receipt.`);
      checkSession();
      await logout();
    } catch { setMessage("Deletion could not be confirmed. Your saved private receipt was kept; retry while signed in or check its status after sign-out."); }
    finally { setBusy(false); }
  }
  return <Card><Text>Permanently delete my entire KariGO account</Text>
    <MutedText>This removes personal data and all your KariGO roles, including Customer, Captain and Partner. It does not preserve another role. Access ends immediately. This cannot be cancelled.</MutedText>
    <MutedText>Open work, balances and disputes must first be reconciled. Ordinary profile, contact, credential, catalogue and onboarding-document data is removed or minimized within 30 days after blockers are resolved. Only necessary financial, fraud, legal and audit evidence is retained under the Privacy Policy. You do not need to contact Support to initiate deletion.</MutedText>
    <MutedText>A private status receipt remains on this device for 90 days after completion. It cannot restore your account. Do not share it.</MutedText>
    <TextField label="Type DELETE for permanent whole-account deletion" value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters" />
    <PrimaryButton label="Permanently delete my entire KariGO account" disabled={busy || confirmation !== "DELETE"} onPress={() => void request()} />
    <MutedText>{message}</MutedText></Card>;
}

export function PrivateDeletionReceipt() {
  const [message, setMessage] = useState("");
  async function read() {
    try {
      const stored = await SecureStore.getItemAsync(KEY);
      if (!stored) { setMessage("No saved deletion receipt on this device."); return; }
      const saved = JSON.parse(stored) as SavedReceipt;
      if (!saved.reference) { setMessage("The request may not have completed. Sign in to retry with the same saved receipt."); return; }
      const result = await api.post<Receipt>("partner-mobile/account/deletion-receipt", { reference: saved.reference, receiptToken: saved.receiptToken }, { authenticated: false });
      setMessage(`${result.requestReference}: ${result.status}. ${result.completedAt ? "Deletion completed. Receipt expires after 90 days." : "Work/financial or legal blockers are reviewed before permanent erasure; ordinary data is removed within 30 days after resolution."}`);
    } catch { setMessage("The private receipt is unavailable or expired. No account details were disclosed."); }
  }
  return <Card><PrimaryButton label="View saved account-deletion status" variant="secondary" onPress={() => void read()} /><MutedText>{message}</MutedText></Card>;
}
