import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { Address, addressesApi } from "../src/api/addresses.api";
import { Order, ordersApi } from "../src/api/orders.api";
import { paymentsApi } from "../src/api/payments.api";
import { promosApi } from "../src/api/promos.api";
import { Button, Card, Empty, Field, Message, Protected, Screen, ui } from "../src/components/ui";
import { useCart } from "../src/contexts/cart-context";
import { friendlyError, money } from "../src/lib/errors";

export default function Checkout() {
  const cart = useCart();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState("");
  const [promoCode, setPromo] = useState("");
  const [discount, setDiscount] = useState<number | string>(0);
  const [finalPayable, setFinal] = useState<number | string>(cart.subtotal);
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { addressesApi.list().then((list) => { setAddresses(list); setAddressId(list.find((a) => a.isDefault)?.id ?? list[0]?.id ?? ""); }).catch((e) => setError(friendlyError(e))); }, []);

  async function validatePromo() {
    if (!cart.vendor) return;
    try {
      const result = await promosApi.validate({ promoCode, vendorId: cart.vendor.id, serviceCategory: cart.serviceCategory, subtotal: cart.subtotal, deliveryFee: 1000 });
      setDiscount(result.discountAmount); setFinal(result.finalPayableAmount); setMessage(`Promo applied: ${money(result.discountAmount)} off.`);
    } catch (e) { setError(friendlyError(e)); }
  }
  async function createOrder() {
    if (!cart.vendor || !addressId) return;
    setBusy(true); setError("");
    try {
      const created = await ordersApi.create({ vendorId: cart.vendor.id, deliveryAddressId: addressId, serviceCategory: cart.serviceCategory, items: cart.items.map((i) => ({ productId: i.product.id, quantity: i.quantity })), promoCode: promoCode || undefined });
      setOrder(created); setDiscount(created.discountAmount); setFinal(created.totalAmount); setMessage("Your order has been created successfully.");
    } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  }
  async function pay() {
    if (!order) return;
    setBusy(true); setError("");
    try {
      const started = await paymentsApi.initiate({ orderId: order.id, amount: Number(order.totalAmount), paymentMethod: "mock" });
      await paymentsApi.verify(started.payment.transactionReference);
      cart.clear(); router.replace(`/orders/${order.id}`);
    } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  }
  if (!cart.items.length && !order) return <Protected><Screen title="Checkout"><Empty message="Your cart is empty." /></Screen></Protected>;
  return <Protected><Screen title="Checkout">
    {addresses.length === 0 ? <><Empty message="Add a delivery address before checkout." /><Button title="Add address" onPress={() => router.push("/addresses")} /></> :
      addresses.map((a) => <Button key={a.id} title={`${a.id === addressId ? "✓ " : ""}${a.label}: ${a.addressLine}`} tone="muted" onPress={() => setAddressId(a.id)} />)}
    <Field placeholder="Promo code (try KARIGOFIRST)" value={promoCode} onChangeText={setPromo} autoCapitalize="characters" />
    <Button title="Validate promo" tone="muted" onPress={validatePromo} disabled={!promoCode || !!order} />
    <Card><Text>Cart subtotal: {money(cart.subtotal)}</Text><Text>Server discount: {money(discount)}</Text><Text style={ui.title}>Payable: {money(finalPayable)}</Text></Card>
    <Message>{message}</Message><Message error>{error}</Message>
    {!order ? <Button title={busy ? "Creating order..." : "Create order"} onPress={createOrder} disabled={busy || !addressId} /> :
      <Button title={busy ? "Verifying payment..." : `Pay ${money(order.totalAmount)} with mock provider`} onPress={pay} disabled={busy} />}
  </Screen></Protected>;
}
