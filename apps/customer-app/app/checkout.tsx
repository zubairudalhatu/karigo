import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import type { CheckoutQuote, PublicPaymentConfig } from "@karigo/shared-types";
import { Address, addressesApi } from "../src/api/addresses.api";
import { ordersApi } from "../src/api/orders.api";
import { paymentsApi } from "../src/api/payments.api";
import { Button, Card, Empty, Field, Message, Protected, Screen, ui } from "../src/components/ui";
import { useCart } from "../src/contexts/cart-context";
import { pricingFromServer } from "../src/lib/checkout-pricing";
import { friendlyError, money } from "../src/lib/errors";
import { fallbackCustomerPaymentConfig } from "../src/lib/payment-status";
import { promoErrorMessage } from "../src/lib/promo-state";

function normalizeCity(value?: string | null): string {
  return value?.trim().toLowerCase() ?? "";
}

function supportedCitySet(config: PublicPaymentConfig): Set<string> {
  const cities = config.launchCities?.length ? config.launchCities : ["Kano", "Abuja"];
  return new Set(cities.map(normalizeCity).filter(Boolean));
}

export default function Checkout() {
  const cart = useCart();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState("");
  const [promoCode, setPromo] = useState("");
  const [validPromoCode, setValidPromoCode] = useState("");
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<PublicPaymentConfig | null>(null);
  const [paymentConfigLoading, setPaymentConfigLoading] = useState(false);
  const [paymentConfigError, setPaymentConfigError] = useState("");

  const items = useMemo(() => cart.items.map((i) => ({ productId: i.product.id, quantity: i.quantity })), [cart.items]);
  const effectivePaymentConfig = paymentConfig ?? fallbackCustomerPaymentConfig;
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
    } catch {
      setPaymentConfig(null);
      setPaymentConfigError("Payment configuration could not be loaded. Pay on Delivery remains available for supported orders.");
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
    if (!cashEnabled || knownUnsupportedCashCity) {
      setError("Pay on Delivery is available in supported KariGO cities.");
      return;
    }
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
        promoCode: validPromoCode || undefined,
        paymentMethod: "CASH_ON_DELIVERY"
      });
      setQuote({
        quoteReference: created.orderNumber,
        cartSubtotal: Number(created.subtotal),
        deliveryFee: Number(created.deliveryFee),
        discountAmount: Number(created.discountAmount),
        finalPayableAmount: Number(created.totalAmount),
        promoCode: validPromoCode || undefined,
        createdAt: new Date().toISOString()
      });
      setMessage("Pay on Delivery order created. Please pay only the amount shown in KariGO at delivery.");
      cart.clear();
      router.replace(`/orders/${created.id}`);
    } catch (e) {
      setValidPromoCode("");
      setQuote(null);
      setError(promoErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (!cart.items.length) return <Protected><Screen title="Checkout"><Empty message="Your cart is empty." /></Screen></Protected>;

  const pricing = quote ? pricingFromServer(quote) : null;
  const quoteReady = !!quote && !quoteLoading && !quoteError;
  const cashEnabled = Boolean(effectivePaymentConfig.cashPaymentEnabled);
  const selectedAddress = addresses.find((address) => address.id === addressId);
  const checkoutCity = normalizeCity(selectedAddress?.city) || normalizeCity(cart.vendor?.city);
  const knownUnsupportedCashCity = Boolean(checkoutCity) && !supportedCitySet(effectivePaymentConfig).has(checkoutCity);
  const checkoutMethodBlocked = !cashEnabled || knownUnsupportedCashCity;

  return <Protected><Screen title="Checkout">
    {addresses.length === 0 ? <><Empty message="Add a delivery address before checkout." /><Button title="Add address" onPress={() => router.push("/addresses")} /></> :
      addresses.map((a) => <Button key={a.id} title={`${a.id === addressId ? "Selected - " : ""}${a.label}: ${a.addressLine}`} tone="muted" onPress={() => setAddressId(a.id)} />)}
    <Field placeholder="Promo code (try KARIGOFIRST)" value={promoCode} onChangeText={(code) => { setPromo(code); setValidPromoCode(""); setMessage(""); setError(""); }} autoCapitalize="characters" />
    <Button title="Validate promo" tone="muted" onPress={validatePromo} disabled={!promoCode || quoteLoading} />
    <Card>
      <View style={ui.priceRow}><Text style={ui.priceLabel}>Cart subtotal:</Text><Text style={ui.priceValue}>{pricing ? money(pricing.subtotal) : money(cart.subtotal)}</Text></View>
      <View style={ui.priceRow}><Text style={ui.priceLabel}>Delivery fee:</Text><Text style={ui.priceValue}>{pricing ? money(pricing.deliveryFee) : "Waiting for server quote"}</Text></View>
      <View style={ui.priceRow}><Text style={ui.priceLabel}>Discount:</Text><Text style={ui.priceValue}>{pricing ? `-${money(pricing.discountAmount)}` : "Waiting for server quote"}</Text></View>
      <View style={ui.priceRow}><Text style={ui.sectionTitle}>Payable:</Text><Text style={ui.payable}>{pricing ? money(pricing.payableAmount) : "Waiting for server quote"}</Text></View>
      {quote ? <Text style={ui.quoteText}>Quote: {quote.quoteReference}</Text> : null}
    </Card>
    {quoteLoading ? <Message>Updating delivery total...</Message> : null}
    {quoteError ? <><Message error>{quoteError}</Message><Button title="Retry delivery total" tone="muted" onPress={() => { void loadQuote(validPromoCode); }} /></> : null}
    {paymentConfigLoading ? <Message>Loading payment configuration...</Message> : null}
    {paymentConfigError ? <Message>{paymentConfigError}</Message> : null}
    <Message>{message}</Message><Message error>{error}</Message>
    <Card>
      <Text style={ui.cardTitle}>Payment method</Text>
      <Text style={ui.cardText}>Pay on Delivery is available for supported KariGO orders.</Text>
      <Button title="Selected - Pay on Delivery" tone="primary" onPress={() => undefined} disabled={busy || !cashEnabled} />
      <Text style={ui.muted}>Pay cash to the assigned KariGO Captain/vendor at delivery.</Text>
      <Text style={ui.muted}>Please pay only the amount shown in the app.</Text>
      {knownUnsupportedCashCity ? <Message error>Pay on Delivery is available in supported KariGO cities.</Message> : null}
      {!cashEnabled ? <Message error>Pay on Delivery is not enabled right now. Please contact KariGO support.</Message> : null}
    </Card>
    <Button title={busy ? "Creating Pay on Delivery order..." : "Create Pay on Delivery order"} onPress={createOrder} disabled={busy || !addressId || !quoteReady || checkoutMethodBlocked} />
  </Screen></Protected>;
}
