import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { AccountDeletionRequest, accountDeletionApi } from "../src/api/account-deletion.api";
import { Button, Card, Field, Message, Protected, Screen, ui } from "../src/components/ui";
import { useAuth } from "../src/contexts/auth-context";
import { friendlyError } from "../src/lib/errors";

function statusLabel(value?: string | null) {
  return value ? value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Not requested";
}

export default function CaptainAccountDeletionScreen() {
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
      const request = await accountDeletionApi.requestCaptainDeactivation(reason.trim() || undefined);
      setCurrent(request);
      setReason("");
      setConfirmText("");
      setMessage(request.status === "BLOCKED"
        ? "Your request was recorded but active assignments, rides or earnings must be closed first."
        : "Your Captain access deactivation request has been recorded for KariGO Operations review.");
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
      setCurrent(await accountDeletionApi.cancel("Cancelled by Captain in app."));
      setMessage("Your Captain access deactivation request has been cancelled.");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return <Protected>
    <Screen title="Deactivate Captain access" subtitle="Request review before KariGO disables your delivery or ride operations access." refreshing={loading} onRefresh={load}>
      <Card>
        <Text style={ui.sectionTitle}>Deactivate my Captain access</Text>
        <Text style={ui.muted}>KariGO Operations will confirm that active deliveries, ride assignments, earnings and settlement records are closed before processing.</Text>
        <Text style={ui.muted}>Operational, payment, security and audit records that KariGO must retain are preserved.</Text>
      </Card>
      {current ? <Card>
        <Text style={ui.sectionTitle}>Current request</Text>
        <Text style={ui.muted}>Reference: {current.requestReference}</Text>
        <Text style={ui.muted}>Status: {statusLabel(current.status)}</Text>
        {current.blockers.length ? <View>
          {current.blockers.map((blocker) => <Text key={blocker.code} style={ui.muted}>{blocker.message}</Text>)}
        </View> : null}
        {current.canCancel ? <Button title={busy ? "Cancelling..." : "Cancel request"} tone="muted" onPress={cancel} disabled={busy} /> : null}
      </Card> : null}
      <Field multiline numberOfLines={5} value={reason} onChangeText={setReason} placeholder="Reason optional" />
      <Field value={confirmText} onChangeText={setConfirmText} placeholder="Type DELETE to confirm request" autoCapitalize="characters" />
      <Message>{message}</Message>
      <Message error>{error}</Message>
      <Button title={busy ? "Sending request..." : "Deactivate my Captain access"} tone="danger" onPress={submit} disabled={busy || confirmText.trim().toUpperCase() !== "DELETE"} />
    </Screen>
  </Protected>;
}
