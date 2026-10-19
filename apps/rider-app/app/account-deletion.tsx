import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Text } from "react-native";
import { AccountDeletionRequest, accountDeletionApi } from "../src/api/account-deletion.api";
import { Button, Card, Field, Message, Protected, Screen, ui } from "../src/components/ui";
import { useAuth } from "../src/contexts/auth-context";
import { friendlyError } from "../src/lib/errors";
import { readDeletionReceipt, saveDeletionReceipt } from "../src/lib/deletion-receipt";

export default function CaptainAccountDeletionScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [current, setCurrent] = useState<AccountDeletionRequest | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void accountDeletionApi.current().then(value => { if (active) setCurrent(value); })
      .catch(cause => { if (active) setError(friendlyError(cause)); });
    return () => { active = false; };
  }, []);
  async function submit(wholeAccount = false) {
    if (!user || busy) return;
    setBusy(true); setError("");
    try {
      const saved = await readDeletionReceipt();
      const accountType = wholeAccount ? "COMPLETE_ACCOUNT" as const : "CAPTAIN" as const;
      const receipt = saved?.userId === user.id && (saved.accountType ?? "CAPTAIN") === accountType ? saved
        : { userId: user.id, accountType, ...(await accountDeletionApi.prepare()) };
      // Persist before submission: a lost response must not lose the receipt or cause a second request.
      await saveDeletionReceipt(receipt);
      const request = await accountDeletionApi.requestPermanentCaptainDeletion(receipt.receiptToken, wholeAccount);
      await saveDeletionReceipt({ ...receipt, requestReference: request.requestReference });
      setCurrent(request);
      await logout();
      router.replace("/account-deletion-status" as never);
    } catch (cause) { setError(friendlyError(cause)); }
    finally { setBusy(false); }
  }
  return <Protected><Screen title="Permanently delete Captain account" subtitle="Delete Captain personal data, not just deactivate access.">
    <Card>
      <Text style={ui.sectionTitle}>Permanent Captain deletion</Text>
      <Text style={ui.muted}>Submitting disables Captain operational access and signs this app out. Active work and unsettled earnings must be resolved before final cleanup.</Text>
      <Text style={ui.muted}>We remove or minimize your Captain profile, residential address, licence and vehicle information, uploaded onboarding photos/documents, device registrations and preferences. Ordinary data is removed within 30 days after blockers are resolved.</Text>
      <Text style={ui.muted}>Only necessary financial, fraud, legal and audit evidence is retained under the KariGO Privacy Policy. This does not require contacting Support to initiate.</Text>
      <Text style={ui.muted}>If Captain is your only genuine KariGO role, your account identity is deleted too. A genuine Customer or Partner role is preserved; its data is not silently deleted.</Text>
      <Text style={ui.muted}>To delete both Captain and Customer access, choose entire account below. Both role-deletion workflows must complete before identity removal. A separate business or administrative role requires its existing role-specific deletion review first; Captain-only deletion remains available.</Text>
      <Text style={ui.muted}>A private status/completion receipt stays on this device for access after sign-out, and remains available for 90 days after completion. Do not share it. Permanent deletion cannot be cancelled.</Text>
    </Card>
    {current ? <Card><Text style={ui.muted}>Request: {current.requestReference}</Text><Text style={ui.muted}>Status: {current.status}</Text></Card> : null}
    <Field value={confirmText} onChangeText={setConfirmText} placeholder="Type DELETE to confirm permanent deletion" autoCapitalize="characters" />
    <Message error>{error}</Message>
    <Button title={busy ? "Submitting…" : "Permanently delete Captain role"} tone="danger" onPress={() => void submit(false)} disabled={busy || confirmText.trim().toUpperCase() !== "DELETE"} />
    <Button title="Permanently delete my entire KariGO account" tone="danger" onPress={() => void submit(true)} disabled={busy || confirmText.trim().toUpperCase() !== "DELETE"} />
    <Button title="View saved deletion receipt" tone="muted" onPress={() => router.push("/account-deletion-status" as never)} />
  </Screen></Protected>;
}
