import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { AccountDeletionRequest, accountDeletionApi } from "../../src/api/account-deletion.api";
import { AuthGate } from "../../src/components/auth-gate";
import { Card, Hero, LoadingState, MutedText, PrimaryButton, Screen, TextField } from "../../src/components/ui";
import { useAuth } from "../../src/contexts/auth-context";

function statusLabel(value?: string | null) {
  return value ? value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Not requested";
}

function DeletePartnerAccessContent() {
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
      setError(e instanceof Error ? e.message : "Account deletion status could not be loaded.");
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
      const request = await accountDeletionApi.requestPartnerDeletion(reason.trim() || undefined);
      setCurrent(request);
      setReason("");
      setConfirmText("");
      setMessage(request.status === "BLOCKED"
        ? "Your request was recorded but open orders or settlement records must be closed first."
        : "Your Partner business access deletion request has been recorded for KariGO review.");
      await signOutIfFinal(request);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Partner business deletion request could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      setCurrent(await accountDeletionApi.cancel("Cancelled by Partner in app."));
      setMessage("Your Partner business access deletion request has been cancelled.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request could not be cancelled.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState label="Loading account request status..." />;

  return (
    <Screen>
      <Hero eyebrow="Account controls" title="Delete Partner business access" subtitle="Request a safe review before KariGO closes your Partner profile." />
      <Card>
        <Text>Delete my KariGO Partner business access</Text>
        <MutedText>Open orders, pending settlements, branch availability and required business records must be reconciled before KariGO processes this request.</MutedText>
        <MutedText>Order, settlement, tax, security and audit records that KariGO must retain are preserved.</MutedText>
      </Card>
      {current ? <Card>
        <Text>Current request</Text>
        <MutedText>Reference: {current.requestReference}</MutedText>
        <MutedText>Status: {statusLabel(current.status)}</MutedText>
        {current.blockers.length ? <View>
          {current.blockers.map((blocker) => <MutedText key={blocker.code}>{blocker.message}</MutedText>)}
        </View> : null}
        {current.canCancel ? <PrimaryButton label={busy ? "Cancelling..." : "Cancel request"} onPress={() => void cancel()} disabled={busy} variant="secondary" /> : null}
      </Card> : null}
      <TextField label="Reason optional" value={reason} onChangeText={setReason} multiline numberOfLines={5} />
      <TextField label="Type DELETE to confirm request" value={confirmText} onChangeText={setConfirmText} autoCapitalize="characters" />
      {message ? <MutedText>{message}</MutedText> : null}
      {error ? <MutedText>{error}</MutedText> : null}
      <PrimaryButton label={busy ? "Sending request..." : "Delete my KariGO Partner business access"} onPress={() => void submit()} disabled={busy || confirmText.trim().toUpperCase() !== "DELETE"} />
    </Screen>
  );
}

export default function DeletePartnerAccessScreen() {
  return (
    <AuthGate>
      <DeletePartnerAccessContent />
    </AuthGate>
  );
}
