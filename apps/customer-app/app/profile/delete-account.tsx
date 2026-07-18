import { useState } from "react";
import { Text } from "react-native";
import { supportApi } from "../../src/api/support.api";
import { Button, Card, Field, Message, Protected, Screen, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";

export default function DeleteAccountRequestScreen() {
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await supportApi.create({
        category: "APP_OR_LOGIN_ISSUE",
        subject: "Account deletion or deactivation request",
        description: `Customer requested account deletion/deactivation review.\n\nReason:\n${reason.trim()}`
      });
      setReason("");
      setConfirmText("");
      setMessage("Your account deletion/deactivation request has been sent to KariGO Support for review.");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return <Protected>
    <Screen title="Delete or deactivate account">
      <Card>
        <Text style={ui.cardTitle}>Request account review</Text>
        <Text style={ui.muted}>This does not delete your account immediately. KariGO Support will verify ownership, active orders, wallet/payment records and legal retention requirements before actioning a deletion or deactivation request.</Text>
      </Card>
      <Field multiline numberOfLines={5} value={reason} onChangeText={setReason} placeholder="Tell us why you want to delete or deactivate your account" />
      <Field value={confirmText} onChangeText={setConfirmText} placeholder="Type DELETE to confirm request" autoCapitalize="characters" />
      <Message>{message}</Message>
      <Message error>{error}</Message>
      <Button title={busy ? "Sending request..." : "Send account deletion request"} tone="danger" onPress={submit} disabled={busy || reason.trim().length < 5 || confirmText.trim().toUpperCase() !== "DELETE"} />
    </Screen>
  </Protected>;
}
