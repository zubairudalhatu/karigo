import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import { PermanentCustomerDeletion } from "../../src/components/permanent-customer-deletion";
import { AccountDeletionRequest, accountDeletionApi } from "../../src/api/account-deletion.api";
import { Button, Card, Field, Message, Protected, Screen, ui } from "../../src/components/ui";
import { useAuth } from "../../src/contexts/auth-context";
import { friendlyError } from "../../src/lib/errors";

function statusLabel(value?: string | null) {
  return value ? value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Not requested";
}

function DeleteAccountRequestScreen() {
  const { logout } = useAuth();
  const [current, setCurrent] = useState<AccountDeletionRequest | null>(null);
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setCurrent(await accountDeletionApi.current());
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function signOutIfFinal(request: AccountDeletionRequest) {
    if (request.status === "PROCESSING" || request.status === "COMPLETED") {
      await logout();
    }
  }

  async function submit() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const request = await accountDeletionApi.request({
        accountType: "CUSTOMER",
        reason: reason.trim() || undefined,
        confirmation: "DELETE"
      });
      setCurrent(request);
      setReason("");
      setConfirmText("");
      setMessage(request.status === "BLOCKED"
        ? "Your request was recorded but cannot be processed until active orders, rides, wallet/payment or support obligations are closed."
        : "Your Customer account deletion request has been recorded for KariGO review.");
      await signOutIfFinal(request);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const request = await accountDeletionApi.cancel("Cancelled by customer in app.");
      setCurrent(request);
      setMessage("Your account deletion request has been cancelled.");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return <Protected>
    <Screen title="Delete account" refreshing={loading} onRefresh={load}>
      <Card>
        <Text style={ui.cardTitle}>Delete my KariGO Customer account</Text>
        <Text style={ui.muted}>KariGO reviews deletion requests before processing. Active orders, active rides, open support cases, wallet balances, refunds or payment issues may need to be closed first.</Text>
        <Text style={ui.muted}>Order, payment, wallet, security and audit records that KariGO must retain for legal, financial and safety reasons are preserved.</Text>
      </Card>
      {current ? <Card>
        <Text style={ui.cardTitle}>Current request</Text>
        <Text style={ui.muted}>Reference: {current.requestReference}</Text>
        <Text style={ui.muted}>Status: {statusLabel(current.status)}</Text>
        {current.blockers.length ? <View>
          {current.blockers.map((blocker) => <Text key={blocker.code} style={ui.muted}>{blocker.message}</Text>)}
        </View> : null}
        {current.canCancel ? <Button title={busy ? "Cancelling..." : "Cancel deletion request"} tone="muted" onPress={cancel} disabled={busy} /> : null}
      </Card> : null}
      <Field multiline numberOfLines={5} value={reason} onChangeText={setReason} placeholder="Reason optional" />
      <Field value={confirmText} onChangeText={setConfirmText} placeholder="Type DELETE to confirm request" autoCapitalize="characters" />
      <Message>{message}</Message>
      <Message error>{error}</Message>
      <Button title={busy ? "Sending request..." : "Delete my KariGO Customer account"} tone="danger" onPress={submit} disabled={busy || confirmText.trim().toUpperCase() !== "DELETE"} />
    </Screen>
  </Protected>;
}

export default function CustomerDeletionScreen() {
  return Platform.OS === "ios" ? <PermanentCustomerDeletion /> : <DeleteAccountRequestScreen />;
}
