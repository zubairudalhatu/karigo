import { useEffect, useState } from "react";
import { Text } from "react-native";
import type { AccountDeletionRequest } from "../src/api/account-deletion.api";
import { loadDeletionReceipt, readDeletionReceipt } from "../src/lib/deletion-receipt";
import { Button, Card, Message, Screen, ui } from "../src/components/ui";

// Available after sign-out; shows no identity, wallet or private receipt token.
export default function DeletionStatus() {
  const [request, setRequest] = useState<AccountDeletionRequest | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true); setError("");
    try {
      const receipt = await readDeletionReceipt();
      if (!receipt) throw new Error("No deletion receipt is saved on this device.");
      setRequest(await loadDeletionReceipt(receipt));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not check deletion status."); }
    finally { setBusy(false); }
  }
  useEffect(() => { void refresh(); }, []);
  return <Screen title="Account deletion status"><Message error>{error}</Message>
    {request ? <Card><Text style={ui.cardTitle}>{request.phase === "FAILED" ? "Cleanup needs review" : request.phase === "OVERDUE" ? "Deletion overdue — contact Support" : request.status.replaceAll("_", " ")}</Text>
      <Text style={ui.muted}>{request.message}</Text>
      <Text style={ui.muted}>Reference: {request.requestReference}</Text>
      {request.deadlineAt ? <Text style={ui.muted}>Completion deadline: {new Date(request.deadlineAt).toLocaleDateString()}</Text> : null}
      {request.completedAt ? <Text style={ui.muted}>Completed: {new Date(request.completedAt).toLocaleDateString()}</Text> : null}
    </Card> : null}
    <Button title={busy ? "Checking…" : "Refresh deletion status"} disabled={busy} onPress={() => void refresh()} />
  </Screen>;
}
