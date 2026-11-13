import { useLocalSearchParams } from "expo-router";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";
import type { PartnerOrderRejectionReason } from "@karigo/shared-types";
import { partnerOrderRejectionReasons } from "@karigo/shared-types";
import { partnerApi } from "../../src/api/partner.api";
import { authSessionStore } from "../../src/api/client";
import { AuthGate } from "../../src/components/auth-gate";
import { Badge, Card, Hero, LoadingState, MutedText, PrimaryButton, Screen, TextField } from "../../src/components/ui";
import { useAuth } from "../../src/contexts/auth-context";
import { formatLabel, money, statusTone } from "../../src/lib/labels";
import { availableOrderActions, confirmOrderAction, OrderConfirmation, OrderOperations, notifyPartnerOrderChanged } from "../../src/lib/order-operations";
import { useOrderResource } from "../../src/lib/use-order-resource";
import { partnerOrderId } from "../../src/lib/order-push";

const labels = { accept: "Accept order", reject: "Reject order", preparing: "Start preparing", ready: "Mark ready for pickup" };
function OrderDetailContent({ id }: { id: string }) {
  const { user } = useAuth();
  const model = useMemo(() => new OrderOperations(id, { detail: partnerApi.orderDetail, mutate: partnerApi.orderAction }, authSessionStore.currentGeneration, notifyPartnerOrderChanged), [id, user?.id]);
  const state = useOrderResource(model.resource, id);
  const operation = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(null);
  const [reason, setReason] = useState<PartnerOrderRejectionReason>("ITEM_UNAVAILABLE");
  const [details, setDetails] = useState("");
  if (state.loading) return <LoadingState label="Loading order detail..." />;
  const order = state.data;
  if (!order) return <Screen><Hero eyebrow="Order detail" title="Order unavailable" subtitle={state.error || "Please return to Orders and try again."} /><PrimaryButton label="Retry" onPress={() => void model.resource.reload()} /></Screen>;
  const actions = state.fresh ? availableOrderActions(order) : [];
  async function confirm() {
    if (!confirmation) return;
    await model.perform(confirmation, reason, details); setConfirmation(null); setDetails("");
  }
  return <Screen refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={() => void model.resource.reload()} />}>
    <Hero eyebrow="Order detail" title={order.orderNumber} subtitle="Manage preparation for this business. Courier handoff and delivery completion are handled separately." />
    {state.error ? <MutedText>{state.error}</MutedText> : null}
    {!state.fresh ? <Card><MutedText>Read-only until a connected refresh succeeds. No order changes are queued offline.</MutedText><PrimaryButton label="Refresh current order" disabled={operation.busy} onPress={() => void model.resource.reload()} /></Card> : null}
    <Card><Badge label={formatLabel(order.orderStatus)} tone={statusTone(order.orderStatus)} /><MutedText>Created {new Date(order.createdAt).toLocaleString()}</MutedText>
      <MutedText>Payment: {formatLabel(order.paymentStatus)}{order.paymentMethod ? ` - ${formatLabel(order.paymentMethod)}` : ""}</MutedText>
      {order.paymentMethod === "CASH_ON_DELIVERY" ? <MutedText>Cash collection: {formatLabel(order.cashCollectionStatus)}. Do not treat this as electronically paid.</MutedText> : null}
      <MutedText>Preparation → ready for courier pickup. Marking ready does not hand over, dispatch or complete the order.</MutedText></Card>
    <Card><Text>Fulfilment details</Text><MutedText>{order.customer.name} · {order.customer.phoneNumber}</MutedText>
      {order.deliveryAddress ? <MutedText>Delivery area: {order.deliveryAddress.city}, {order.deliveryAddress.state}</MutedText> : <MutedText>Delivery area not provided.</MutedText>}
      {order.customerNote ? <MutedText>Customer note: {order.customerNote}</MutedText> : null}</Card>
    <Card><Text>Items</Text>{order.items.map(item => <View key={item.id} style={{ paddingVertical: 8 }}><Text>{item.quantity} × {item.productName}</Text>
      <MutedText>{money(item.unitPrice)} each · {money(item.totalPrice)}</MutedText>{item.specialInstruction ? <MutedText>Preparation note: {item.specialInstruction}</MutedText> : null}</View>)}</Card>
    <Card><Text>Totals</Text><MutedText>Subtotal: {money(order.subtotal)}</MutedText><MutedText>Delivery fee: {money(order.deliveryFee)}</MutedText>
      <MutedText>Service fee: {money(order.serviceFee)} · Discount: {money(order.discountAmount)}</MutedText><Text>Total: {money(order.totalAmount)}</Text></Card>
    <Card><Text>Available merchant actions</Text>
      {actions.map(action => <PrimaryButton key={action} label={labels[action]} disabled={operation.busy || state.refreshing} onPress={() => setConfirmation(confirmOrderAction(order, action))} variant={action === "reject" ? "secondary" : "primary"} />)}
      {state.fresh && actions.length === 0 ? <MutedText>No merchant transition is available at this stage. Completed/cancelled orders remain history only.</MutedText> : null}
      {confirmation ? <View style={{ gap: 12 }}><Text>Confirm: {labels[confirmation.action]}</Text>
        <MutedText>{confirmation.action === "reject" ? "Reject this order? A successful payment will require refund review; no refund is executed here." : confirmation.action === "ready" ? "Confirm all ordered items are prepared and ready for pickup. This does not confirm courier handoff." : "The current server status will be checked before saving."}</MutedText>
        {confirmation.action === "reject" ? <><Text>Business reason</Text>{order.rejectionReasons.filter(value => partnerOrderRejectionReasons.includes(value)).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: reason === value }} disabled={operation.busy} onPress={() => setReason(value)} style={{ padding: 12 }}><Text>{reason === value ? "● " : "○ "}{formatLabel(value)}</Text></Pressable>)}
          <TextField label="Optional business note (no customer secrets, payment details or diagnostic logs)" value={details} onChangeText={setDetails} multiline maxLength={500} editable={!operation.busy} />
          <MutedText>{details.length}/500</MutedText></> : null}
        <PrimaryButton label={operation.busy ? "Checking / saving..." : `Confirm ${labels[confirmation.action].toLowerCase()}`} disabled={operation.busy || !state.fresh} onPress={() => void confirm()} />
        <PrimaryButton label="Cancel action" variant="secondary" disabled={operation.busy} onPress={() => setConfirmation(null)} /></View> : null}
      {operation.message ? <MutedText>{operation.message}</MutedText> : null}</Card>
    <Card><Text>Status history</Text>{order.statusHistory.length === 0 ? <MutedText>No status history recorded yet.</MutedText> : order.statusHistory.map(entry => <View key={entry.id} style={{ paddingVertical: 8 }}>
      <Badge label={formatLabel(entry.newStatus)} tone={statusTone(entry.newStatus)} /><MutedText>{new Date(entry.createdAt).toLocaleString()} · {formatLabel(entry.changedByRole)}</MutedText>{entry.note ? <MutedText>{entry.note}</MutedText> : null}</View>)}</Card>
  </Screen>;
}
export default function OrderDetailScreen() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  if (!partnerOrderId(orderId)) return <Screen><Hero title="Invalid order reference" subtitle="Return to Orders and choose a valid order." /></Screen>;
  return <AuthGate><OrderDetailContent key={orderId} id={orderId} /></AuthGate>;
}
