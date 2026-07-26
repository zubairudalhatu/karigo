import { brand } from "@karigo/config";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { partnerApi, PartnerOrderSummary } from "../../src/api/partner.api";
import { AuthGate } from "../../src/components/auth-gate";
import { Badge, Card, EmptyState, Hero, LoadingState, MutedText, Screen } from "../../src/components/ui";

function OrdersContent() {
  const [orders, setOrders] = useState<PartnerOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setOrders(await partnerApi.orders());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Orders could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState label="Loading Partner orders..." />;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
      <Hero eyebrow="Orders" title="Partner orders" subtitle="Review product seller orders and preparation states from mobile." />
      {error ? <MutedText>{error}</MutedText> : null}
      {orders.length === 0 ? (
        <EmptyState title="No orders yet" body="Orders will appear here when customers place product orders for this partner account." />
      ) : (
        orders.map((order) => (
          <Card key={order.id}>
            <View style={styles.row}>
              <Text style={styles.title}>{order.orderNumber}</Text>
              <Badge label={order.orderStatus} tone="info" />
            </View>
            <MutedText>{order.customerName} · {order.itemsCount} item(s)</MutedText>
            <Text style={styles.amount}>NGN {Number(order.totalAmount).toLocaleString()}</Text>
            <MutedText>Payment: {order.paymentStatus}{order.paymentMethod ? ` · ${order.paymentMethod}` : ""}</MutedText>
          </Card>
        ))
      )}
    </Screen>
  );
}

export default function OrdersScreen() {
  return (
    <AuthGate>
      <OrdersContent />
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  title: {
    flex: 1,
    color: brand.colors.charcoal,
    fontSize: 16,
    fontWeight: "900"
  },
  amount: {
    color: brand.colors.charcoal,
    fontSize: 18,
    fontWeight: "900"
  }
});
