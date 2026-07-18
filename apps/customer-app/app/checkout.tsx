import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import type { CheckoutQuote, CustomerTestPaymentProvider, PublicPaymentConfig } from "@karigo/shared-types";
import { Address, addressesApi } from "../src/api/addresses.api";
import { Order, ordersApi } from "../src/api/orders.api";
import { paymentsApi } from "../src/api/payments.api";
import { Button, Card, Empty, Field, Message, Protected, Screen, StatusBadge, ui } from "../src/components/ui";
import { useCart } from "../src/contexts/cart-context";
import { pricingFromServer } from "../src/lib/checkout-pricing";
import { friendlyError, money } from "../src/lib/errors";
import {
  isExternalPaymentAuthorizationUrl,
  isMockAuthorizationUrl,
  openExternalPaymentAuthorization
} from "../src/lib/payment-flow";
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
} from "../src/lib/payment-status";
import { promoErrorMessage } from "../src/lib/promo-state";

export default function Checkout() {
  const cart = useCart();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState("");
  const [promoCode, setPromo] = useState("");
  const [validPromoCode, setValidPromoCode] = useState("");
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedPaymentProvider, setSelectedPaymentProvider] = useState<CustomerTestPaymentProvider>(defaultCustomerPaymentProvider);
  const [pendingPaymentReference, setPendingPaymentReference] = useState("");
  const [pendingAuthorizationUrl, setPendingAuthorizationUrl] = useState("");
  const [pendingPaymentProvider, setPendingPaymentProvider] = useState("");
  const [paymentConfig, setPaymentConfig] = useState<PublicPaymentConfig | null>(null);
  const [paymentConfigLoading, setPaymentConfigLoading] = useState(false);
  const [paymentConfigError, setPaymentConfigError] = useState("");

  const items = useMemo(() => cart.items.map((i) => ({ productId: i.product.id, quantity: i.quantity })), [cart.items]);
  const effectivePaymentConfig = paymentConfig ?? fallbackCustomerPaymentConfig;
  const paymentProviderOptions = useMemo(
    () => customerPaymentProviderOptions(effectivePaymentConfig),
    [effectivePaymentConfig]
  );
  const paymentConfigReady = !!paymentConfig && !paymentConfigLoading && !paymentConfigError;
  const paymentProviderAvailable = paymentConfigReady && paymentProviderOptions.length > 0;
  const quoteKey = useMemo(() => JSON.stringify({
    vendorId: cart.vendor?.id,
    addressId,
    serviceCategory: cart.serviceCategory,
    items,
    validPromoCode
  }), [addressId, cart.serviceCategory, cart.vendor?.id, items, validPromoCode]);

  useEffect(() => {
    addressesApi.list()
      .then((list) => {
        setAddresses(list);
        setAddressId(list.find((a) => a.isDefault)?.id ?? list[0]?.id ?? "");
      })
      .catch((e) => setError(friendlyError(e)));
  }, []);

  const loadPaymentConfig = useCallback(async () => {
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
  }, []);

  useEffect(() => { void loadPaymentConfig(); }, [loadPaymentConfig]);

  const loadQuote = useCallback(async (promo: string, options?: { promoAttempt?: boolean; keepUiError?: boolean }) => {
    if (!cart.vendor || !addressId || !cart.items.length) {
      setQuote(null);
      setQuoteError("");
      return null;
    }

    setQuote(null);
    setQuoteLoading(true);
    setQuoteError("");
    if (!options?.keepUiError) setError("");

    try {
      const nextQuote = await ordersApi.quote({
        vendorId: cart.vendor.id,
        deliveryAddressId: addressId,
        serviceCategory: cart.serviceCategory,
        items,
        promoCode: promo || undefined
      });
      setQuote(nextQuote);
      if (options?.promoAttempt) {
        setValidPromoCode(nextQuote.promoCode || promo);
        setMessage(`Promo applied: ${money(nextQuote.discountAmount)} off.`);
      }
      return nextQuote;
    } catch (e) {
      setQuote(null);
      if (options?.promoAttempt) {
        setValidPromoCode("");
        setMessage("");
        setError(promoErrorMessage(e));
      } else {
        setQuoteError(friendlyError(e));
      }
      return null;
    } finally {
      setQuoteLoading(false);
    }
  }, [addressId, cart.items.length, cart.serviceCategory, cart.vendor, items]);

  useEffect(() => { void loadQuote(validPromoCode); }, [quoteKey, loadQuote, validPromoCode]);
  useFocusEffect(useCallback(() => { void loadQuote(validPromoCode); }, [loadQuote, validPromoCode]));

  async function validatePromo() {
    if (!cart.vendor) return;
    const code = promoCode.trim().toUpperCase();
    setError("");
    setMessage("");
    setValidPromoCode("");
    const quoted = await loadQuote(code, { promoAttempt: true });
    if (!quoted) {
      await loadQuote("", { keepUiError: true });
    }
  }

  async function createOrder() {
    if (!cart.vendor || !addressId) return;
    if (!quote || quoteLoading || quoteError) {
      setError("Please refresh the delivery total before creating your order.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const created = await ordersApi.create({
        vendorId: cart.vendor.id,
        deliveryAddressId: addressId,
        serviceCategory: cart.serviceCategory,
        items,
        promoCode: validPromoCode || undefined
      });
      setOrder(created);
      setQuote({
        quoteReference: created.orderNumber,
        cartSubtotal: Number(created.subtotal),
        deliveryFee: Number(created.deliveryFee),
        discountAmount: Number(created.discountAmount),
        finalPayableAmount: Number(created.totalAmount),
        promoCode: validPromoCode || undefined,
        createdAt: new Date().toISOString()
      });
      setMessage("Your order has been created successfully.");
    } catch (e) {
      setValidPromoCode("");
      setQuote(null);
      setError(promoErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    if (!order) return;
    if (!paymentProviderAvailable) {
      setError("Payment provider is not ready yet. Please retry payment provider setup.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const started = await paymentsApi.initiate({
        orderId: order.id,
        amount: Number(order.totalAmount),
        paymentMethod: selectedPaymentProvider === "mock" ? "mock" : "card",
        paymentProvider: selectedPaymentProvider
      });
      const authorizationUrl = started.authorization.authorizationUrl;
      const startedProvider = started.payment.gateway ?? selectedPaymentProvider;
      const startedProviderLabel = paymentProviderLabel(startedProvider, effectivePaymentConfig);
      if (isExternalPaymentAuthorizationUrl(authorizationUrl)) {
        setPendingPaymentReference(started.payment.transactionReference);
        setPendingAuthorizationUrl(authorizationUrl);
        setPendingPaymentProvider(startedProvider);
        setMessage(paymentAuthorizationOpenedMessage(startedProviderLabel, effectivePaymentConfig));
        await openExternalPaymentAuthorization(authorizationUrl);
        return;
      }
      if (authorizationUrl && !isMockAuthorizationUrl(authorizationUrl)) {
        throw new Error("Payment authorization link was not accepted.");
      }
      await verifyPayment(started.payment.transactionReference);
    } catch (e) {
      setError(paymentInitializationFailureMessage(selectedProviderLabel, friendlyError(e), effectivePaymentConfig));
    } finally {
      setBusy(false);
    }
  }

  async function verifyPayment(reference: string) {
    const orderId = order?.id;
    if (!orderId) return;
    await paymentsApi.verify(reference);
    cart.clear();
    setPendingPaymentReference("");
    setPendingAuthorizationUrl("");
    setPendingPaymentProvider("");
    router.replace(`/orders/${orderId}`);
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
      await openExternalPaymentAuthorization(pendingAuthorizationUrl);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  if (!cart.items.length && !order) return <Protected><Screen title="Checkout"><Empty message="Your cart is empty." /></Screen></Protected>;

  const pricing = quote ? pricingFromServer(quote) : null;
  const quoteReady = !!quote && !quoteLoading && !quoteError;
  const paymentView = paymentStatusViewForConfig(order?.paymentStatus, effectivePaymentConfig);
  const selectedProviderLabel = paymentProviderLabel(selectedPaymentProvider, effectivePaymentConfig);
  const pendingProviderLabel = paymentProviderLabel(pendingPaymentProvider || selectedPaymentProvider, effectivePaymentConfig);
  const pendingView = pendingAuthorizationCopy(pendingProviderLabel);
  const liveSquadMode = isSquadLivePaymentConfig(effectivePaymentConfig);
  const paymentButtonTitle = liveSquadMode
    ? `Pay with Squad - ${money(order?.totalAmount ?? 0)}`
    : `Continue with ${selectedProviderLabel} - ${money(order?.totalAmount ?? 0)}`;

  return <Protected><Screen title="Checkout">
    {addresses.length === 0 ? <><Empty message="Add a delivery address before checkout." /><Button title="Add address" onPress={() => router.push("/addresses")} /></> :
      addresses.map((a) => <Button key={a.id} title={`${a.id === addressId ? "Selected - " : ""}${a.label}: ${a.addressLine}`} tone="muted" onPress={() => setAddressId(a.id)} />)}
    <Field placeholder="Promo code (try KARIGOFIRST)" value={promoCode} onChangeText={(code) => { setPromo(code); setValidPromoCode(""); setMessage(""); setError(""); }} autoCapitalize="characters" />
    <Button title="Validate promo" tone="muted" onPress={validatePromo} disabled={!promoCode || !!order || quoteLoading} />
    <Card>
      <View style={ui.priceRow}><Text style={ui.priceLabel}>Cart subtotal:</Text><Text style={ui.priceValue}>{pricing ? money(pricing.subtotal) : money(cart.subtotal)}</Text></View>
      <View style={ui.priceRow}><Text style={ui.priceLabel}>Delivery fee:</Text><Text style={ui.priceValue}>{pricing ? money(pricing.deliveryFee) : "Waiting for server quote"}</Text></View>
      <View style={ui.priceRow}><Text style={ui.priceLabel}>Discount:</Text><Text style={ui.priceValue}>{pricing ? `-${money(pricing.discountAmount)}` : "Waiting for server quote"}</Text></View>
      <View style={ui.priceRow}><Text style={ui.sectionTitle}>Payable:</Text><Text style={ui.payable}>{pricing ? money(pricing.payableAmount) : "Waiting for server quote"}</Text></View>
      {quote ? <Text style={ui.quoteText}>Quote: {quote.quoteReference}</Text> : null}
    </Card>
    {quoteLoading ? <Message>Updating delivery total...</Message> : null}
    {quoteError ? <><Message error>{quoteError}</Message><Button title="Retry delivery total" tone="muted" onPress={() => { void loadQuote(validPromoCode); }} /></> : null}
    <Message>{message}</Message><Message error>{error}</Message>
    {!order ? <Button title={busy ? "Creating order..." : "Create order"} onPress={createOrder} disabled={busy || !addressId || !quoteReady} /> :
      <>
        <Card>
          <Text style={ui.cardTitle}>{paymentView.title}</Text>
          <StatusBadge status={order.paymentStatus} />
          <Text style={ui.cardText}>{paymentView.body}</Text>
          <Text style={ui.muted}>{paymentView.actionHint}</Text>
          <Text style={ui.muted}>{paymentSafetyNoteForConfig(effectivePaymentConfig)}</Text>
        </Card>
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
        <Card>
          <Text style={ui.cardTitle}>Pay on Delivery / Cash</Text>
          <Text style={ui.cardText}>{effectivePaymentConfig.cashPaymentEnabled ? "Available where KariGO Operations has enabled manual cash collection." : "Cash payment is being prepared for Kano and Abuja launch operations."}</Text>
          <Text style={ui.muted}>{effectivePaymentConfig.cashPaymentNote ?? "Cash/POD orders must remain unpaid until collection is verified by KariGO Operations."}</Text>
          <Text style={ui.muted}>Please pay only the amount shown in the app.</Text>
          <Button title={effectivePaymentConfig.cashPaymentEnabled ? "Cash/POD confirmation pending" : "Cash/POD not available yet"} tone="muted" disabled />
        </Card>
        <Button title={busy ? "Preparing payment..." : paymentButtonTitle} onPress={pay} disabled={busy || !!pendingPaymentReference || !paymentProviderAvailable} />
        {pendingPaymentReference ? <Card>
          <Text style={ui.cardTitle}>{pendingView.title}</Text>
          <Text style={ui.cardText}>{pendingView.body}</Text>
          <Text style={ui.muted}>{pendingView.actionHint}</Text>
          <Text style={ui.muted}>{paymentProviderSensitiveDataNoteForConfig(effectivePaymentConfig)}</Text>
          <Button title="Open payment page again" tone="muted" onPress={reopenPaymentAuthorization} disabled={busy} />
          <Button title={busy ? "Verifying payment..." : "Verify payment status"} onPress={verifyPendingPayment} disabled={busy} />
        </Card> : null}
        <Card>
          <Text style={ui.cardTitle}>Wallet and refunds</Text>
          <Text style={ui.muted}>{effectivePaymentConfig.walletPaymentNote ?? walletRefundFutureNote}</Text>
          <Text style={ui.muted}>Wallet top-up via Squad: {effectivePaymentConfig.walletTopUpEnabled ? "Configured, pending backend verification flow." : "Not active yet."}</Text>
          <Text style={ui.muted}>Pay from wallet: {effectivePaymentConfig.walletPaymentsEnabled ? "Configured, requires sufficient balance and server-side debit." : "Not active yet."}</Text>
        </Card>
      </>}
  </Screen></Protected>;
}
