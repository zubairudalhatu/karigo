import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import type { CustomerTestPaymentProvider, PublicPaymentConfig } from "@karigo/shared-types";
import { Order, ordersApi } from "../../src/api/orders.api";
import { paymentsApi } from "../../src/api/payments.api";
import { Button, Card, Loading, Message, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { pricingFromServer } from "../../src/lib/checkout-pricing";
import { friendlyError, money } from "../../src/lib/errors";
import {
  isExternalPaymentAuthorizationUrl,
  isMockAuthorizationUrl,
  openExternalPaymentUrl,
  paymentAuthorizationUrlFrom
} from "../../src/lib/payment-flow";
import {
  customerPaymentProviderOptions,
  defaultCustomerPaymentProvider,
  defaultCustomerPaymentProviderForConfig,
  fallbackCustomerPaymentConfig,
  isSquadLivePaymentConfig,
  paymentSafetyNoteForConfig,
  paymentProviderLabel,
  paymentInitializationFailureMessage,
  paymentProviderSelectionBodyForConfig,
  paymentProviderSelectionTitleForConfig,
  paymentProviderSensitiveDataNoteForConfig,
  paymentAuthorizationOpenedMessage,
  paymentStatusViewForConfig,
  paymentVerificationFailureMessage,
  pendingAuthorizationCopy,
  walletRefundFutureNote
} from "../../src/lib/payment-status";

export default function OrderTracking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [deliveryOtp, setDeliveryOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [selectedPaymentProvider, setSelectedPaymentProvider] = useState<CustomerTestPaymentProvider>(defaultCustomerPaymentProvider);
  const [pendingPaymentReference, setPendingPaymentReference] = useState("");
  const [pendingAuthorizationUrl, setPendingAuthorizationUrl] = useState("");
  const [pendingPaymentProvider, setPendingPaymentProvider] = useState("");
  const [paymentConfig, setPaymentConfig] = useState<PublicPaymentConfig | null>(null);
  const [paymentConfigLoading, setPaymentConfigLoading] = useState(false);
  const [paymentConfigError, setPaymentConfigError] = useState("");
  const load = () => ordersApi.detail(id).then(setOrder).catch((e) => setError(friendlyError(e)));
  const effectivePaymentConfig = paymentConfig ?? fallbackCustomerPaymentConfig;
  const paymentProviderOptions = useMemo(
    () => customerPaymentProviderOptions(effectivePaymentConfig),
    [effectivePaymentConfig]
  );
  const paymentConfigReady = !!paymentConfig && !paymentConfigLoading && !paymentConfigError;
  const paymentProviderAvailable = paymentConfigReady && paymentProviderOptions.length > 0;

  useEffect(() => { void load(); }, [id]);
  useEffect(() => {
    setDeliveryOtp("");
    setOtpError("");
  }, [order?.id, order?.orderStatus]);
  useEffect(() => { void loadPaymentConfig(); }, []);

  async function loadPaymentConfig() {
    setPaymentConfigLoading(true);
    setPaymentConfigError("");
    try {
      const nextConfig = await paymentsApi.publicConfig();
      setPaymentConfig(nextConfig);
      const nextDefault = defaultCustomerPaymentProviderForConfig(nextConfig);
      const nextOptions = customerPaymentProviderOptions(nextConfig);
      setSelectedPaymentProvider((current) =>
        nextOptions.some((option) => option.value === current) ? current : nextDefault
      );
    } catch {
      setPaymentConfig(null);
      setPaymentConfigError("Payment provider could not be loaded. Please retry before continuing.");
    } finally {
      setPaymentConfigLoading(false);
    }
  }

  async function pay() {
    if (!order) return;
    if (!paymentProviderAvailable) {
      setError("Payment provider is not ready yet. Please retry payment provider setup.");
      return;
    }
    setBusy(true); setError("");
    try {
      const started = await paymentsApi.initiate({
        orderId: order.id,
        amount: Number(order.totalAmount),
        paymentMethod: selectedPaymentProvider === "mock" ? "mock" : "card",
        paymentProvider: selectedPaymentProvider
      });
      const authorizationUrl = paymentAuthorizationUrlFrom(started.authorization);
      const startedProvider = started.payment.gateway ?? selectedPaymentProvider;
      const startedProviderLabel = paymentProviderLabel(startedProvider, effectivePaymentConfig);
      if (isExternalPaymentAuthorizationUrl(authorizationUrl)) {
        await openExternalPaymentUrl(authorizationUrl);
        setPendingPaymentReference(started.payment.transactionReference);
        setPendingAuthorizationUrl(authorizationUrl);
        setPendingPaymentProvider(startedProvider);
        setMessage(paymentAuthorizationOpenedMessage(startedProviderLabel, effectivePaymentConfig));
        return;
      }
      if (isMockAuthorizationUrl(authorizationUrl)) {
        await verifyPayment(started.payment.transactionReference);
        return;
      }
      if (!authorizationUrl) {
        throw new Error("Payment provider did not return a checkout link.");
      }
      throw new Error("Payment provider returned an invalid checkout link.");
    } catch (e) { setError(paymentInitializationFailureMessage(selectedProviderLabel, friendlyError(e), effectivePaymentConfig)); } finally { setBusy(false); }
  }

  async function verifyPayment(reference: string) {
    await paymentsApi.verify(reference);
    setPendingPaymentReference("");
    setPendingAuthorizationUrl("");
    setPendingPaymentProvider("");
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
      setError(paymentVerificationFailureMessage(friendlyError(e)));
    } finally {
      setBusy(false);
    }
  }

  async function reopenPaymentAuthorization() {
      if (!pendingAuthorizationUrl) return;
    setBusy(true);
    setError("");
    try {
      await openExternalPaymentUrl(pendingAuthorizationUrl);
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
  const paymentView = paymentStatusViewForConfig(order?.paymentStatus, effectivePaymentConfig);
  const selectedProviderLabel = paymentProviderLabel(selectedPaymentProvider, effectivePaymentConfig);
  const pendingProviderLabel = paymentProviderLabel(pendingPaymentProvider || selectedPaymentProvider, effectivePaymentConfig);
  const pendingView = pendingAuthorizationCopy(pendingProviderLabel);
  const liveSquadMode = isSquadLivePaymentConfig(effectivePaymentConfig);
  const paymentButtonTitle = liveSquadMode
    ? `Pay with Squad - ${money(order?.totalAmount ?? 0)}`
    : `Continue with ${selectedProviderLabel} - ${money(order?.totalAmount ?? 0)}`;

  return <Protected><Screen title={order?.orderNumber ?? "Order details"}><Message>{message}</Message><Message error>{error}</Message>
    {order && pricing ? <>
      <Card><StatusBadge status={order.orderStatus} />{order.vendor ? <Text>{order.vendor.businessName}</Text> : null}</Card>
      <Card>
        <Text style={ui.cardTitle}>{paymentView.title}</Text>
        <StatusBadge status={order.paymentStatus} />
        <Text style={ui.cardText}>{paymentView.body}</Text>
        <Text style={ui.muted}>{paymentView.actionHint}</Text>
        <Text style={ui.muted}>{paymentSafetyNoteForConfig(effectivePaymentConfig)}</Text>
      </Card>
      {order.paymentMethod ? <Card>
        <Text style={ui.cardTitle}>Payment method</Text>
        <Text style={ui.cardText}>{order.paymentMethod === "CASH_ON_DELIVERY" ? "Pay on Delivery" : order.paymentMethod === "WALLET" ? "KariGO Wallet" : "Squad by GTBank"}</Text>
        {order.paymentMethod === "CASH_ON_DELIVERY" ? <>
          <Text style={ui.muted}>Cash status: {order.cashCollectionStatus?.replaceAll("_", " ").toLowerCase() ?? "pending collection"}</Text>
          <Text style={ui.muted}>Please pay only the amount shown in the app. Amount due: {money(order.totalAmount)}.</Text>
          {order.cashCollectedAt ? <Text style={ui.muted}>Cash collection recorded: {new Date(order.cashCollectedAt).toLocaleString()}</Text> : null}
          {order.cashReconciledAt ? <Text style={ui.muted}>Cash reconciliation recorded: {new Date(order.cashReconciledAt).toLocaleString()}</Text> : null}
        </> : null}
      </Card> : null}
      <Card>
        <View style={ui.priceRow}><Text style={ui.priceLabel}>Cart subtotal:</Text><Text style={ui.priceValue}>{money(pricing.subtotal)}</Text></View>
        <View style={ui.priceRow}><Text style={ui.priceLabel}>Delivery fee:</Text><Text style={ui.priceValue}>{money(pricing.deliveryFee)}</Text></View>
        <View style={ui.priceRow}><Text style={ui.priceLabel}>Discount:</Text><Text style={ui.priceValue}>-{money(pricing.discountAmount)}</Text></View>
        <View style={ui.priceRow}><Text style={ui.sectionTitle}>Payable:</Text><Text style={ui.payable}>{money(pricing.payableAmount)}</Text></View>
      </Card>
      {order.paymentStatus === "PENDING" ? <>
        {paymentConfigLoading ? <Message>Loading payment provider...</Message> : null}
        {paymentConfigError ? <><Message error>{paymentConfigError}</Message><Button title="Retry payment provider" tone="muted" onPress={loadPaymentConfig} disabled={paymentConfigLoading || busy} /></> : null}
        {paymentConfigReady ? <Card>
          <Text style={ui.cardTitle}>{paymentProviderSelectionTitleForConfig(effectivePaymentConfig)}</Text>
          <Text style={ui.cardText}>{paymentProviderSelectionBodyForConfig(effectivePaymentConfig)}</Text>
          {paymentProviderOptions.map((option) => (
            <View key={option.value}>
              <Button
                title={`${selectedPaymentProvider === option.value ? "Selected - " : ""}${option.title}`}
                tone={selectedPaymentProvider === option.value ? "primary" : "muted"}
                onPress={() => {
                  setSelectedPaymentProvider(option.value);
                  setMessage("");
                  setError("");
                }}
                disabled={busy || !!pendingPaymentReference}
              />
              <Text style={ui.muted}>{option.description}</Text>
            </View>
          ))}
          {paymentProviderOptions.length === 0 ? <Text style={ui.muted}>No customer payment provider is currently available. Please contact KariGO support.</Text> : null}
          <Text style={ui.muted}>{paymentProviderSensitiveDataNoteForConfig(effectivePaymentConfig)}</Text>
        </Card> : null}
        <Button title={busy ? "Preparing payment..." : paymentButtonTitle} onPress={pay} disabled={busy || !!pendingPaymentReference || !paymentProviderAvailable} />
        {pendingPaymentReference ? <Card>
          <Text style={ui.cardTitle}>{pendingView.title}</Text>
          <Text style={ui.cardText}>{pendingView.body}</Text>
          <Text style={ui.muted}>{pendingView.actionHint}</Text>
          <Text style={ui.muted}>{paymentProviderSensitiveDataNoteForConfig(effectivePaymentConfig)}</Text>
          <Button title="Open payment page again" tone="muted" onPress={reopenPaymentAuthorization} disabled={busy} />
          <Button title={busy ? "Verifying payment..." : "Verify payment status"} onPress={verifyPendingPayment} disabled={busy} />
        </Card> : null}
      </> : null}
      <Card>
        <Text style={ui.cardTitle}>Wallet and refunds</Text>
        <Text style={ui.muted}>{effectivePaymentConfig.walletPaymentNote ?? walletRefundFutureNote}</Text>
        <Text style={ui.muted}>Wallet top-up via Squad: {effectivePaymentConfig.walletTopUpEnabled ? "Available through the wallet screen; balance is credited only after backend verification." : "Not active yet."}</Text>
        <Text style={ui.muted}>Pay from wallet: {effectivePaymentConfig.walletPaymentsEnabled ? "Available when your balance covers the full order total." : "Not active yet."}</Text>
      </Card>
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
