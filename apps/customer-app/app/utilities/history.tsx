import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text } from "react-native";
import type { UtilityTransactionSummary } from "@karigo/shared-types";
import { utilitiesApi } from "../../src/api/utilities.api";
import { Card, Empty, Loading, Message, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";

const moneyKobo = (value: number) => `NGN ${(value / 100).toLocaleString()}`;

export default function UtilityHistory() {
  const [transactions, setTransactions] = useState<UtilityTransactionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    setRefreshing(true);
    try {
      setTransactions(await utilitiesApi.mine());
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return <Protected><Screen title="Utility history" refreshing={refreshing} onRefresh={load}>
    <Message error>{error}</Message>
    {loading ? <Loading label="Loading utility transactions..." /> : transactions.length === 0 ? <Empty message="No utility transactions yet." /> :
      transactions.map((transaction) => <Pressable key={transaction.id} onPress={() => router.push(`/utilities/transactions/${transaction.id}`)} accessibilityRole="button" accessibilityLabel={`Open receipt ${transaction.reference}`}>
        <Card>
          <Text style={ui.cardTitle}>{transaction.provider.name}</Text>
          <Text style={ui.muted}>{transaction.reference}</Text>
          <Text>{transaction.serviceType.replace("_", " ")} · {moneyKobo(transaction.totalKobo)}</Text>
          <StatusBadge status={transaction.status} />
        </Card>
      </Pressable>)}
  </Screen></Protected>;
}
