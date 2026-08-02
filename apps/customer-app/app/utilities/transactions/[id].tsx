import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Text } from "react-native";
import type { UtilityTransactionSummary } from "@karigo/shared-types";
import { utilitiesApi } from "../../../src/api/utilities.api";
import { walletApi } from "../../../src/api/wallet.api";
import { Button, Card, Loading, Message, Protected, Screen, StatusBadge, ui } from "../../../src/components/ui";
import { friendlyError } from "../../../src/lib/errors";

const moneyKobo = (value: number) => `\u20A6${(value / 100).toLocaleString()}`;

function receiptMessage(transaction: UtilityTransactionSummary) {
  if (transaction.status === "CANCELLED" && (transaction.walletReversalReference || transaction.walletDebitStatus === "REVERSED")) {
    return "This utility request was cancelled and your wallet has been reversed.";
  }
  if (transaction.walletReversalReference || transaction.walletDebitStatus === "REVERSED") {
    return "This utility request failed and your wallet has been reversed.";
  }
  if (transaction.status === "CANCELLED") {
    return "This utility request was cancelled before fulfilment. If your wallet was debited, KariGO will confirm the reversal status.";
  }
  if (transaction.status === "SUCCESSFUL") {
    return "Your utility request was successful.";
  }
  if (transaction.status === "FAILED") {
    return "This utility request failed. If your wallet was debited, KariGO will reverse it automatically.";
  }
  if (transaction.status === "PENDING" || transaction.status === "PROCESSING") {
    return "Your request is being processed. KariGO will confirm once the provider completes fulfilment.";
  }
  return transaction.testMode
    ? "This request is queued for KariGO provider verification."
    : "Your request is being processed. KariGO will confirm once the provider completes fulfilment.";
}

const cancellableStatuses = new Set(["DRAFT", "PENDING"]);

export default function UtilityReceiptDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [transaction, setTransaction] = useState<UtilityTransactionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = () => {
    if (!id) return;
    setLoading(true);
    setError("");
    utilitiesApi.detail(id)
      .then(setTransaction)
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  async function cancelRequest() {
    if (!transaction || cancelling) return;
    Alert.alert(
      "Cancel this utility request?",
      "This request can only be cancelled if it has not reached a terminal or irreversible provider state. When applicable, the debited amount will be returned to your KariGO Wallet according to the transaction status.",
      [
        { text: "Keep request", style: "cancel" },
        {
          text: "Cancel request",
          style: "destructive",
          onPress: async () => {
            try {
              setCancelling(true);
              setError("");
              setMessage("");
              const cancelled = await utilitiesApi.cancel(transaction.id);
              setTransaction(cancelled);
              await walletApi.summary().catch(() => undefined);
              setMessage("Utility cancellation request updated. Receipt refreshed.");
            } catch (e) {
              setError(friendlyError(e));
              load();
            } finally {
              setCancelling(false);
            }
          }
        }
      ]
    );
  }

  return <Protected><Screen title="Utility receipt">
    <Message>{message}</Message>
    <Message error>{error}</Message>
    {loading ? <Loading label="Loading receipt..." /> : transaction ? <UtilityReceipt transaction={transaction} onCancel={cancelRequest} cancelling={cancelling} /> : null}
    {error ? <Button title="Retry receipt" tone="muted" onPress={load} /> : null}
  </Screen></Protected>;
}

function UtilityReceipt({ transaction, onCancel, cancelling }: { transaction: UtilityTransactionSummary; onCancel: () => void; cancelling: boolean }) {
  const canCancel = cancellableStatuses.has(transaction.status);
  return <Card>
    <Text style={ui.cardTitle}>{transaction.testMode ? "Utility review receipt" : "Utility request receipt"}</Text>
    <Text style={ui.muted}>{receiptMessage(transaction)}</Text>
    <Text>Reference: {transaction.reference}</Text>
    <Text>Service: {transaction.serviceType.replace("_", " ")}</Text>
    <Text>Provider: {transaction.provider.name}</Text>
    {transaction.product ? <Text>Plan: {transaction.product.name}</Text> : null}
    <Text>Recipient: {transaction.recipient}</Text>
    <Text>Amount: {moneyKobo(transaction.amountKobo)}</Text>
    <Text>Fee: {moneyKobo(transaction.convenienceFeeKobo)}</Text>
    <Text>Total: {moneyKobo(transaction.totalKobo)}</Text>
    {transaction.walletDebitReference ? <Text>Wallet debit: {transaction.walletDebitReference}</Text> : null}
    {transaction.walletReversalReference ? <Text>Wallet reversal: {transaction.walletReversalReference}</Text> : null}
    {transaction.mockToken ? <Text style={ui.otpCode}>{transaction.mockToken}</Text> : null}
    <StatusBadge status={transaction.status} />
    {canCancel ? <>
      <Text style={ui.muted}>Cancellation is available only before provider fulfilment becomes irreversible. Wallet reversal, where applicable, is handled through your KariGO Wallet ledger.</Text>
      <Button title={cancelling ? "Cancelling..." : "Cancel utility request"} tone="danger" onPress={onCancel} disabled={cancelling} />
    </> : null}
    <Text style={ui.muted}>{new Date(transaction.createdAt).toLocaleString()}</Text>
  </Card>;
}
