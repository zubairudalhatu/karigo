import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Order, ordersApi } from "../../src/api/orders.api";
import { paymentsApi } from "../../src/api/payments.api";
import { Button, Card, Loading, Message, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { pricingFromServer } from "../../src/lib/checkout-pricing";
import { friendlyError, money } from "../../src/lib/errors";
import {
  isExternalPaymentAuthorizationUrl,
  isMockAuthorizationUrl,
  openExternalPaymentAuthorization
} from "../../src/lib/payment-flow";

export default function OrderTracking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [deliveryOtp, setDeliveryOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [pendingPaymentReference, setPendingPaymentReference] = useState("");
  const [pendingAuthorizationUrl, setPendingAuthorizationUrl] = useState("");
  const load = () => ordersApi.detail(id).then(setOrder).catch((e) => setError(friendlyError(e)));

  useEffect(() => { void load(); }, [id]);
  useEffect(() => {
    setDeliveryOtp("");
    setOtpError("");
  }, [order?.id, order?.orderStatus]);

  async function pay() {
    if (!order) return;
    setBusy(true); setError("");
    try {
      const started = await paymentsApi.initiate({ orderId: order.id, amount: Number(order.totalAmount), paymentMethod: "card" });
      const authorizationUrl = started.authorization.authorizationUrl;
      if (isExternalPaymentAuthorizationUrl(authorizationUrl)) {
        setPendingPaymentReference(started.payment.transactionReference);
        setPendingAuthorizationUrl(authorizationUrl);
        setMessage("Paystack Test Mode checkout opened. Return to KariGO and tap Verify payment after completing payment.");
        await openExternalPaymentAuthorization(authorizationUrl);
        return;
      }
      if (authorizationUrl && !isMockAuthorizationUrl(authorizationUrl)) {
        throw new Error("Payment authorization link was not accepted.");
      }
      await verifyPayment(started.payment.transactionReference);
    } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  }

  async function verifyPayment(reference: string) {
    await paymentsApi.verify(reference);
    setPendingPaymentReference("");
    setPendingAuthorizationUrl("");
    setMessage("Payment successful. Your order is now being processed.");
    await load();
  }

  async function verifyPendingPayment() {
    if (!pendingPaymentReference) return;
    setBusy(true);
    setError("");
    try {
      await verifyPayment(pendingPaymentReference);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function reopenPaymentAuthorization() {
    if (!pendingAuthorizationUrl) return;
    setBusy(true);
    setError("");
    try {
      await openExternalPaymentAuthorization(pendingAuthorizationUrl);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function revealDeliveryOtp() {
    if (!order) return;
    setOtpLoading(true);
    setOtpError("");
    try {
      const result = await ordersApi.deliveryOtp(order.id);
      setDeliveryOtp(result.deliveryOtp);
    } catch (e) {
      setDeliveryOtp("");
      setOtpError(friendlyError(e));
    } finally {
      setOtpLoading(false);
    }
  }

  if (!order && !error) return <Loading label="Loading order..." />;

  const pricing = order ? pricingFromServer(order) : null;
  const canRevealDeliveryOtp = order ? ["ARRIVED_DESTINATION", "DELIVERED"].includes(order.orderStatus) : false;
  const groupedOtp = deliveryOtp ? `${deliveryOtp.slice(0, 3)} ${deliveryOtp.slice(3)}` : "";

  return <Protected><Screen title={order?.orderNumber ?? "Order details"}><Message>{message}</Message><Message error>{error}</Message>
    {order && pricing ? <>
      <Card><StatusBadge status={order.orderStatus} /><Text>Payment: {order.paymentStatus}</Text>{order.vendor ? <Text>{order.vendor.businessName}</Text> : null}</Card>
      <Card>
        <View style={ui.priceRow}><Text style={ui.priceLabel}>Cart subtotal:</Text><Text style={ui.priceValue}>{money(pricing.subtotal)}</Text></View>
        <View style={ui.priceRow}><Text style={ui.priceLabel}>Delivery fee:</Text><Text style={ui.priceValue}>{money(pricing.deliveryFee)}</Text></View>
        <View style={ui.priceRow}><Text style={ui.priceLabel}>Discount:</Text><Text style={ui.priceValue}>-{money(pricing.discountAmount)}</Text></View>
        <View style={ui.priceRow}><Text style={ui.sectionTitle}>Payable:</Text><Text style={ui.payable}>{money(pricing.payableAmount)}</Text></View>
      </Card>
      {order.paymentStatus === "PENDING" ? <>
        <Button title={busy ? "Preparing payment..." : `Continue to payment - ${money(order.totalAmount)}`} onPress={pay} disabled={busy || !!pendingPaymentReference} />
        {pendingPaymentReference ? <Card>
          <Text style={ui.cardTitle}>Payment authorization pending</Text>
          <Text style={ui.muted}>Complete the Paystack Test Mode checkout page, return to KariGO, then verify payment here. KariGO will only mark the order paid after backend verification.</Text>
          <Button title="Open payment page again" tone="muted" onPress={reopenPaymentAuthorization} disabled={busy} />
          <Button title={busy ? "Verifying payment..." : "Verify payment"} onPress={verifyPendingPayment} disabled={busy} />
        </Card> : null}
      </> : null}
      {order.items?.map((item) => <Card key={item.id}><Text>{item.productName} x {item.quantity}</Text><Text>{money(item.totalPrice)}</Text></Card>)}
      <Text style={ui.sectionTitle}>Order timeline</Text>{order.statusHistory.map((event) => <Card key={event.id}><StatusBadge status={event.newStatus} /><Text style={ui.muted}>{event.note || "Order updated"}</Text></Card>)}
      {canRevealDeliveryOtp ? <Card>
        <Text style={ui.cardTitle}>Delivery code</Text>
        <Text style={ui.muted}>Only share this code after you have received your order.</Text>
        <Message error>{otpError}</Message>
        {deliveryOtp ? <Text style={ui.otpCode}>{groupedOtp}</Text> : <Button title={otpLoading ? "Loading code..." : "Show delivery code"} onPress={revealDeliveryOtp} disabled={otpLoading} />}
        {otpError ? <Button tone="muted" title="Retry delivery code" onPress={revealDeliveryOtp} disabled={otpLoading} /> : null}
      </Card> : null}
      <Card><Text style={ui.cardTitle}>Delivery safety</Text><Text style={ui.muted}>Only share this code after you have received your order.</Text></Card>
    </> : null}
  </Screen></Protected>;
}
