import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import type { UtilityTransactionSummary } from "@karigo/shared-types";
import { utilitiesApi } from "../../../src/api/utilities.api";
import { Button, Card, Loading, Message, Protected, Screen, StatusBadge, ui } from "../../../src/components/ui";
import { friendlyError } from "../../../src/lib/errors";

const moneyKobo = (value: number) => `NGN ${(value / 100).toLocaleString()}`;

export default function UtilityReceiptDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [transaction, setTransaction] = useState<UtilityTransactionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return <Protected><Screen title="Utility receipt">
    <Message error>{error}</Message>
    {loading ? <Loading label="Loading receipt..." /> : transaction ? <UtilityReceipt transaction={transaction} /> : null}
    {error ? <Button title="Retry receipt" tone="muted" onPress={load} /> : null}
  </Screen></Protected>;
}

function UtilityReceipt({ transaction }: { transaction: UtilityTransactionSummary }) {
  return <Card>
    <Text style={ui.cardTitle}>Utility review receipt</Text>
    <Text style={ui.muted}>Bills & Utilities is under provider review. No real airtime, data, electricity token or cable subscription was delivered from this build.</Text>
    <Text>Reference: {transaction.reference}</Text>
    <Text>Service: {transaction.serviceType.replace("_", " ")}</Text>
    <Text>Provider: {transaction.provider.name}</Text>
    {transaction.product ? <Text>Plan: {transaction.product.name}</Text> : null}
    <Text>Recipient: {transaction.recipient}</Text>
    <Text>Amount: {moneyKobo(transaction.amountKobo)}</Text>
    <Text>Fee: {moneyKobo(transaction.convenienceFeeKobo)}</Text>
    <Text>Total: {moneyKobo(transaction.totalKobo)}</Text>
    {transaction.mockToken ? <Text style={ui.otpCode}>{transaction.mockToken}</Text> : null}
    <StatusBadge status={transaction.status} />
    <Text style={ui.muted}>{new Date(transaction.createdAt).toLocaleString()}</Text>
  </Card>;
}
