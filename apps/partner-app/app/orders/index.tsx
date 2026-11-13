import { brand } from "@karigo/config";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { partnerApi, PartnerOrderSummary } from "../../src/api/partner.api";
import { authSessionStore } from "../../src/api/client";
import { AuthGate } from "../../src/components/auth-gate";
import { Badge, Card, EmptyState, Hero, LoadingState, MutedText, PrimaryButton, Screen } from "../../src/components/ui";
import { useAuth } from "../../src/contexts/auth-context";
import { formatLabel, money, statusTone } from "../../src/lib/labels";
import { OrderResource, orderGroup, orderGroups, OrderGroup } from "../../src/lib/order-operations";
import { useOrderResource } from "../../src/lib/use-order-resource";

function OrdersContent() {
  const router = useRouter(); const { user } = useAuth();
  const resource = useMemo(() => new OrderResource<PartnerOrderSummary[]>(partnerApi.orders, authSessionStore.currentGeneration), [user?.id]);
  const state = useOrderResource(resource);
  const [group, setGroup] = useState<OrderGroup | "All">("All");
  if (state.loading) return <LoadingState label="Loading Partner orders..." />;
  const orders = (state.data ?? []).filter(order => group === "All" || orderGroup(order.orderStatus) === group);
  return <Screen refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={() => void resource.reload()} />}>
    <Hero eyebrow="Orders" title="Partner orders" subtitle="Prepare your business orders and mark them ready for courier pickup." />
    <MutedText>{state.fresh ? "Showing server-confirmed orders." : "Orders may be out of date. Refresh with a connection before acting."}</MutedText>
    {state.error ? <Card><MutedText>{state.error}</MutedText><PrimaryButton label="Retry order refresh" onPress={() => void resource.reload()} /></Card> : null}
    <View style={styles.filters}>{(["All", ...orderGroups] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: group === value }} onPress={() => setGroup(value)} style={[styles.filter, group === value ? styles.selected : null]}><Text>{value}</Text></Pressable>)}</View>
    {!state.error && orders.length === 0 ? <EmptyState title="No orders in this group" body="Pull to refresh or choose another group. New, active and historical orders appear in their actual backend states." /> : null}
    {orders.map(order => <Pressable accessibilityRole="button" accessibilityLabel={`Open order ${order.orderNumber}`} key={order.id} onPress={() => router.push(`/orders/${order.id}`)}>
      <Card><View style={styles.row}><Text style={styles.title}>{order.orderNumber}</Text><Badge label={formatLabel(order.orderStatus)} tone={statusTone(order.orderStatus)} /></View>
        <MutedText>{order.customerName} - {order.itemsCount} item(s)</MutedText><Text style={styles.amount}>{money(order.totalAmount)}</Text>
        <MutedText>{new Date(order.createdAt).toLocaleString()} · Payment: {formatLabel(order.paymentStatus)}{order.paymentMethod ? ` - ${formatLabel(order.paymentMethod)}` : ""}</MutedText>
        <Text style={styles.hint}>Tap to view order detail</Text></Card>
    </Pressable>)}
  </Screen>;
}
export default function OrdersScreen() { return <AuthGate><OrdersContent /></AuthGate>; }
const styles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { flex: 1, color: brand.colors.charcoal, fontSize: 16, fontWeight: "900" }, amount: { color: brand.colors.charcoal, fontSize: 18, fontWeight: "900" },
  hint: { color: brand.colors.primary, fontSize: 13, fontWeight: "900" }, filters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filter: { padding: 12, borderRadius: 12, backgroundColor: "#F3F4F6" }, selected: { borderColor: brand.colors.primary, borderWidth: 2 } });
