import { brand } from "@karigo/config";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { partnerApi, PartnerOrderDetail } from "../../src/api/partner.api";
import { AuthGate } from "../../src/components/auth-gate";
import { Badge, Card, Hero, LoadingState, MutedText, PrimaryButton, Screen } from "../../src/components/ui";
import { formatLabel, money, statusTone } from "../../src/lib/labels";

function OrderDetailContent() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const [order, setOrder] = useState<PartnerOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!orderId) {
      setError("Order reference is missing.");
      setLoading(false);
      return;
    }

    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      setOrder(await partnerApi.orderDetail(orderId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order detail could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState label="Loading order detail..." />;

  if (error || !order) {
    return (
      <Screen>
        <Hero eyebrow="Order detail" title="Order could not be loaded." subtitle={error ?? "Please return to Orders and try again."} />
        <PrimaryButton label="Retry" onPress={() => void load()} />
      </Screen>
    );
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
      <Hero
        eyebrow="Order detail"
        title={order.orderNumber}
        subtitle="Read-only order view for Partner mobile. Preparation actions remain controlled in Partner Workspace."
      />

      <Card>
        <View style={styles.row}>
          <Text style={styles.sectionTitle}>Status</Text>
          <Badge label={formatLabel(order.orderStatus)} tone={statusTone(order.orderStatus)} />
        </View>
        <MutedText>
          Payment: {formatLabel(order.paymentStatus)}
          {order.paymentMethod ? ` - ${formatLabel(order.paymentMethod)}` : ""}
        </MutedText>
        <MutedText>Created {new Date(order.createdAt).toLocaleString()}</MutedText>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Customer</Text>
        <Text style={styles.value}>{order.customer.name}</Text>
        <MutedText>{order.customer.phoneNumber}</MutedText>
        {order.deliveryAddress ? (
          <MutedText>
            {order.deliveryAddress.label}: {order.deliveryAddress.addressLine}, {order.deliveryAddress.city}, {order.deliveryAddress.state}
          </MutedText>
        ) : (
          <MutedText>Delivery address not available.</MutedText>
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Items</Text>
        {order.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemText}>
              <Text style={styles.value}>{item.productName}</Text>
              <MutedText>Qty {item.quantity} - {money(item.unitPrice)} each</MutedText>
              {item.specialInstruction ? <MutedText>Note: {item.specialInstruction}</MutedText> : null}
            </View>
            <Text style={styles.itemAmount}>{money(item.totalPrice)}</Text>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Totals</Text>
        <View style={styles.totalRow}>
          <MutedText>Subtotal</MutedText>
          <Text style={styles.totalValue}>{money(order.subtotal)}</Text>
        </View>
        <View style={styles.totalRow}>
          <MutedText>Delivery fee</MutedText>
          <Text style={styles.totalValue}>{money(order.deliveryFee)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.sectionTitle}>Total</Text>
          <Text style={styles.total}>{money(order.totalAmount)}</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Status history</Text>
        {order.statusHistory.length === 0 ? (
          <MutedText>No status history recorded yet.</MutedText>
        ) : (
          order.statusHistory.map((entry) => (
            <View key={entry.id} style={styles.historyRow}>
              <Badge label={formatLabel(entry.newStatus)} tone={statusTone(entry.newStatus)} />
              <MutedText>{new Date(entry.createdAt).toLocaleString()}</MutedText>
              {entry.note ? <MutedText>{entry.note}</MutedText> : null}
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

export default function OrderDetailScreen() {
  return (
    <AuthGate>
      <OrderDetailContent />
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
  sectionTitle: {
    color: brand.colors.charcoal,
    fontSize: 16,
    fontWeight: "900"
  },
  value: {
    color: brand.colors.charcoal,
    fontSize: 15,
    fontWeight: "800"
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: brand.colors.border,
    paddingTop: 12
  },
  itemText: {
    flex: 1,
    gap: 4
  },
  itemAmount: {
    color: brand.colors.charcoal,
    fontWeight: "900"
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  totalValue: {
    color: brand.colors.charcoal,
    fontWeight: "800"
  },
  total: {
    color: brand.colors.primary,
    fontSize: 18,
    fontWeight: "900"
  },
  historyRow: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: brand.colors.border,
    paddingTop: 12
  }
});
