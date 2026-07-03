import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { Order, ordersApi } from "../../src/api/orders.api";
import { paymentsApi } from "../../src/api/payments.api";
import { Button, Card, Loading, Message, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { pricingFromServer } from "../../src/lib/checkout-pricing";
import { friendlyError, money } from "../../src/lib/errors";

export default function OrderTracking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => ordersApi.detail(id).then(setOrder).catch((e) => setError(friendlyError(e)));

  useEffect(() => { void load(); }, [id]);

  async function pay() {
    if (!order) return;
    setBusy(true); setError("");
    try {
      const started = await paymentsApi.initiate({ orderId: order.id, amount: Number(order.totalAmount), paymentMethod: "mock" });
      await paymentsApi.verify(started.payment.transactionReference);
      setMessage("Payment successful. Your order is now being processed."); await load();
    } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  }

  if (!order && !error) return <Loading label="Loading order..." />;

  const pricing = order ? pricingFromServer(order) : null;

  return <Protected><Screen title={order?.orderNumber ?? "Order details"}><Message>{message}</Message><Message error>{error}</Message>
    {order && pricing ? <>
      <Card><StatusBadge status={order.orderStatus} /><Text>Payment: {order.paymentStatus}</Text>{order.vendor ? <Text>{order.vendor.businessName}</Text> : null}</Card>
      <Card>
        <Text>Cart subtotal: {money(pricing.subtotal)}</Text>
        <Text>Delivery fee: {money(pricing.deliveryFee)}</Text>
        <Text>Discount: -{money(pricing.discountAmount)}</Text>
        <Text style={ui.title}>Payable: {money(pricing.payableAmount)}</Text>
      </Card>
      {order.paymentStatus === "PENDING" ? <Button title={busy ? "Verifying..." : "Pay with mock provider"} onPress={pay} disabled={busy} /> : null}
      {order.items?.map((item) => <Card key={item.id}><Text>{item.productName} x {item.quantity}</Text><Text>{money(item.totalPrice)}</Text></Card>)}
      <Text style={ui.title}>Order timeline</Text>{order.statusHistory.map((event) => <Card key={event.id}><StatusBadge status={event.newStatus} /><Text style={ui.muted}>{event.note || "Order updated"}</Text></Card>)}
      <Card><Text style={ui.title}>Delivery safety</Text><Text style={ui.muted}>Do not share your delivery OTP until you have received your order.</Text></Card>
    </> : null}
  </Screen></Protected>;
}
