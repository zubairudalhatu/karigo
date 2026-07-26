import { brand } from "@karigo/config";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { partnerApi, PartnerOrderSummary } from "../../src/api/partner.api";
import { AuthGate } from "../../src/components/auth-gate";
import { Badge, Card, EmptyState, Hero, LoadingState, MutedText, Screen } from "../../src/components/ui";
import { formatLabel, money, statusTone } from "../../src/lib/labels";

function OrdersContent() {
  const router = useRouter();
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open order ${order.orderNumber}`}
            key={order.id}
            onPress={() => router.push(`/orders/${order.id}`)}
          >
            <Card>
              <View style={styles.row}>
                <Text style={styles.title}>{order.orderNumber}</Text>
                <Badge label={formatLabel(order.orderStatus)} tone={statusTone(order.orderStatus)} />
              </View>
              <MutedText>{order.customerName} - {order.itemsCount} item(s)</MutedText>
              <Text style={styles.amount}>{money(order.totalAmount)}</Text>
              <MutedText>
                Payment: {formatLabel(order.paymentStatus)}
                {order.paymentMethod ? ` - ${formatLabel(order.paymentMethod)}` : ""}
              </MutedText>
              <Text style={styles.openHint}>Tap to view order detail</Text>
            </Card>
          </Pressable>
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
  },
  openHint: {
    color: brand.colors.primary,
    fontSize: 13,
    fontWeight: "900"
  }
});
