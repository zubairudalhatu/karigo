import { brand } from "@karigo/config";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { UtilityMeterType, UtilityProductSummary, UtilityProviderSummary, UtilityQuoteResult, UtilityServiceType, UtilityTransactionSummary } from "@karigo/shared-types";
import { paymentsApi } from "../../src/api/payments.api";
import { utilitiesApi } from "../../src/api/utilities.api";
import { CustomerWallet, walletApi } from "../../src/api/wallet.api";
import { Button, Card, Empty, Field, Loading, Message, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { friendlyError, money } from "../../src/lib/errors";
import { fallbackCustomerPaymentConfig } from "../../src/lib/payment-status";

const configs: Record<string, {
  type: UtilityServiceType;
  title: string;
  recipientLabel: string;
  amountLabel: string;
  description: string;
  needsProduct: boolean;
  showRecipientName?: boolean;
  supportsMeterType?: boolean;
}> = {
  airtime: {
    type: "AIRTIME",
    title: "Airtime",
    recipientLabel: "Phone number",
    amountLabel: "Amount in NGN",
    description: "Request airtime for a Nigerian phone number.",
    needsProduct: false
  },
  data: {
    type: "DATA",
    title: "Data",
    recipientLabel: "Phone number",
    amountLabel: "Plan amount in NGN",
    description: "Choose a data bundle for provider processing.",
    needsProduct: true
  },
  electricity: {
    type: "ELECTRICITY",
    title: "Electricity",
    recipientLabel: "Meter number",
    amountLabel: "Amount in NGN",
    description: "Enter a meter number for electricity token processing.",
    needsProduct: false,
    showRecipientName: true,
    supportsMeterType: true
  },
  "cable-tv": {
    type: "CABLE_TV",
    title: "Cable TV",
    recipientLabel: "Smartcard / IUC number",
    amountLabel: "Package amount in NGN",
    description: "Choose a cable package for smartcard or IUC processing.",
    needsProduct: true
  }
};

const moneyKobo = (value: number) => `NGN ${(value / 100).toLocaleString()}`;
const toKobo = (value: string) => Math.round(Number(value.replace(/[^\d.]/g, "")) * 100);
const walletBalanceKobo = (wallet: CustomerWallet | null) => Math.round(Number(wallet?.availableBalance ?? 0) * 100);
const walletUtilitiesEnabled = (config: {
  utilitiesCustomerPurchaseEnabled?: boolean;
  utilitiesWalletPaymentEnabled?: boolean;
  utilitiesLiveFulfillmentEnabled?: boolean;
  utilitiesPaymentMethod?: string;
  utilitiesTestMode?: boolean;
}) => Boolean(
  config.utilitiesCustomerPurchaseEnabled &&
  config.utilitiesWalletPaymentEnabled &&
  config.utilitiesLiveFulfillmentEnabled &&
  config.utilitiesPaymentMethod === "WALLET" &&
  config.utilitiesTestMode === false
);

function receiptMessage(transaction: UtilityTransactionSummary) {
  if (transaction.walletReversalReference || transaction.walletDebitStatus === "REVERSED") {
    return "Utility payment failed. Your wallet has been reversed.";
  }
  if (transaction.status === "SUCCESSFUL") {
    return "Utility payment successful. Your request has been processed.";
  }
  if (transaction.paymentMethod === "WALLET") {
    return "Your utility payment is being processed. Please check status shortly.";
  }
  return transaction.testMode
    ? "This request is running in controlled provider test mode."
    : "Your request is being processed. KariGO will confirm once the provider completes fulfillment.";
}

export default function UtilityServiceFlow() {
  const { service } = useLocalSearchParams<{ service: string }>();
  const config = configs[service ?? ""];
  const [providers, setProviders] = useState<UtilityProviderSummary[]>([]);
  const [products, setProducts] = useState<UtilityProductSummary[]>([]);
  const [providerId, setProviderId] = useState("");
  const [productId, setProductId] = useState("");
  const [recipient, setRecipient] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [meterType, setMeterType] = useState<UtilityMeterType>("PREPAID");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<UtilityQuoteResult | null>(null);
  const [transaction, setTransaction] = useState<UtilityTransactionSummary | null>(null);
  const [utilitiesEnabled, setUtilitiesEnabled] = useState(false);
  const [walletPaymentEnabled, setWalletPaymentEnabled] = useState(false);
  const [utilitiesStatusNote, setUtilitiesStatusNote] = useState(fallbackCustomerPaymentConfig.utilitiesStatusNote);
  const [wallet, setWallet] = useState<CustomerWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!config) return;
    setLoading(true);
    Promise.all([paymentsApi.publicConfig(), utilitiesApi.providers(config.type), utilitiesApi.products({ type: config.type }), walletApi.summary()])
      .then(([paymentConfig, nextProviders, nextProducts, walletSummary]) => {
        setUtilitiesEnabled(Boolean(paymentConfig.utilitiesCustomerPurchaseEnabled));
        setWalletPaymentEnabled(walletUtilitiesEnabled(paymentConfig));
        setUtilitiesStatusNote(paymentConfig.utilitiesStatusNote ?? fallbackCustomerPaymentConfig.utilitiesStatusNote);
        setWallet(walletSummary);
        setProviders(nextProviders);
        setProducts(nextProducts);
        setProviderId(nextProviders[0]?.id ?? "");
        const firstProduct = nextProducts.find((product) => product.providerId === nextProviders[0]?.id);
        setProductId(firstProduct?.id ?? "");
        setAmount(firstProduct?.amountKobo ? String(firstProduct.amountKobo / 100) : "");
      })
      .catch((e) => {
        setUtilitiesEnabled(false);
        setWalletPaymentEnabled(false);
        setUtilitiesStatusNote(fallbackCustomerPaymentConfig.utilitiesStatusNote);
        setError(friendlyError(e));
      })
      .finally(() => setLoading(false));
  }, [config?.type]);

  const providerProducts = useMemo(() => products.filter((product) => product.providerId === providerId), [products, providerId]);
  const selectedProduct = providerProducts.find((product) => product.id === productId);
  const amountKobo = selectedProduct?.amountKobo ?? toKobo(amount);
  const canQuote = !!config && !!providerId && !!recipient.trim() && amountKobo > 0 && (!config.needsProduct || !!productId);
  const hasInsufficientWalletBalance = walletPaymentEnabled && quote ? walletBalanceKobo(wallet) < quote.totalKobo : false;

  function chooseProvider(id: string) {
    setProviderId(id);
    const firstProduct = products.find((product) => product.providerId === id);
    setProductId(firstProduct?.id ?? "");
    setAmount(firstProduct?.amountKobo ? String(firstProduct.amountKobo / 100) : "");
    setQuote(null);
    setTransaction(null);
    setError("");
  }

  function chooseProduct(product: UtilityProductSummary) {
    setProductId(product.id);
    setAmount(product.amountKobo ? String(product.amountKobo / 100) : "");
    setQuote(null);
    setTransaction(null);
    setError("");
  }

  async function quoteTransaction() {
    if (!config || !canQuote) return;
    setBusy(true);
    setError("");
    setQuote(null);
    setTransaction(null);
    try {
      setQuote(await utilitiesApi.quote({
        serviceType: config.type,
        providerId,
        productId: productId || undefined,
        amountKobo,
        recipient,
        recipientName: recipientName || undefined,
        meterType: config.supportsMeterType ? meterType : undefined
      }));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function submitTransaction() {
    if (!config || !quote) return;
    setBusy(true);
    setError("");
    try {
      setTransaction(await utilitiesApi.create({
        serviceType: config.type,
        providerId,
        productId: productId || undefined,
        amountKobo,
        recipient,
        recipientName: recipientName || undefined,
        meterType: config.supportsMeterType ? meterType : undefined,
        idempotencyKey: quote.quoteReference
      }));
      if (walletPaymentEnabled) setWallet(await walletApi.summary());
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  if (!config) return <Protected><Screen title="Bills & Utilities"><Empty message="This utility service is not available." /></Screen></Protected>;

  return <Protected><Screen title={config.title}>
    <Text style={ui.pageIntro}>{config.description}</Text>
    <Message>{utilitiesStatusNote}</Message>
    <Message error>{error}</Message>
    {loading ? <Loading label={`Loading ${config.title} catalogue...`} /> : <>
      {walletPaymentEnabled ? <Card>
        <Text style={ui.cardTitle}>Pay with KariGO Wallet</Text>
        <Text style={ui.muted}>Available balance: {money(wallet?.availableBalance)}</Text>
        <Text style={ui.muted}>Your KariGO Wallet will be debited after you submit this request. If provider fulfilment fails, KariGO will reverse the debit automatically.</Text>
      </Card> : null}
      <Text style={ui.sectionTitle}>Provider</Text>
      {providers.map((provider) => <Button key={provider.id} title={`${provider.id === providerId ? "Selected - " : ""}${provider.name}`} tone="muted" onPress={() => chooseProvider(provider.id)} />)}
      {config.needsProduct ? <>
        <Text style={ui.sectionTitle}>Plan or package</Text>
        {providerProducts.map((product) => <Pressable key={product.id} accessibilityRole="button" accessibilityLabel={`Select ${product.name}`} onPress={() => chooseProduct(product)} style={[styles.option, product.id === productId && styles.optionActive]}>
          <View>
            <Text style={ui.cardText}>{product.name}</Text>
            <Text style={ui.muted}>{product.amountKobo ? moneyKobo(product.amountKobo) : "Variable amount"}</Text>
          </View>
        </Pressable>)}
      </> : null}
      <Field placeholder={config.recipientLabel} value={recipient} onChangeText={(value) => { setRecipient(value); setQuote(null); setTransaction(null); }} keyboardType={config.type === "AIRTIME" || config.type === "DATA" ? "phone-pad" : "number-pad"} />
      {config.showRecipientName ? <Field placeholder="Customer name (optional)" value={recipientName} onChangeText={setRecipientName} /> : null}
      {config.supportsMeterType ? <>
        <Text style={ui.sectionTitle}>Meter type</Text>
        <View style={styles.meterTypeRow}>
          {(["PREPAID", "POSTPAID"] as UtilityMeterType[]).map((type) => <Pressable key={type} accessibilityRole="button" accessibilityLabel={`Select ${type.toLowerCase()} meter`} onPress={() => { setMeterType(type); setQuote(null); setTransaction(null); }} style={[styles.meterTypeOption, meterType === type && styles.optionActive]}>
            <Text style={[ui.cardText, meterType === type && styles.meterTypeTextActive]}>{type === "PREPAID" ? "Prepaid" : "Postpaid"}</Text>
          </Pressable>)}
        </View>
      </> : null}
      <Field placeholder={config.amountLabel} value={amount} onChangeText={(value) => { setAmount(value); setQuote(null); setTransaction(null); }} keyboardType="numeric" editable={!selectedProduct?.amountKobo} />
      <Button title={busy ? "Checking..." : "Review Utility Request"} disabled={busy || !canQuote} onPress={quoteTransaction} />
      {quote ? <Card>
        <Text style={ui.cardTitle}>{utilitiesEnabled ? "Confirm utility request" : "Confirm utility review"}</Text>
        <View style={ui.priceRow}><Text style={ui.priceLabel}>Amount:</Text><Text style={ui.priceValue}>{moneyKobo(quote.amountKobo)}</Text></View>
        <View style={ui.priceRow}><Text style={ui.priceLabel}>Fee:</Text><Text style={ui.priceValue}>{moneyKobo(quote.convenienceFeeKobo)}</Text></View>
        <View style={ui.priceRow}><Text style={ui.sectionTitle}>Total:</Text><Text style={ui.payable}>{moneyKobo(quote.totalKobo)}</Text></View>
        <Text style={ui.quoteText}>Quote: {quote.quoteReference}</Text>
        {walletPaymentEnabled ? <Text style={hasInsufficientWalletBalance ? styles.warning : ui.muted}>{hasInsufficientWalletBalance ? "Insufficient wallet balance. Please top up your wallet and try again." : "Payment method: KariGO Wallet"}</Text> : null}
        <Button title={busy ? "Submitting..." : walletPaymentEnabled ? "Pay with Wallet" : utilitiesEnabled ? "Submit Utility Request" : "Submit Review Record"} disabled={busy || hasInsufficientWalletBalance} onPress={submitTransaction} />
      </Card> : null}
      {transaction ? <Card>
        <Text style={ui.cardTitle}>{transaction.testMode ? "Utility review receipt" : "Utility request receipt"}</Text>
        <Text>Reference: {transaction.reference}</Text>
        <Text>Provider: {transaction.provider.name}</Text>
        <Text>Total: {moneyKobo(transaction.totalKobo)}</Text>
        {transaction.walletDebitReference ? <Text>Wallet debit: {transaction.walletDebitReference}</Text> : null}
        {transaction.walletReversalReference ? <Text>Wallet reversal: {transaction.walletReversalReference}</Text> : null}
        {transaction.mockToken ? <Text style={ui.otpCode}>{transaction.mockToken}</Text> : null}
        <StatusBadge status={transaction.status} />
        <Text style={ui.muted}>{receiptMessage(transaction)}</Text>
        <Button title="View full receipt" tone="muted" onPress={() => router.push(`/utilities/transactions/${transaction.id}`)} />
      </Card> : null}
    </>}
  </Screen></Protected>;
}

const styles = StyleSheet.create({
  option: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, padding: 14 },
  optionActive: { borderColor: brand.colors.primary, backgroundColor: "#FEF2F2" },
  meterTypeRow: { flexDirection: "row", gap: 10 },
  meterTypeOption: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, flex: 1, padding: 14 },
  meterTypeTextActive: { color: brand.colors.primary },
  warning: { color: brand.colors.primary, fontSize: 13, fontWeight: "900" }
});
