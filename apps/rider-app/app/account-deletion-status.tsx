import { useEffect, useState } from "react";
import { Text } from "react-native";
import type { AccountDeletionRequest } from "../src/api/account-deletion.api";
import { loadDeletionReceipt, readDeletionReceipt } from "../src/lib/deletion-receipt";
import { Button, Card, Message, Screen, ui } from "../src/components/ui";

// Deliberately available after logout. The private receipt is never displayed.
export default function CaptainDeletionStatus() {
  const [request, setRequest] = useState<AccountDeletionRequest | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true); setError("");
    try {
      const receipt = await readDeletionReceipt();
      if (!receipt) throw new Error("No Captain deletion receipt is saved on this device.");
      setRequest(await loadDeletionReceipt(receipt));
    } catch { setError("Could not check the saved deletion receipt. Try again later."); }
    finally { setBusy(false); }
  }
  useEffect(() => { void refresh(); }, []);
  return <Screen title="Permanent Captain deletion status">
    <Message error>{error}</Message>
    {request ? <Card>
      <Text style={ui.sectionTitle}>{request.status === "COMPLETED" ? "Permanent deletion completed" : request.status.replaceAll("_", " ")}</Text>
      <Text style={ui.muted}>Reference: {request.requestReference}</Text>
      <Text style={ui.muted}>Scope: {request.accountType === "COMPLETE_ACCOUNT" ? "Entire KariGO account" : "Captain role; other genuine roles preserved"}</Text>
      <Text style={ui.muted}>{request.timing}</Text>
      <Text style={ui.muted}>{request.retainedRecords}</Text>
      {request.completedAt ? <Text style={ui.muted}>Completed: {new Date(request.completedAt).toLocaleDateString()}</Text> : null}
    </Card> : null}
    <Button title={busy ? "Checking…" : "Refresh deletion status"} disabled={busy} onPress={() => void refresh()} />
  </Screen>;
}
