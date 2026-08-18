import { brand } from "@karigo/config";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { UtilityMeterType, UtilityProductSummary, UtilityProviderSummary, UtilityQuoteResult, UtilityServiceType, UtilityTransactionSummary } from "@karigo/shared-types";
import { paymentsApi } from "../../src/api/payments.api";
import { utilitiesApi, UtilityAvailability } from "../../src/api/utilities.api";
import { CustomerWallet, walletApi } from "../../src/api/wallet.api";
import { Button, Card, Empty, Field, Loading, Message, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";
import { fallbackCustomerPaymentConfig } from "../../src/lib/payment-status";

type UtilityFormConfig = {
  type: UtilityServiceType;
  title: string;
  providerLabel: string;
  productLabel?: string;
  recipientLabel: string;
  recipientHelp: string;
  amountLabel: string;
  description: string;
  needsProduct: boolean;
  showRecipientName?: boolean;
  supportsMeterType?: boolean;
};

const configs: Record<string, UtilityFormConfig> = {
  airtime: {
    type: "AIRTIME",
    title: "Airtime",
    providerLabel: "Mobile network",
    recipientLabel: "Recipient phone number",
    recipientHelp: "Enter the Nigerian phone number that should receive airtime.",
    amountLabel: "Airtime amount",
    description: "Buy airtime for a Nigerian mobile number using the enabled utility provider catalogue.",
    needsProduct: false
  },
  data: {
    type: "DATA",
    title: "Data",
    providerLabel: "Mobile network",
    productLabel: "Data plan",
    recipientLabel: "Recipient phone number",
    recipientHelp: "Enter the Nigerian phone number that should receive the selected data plan.",
    amountLabel: "Plan amount",
    description: "Choose a mobile network and data plan before reviewing your request.",
    needsProduct: true
  },
  electricity: {
    type: "ELECTRICITY",
    title: "Electricity",
    providerLabel: "Distribution company",
    recipientLabel: "Meter number",
    recipientHelp: "Enter the prepaid or postpaid meter number for this electricity request.",
    amountLabel: "Electricity amount",
    description: "Select a distribution company, meter type and amount before reviewing your request.",
    needsProduct: false,
    showRecipientName: true,
    supportsMeterType: true
  },
  "cable-tv": {
    type: "CABLE_TV",
    title: "Cable TV",
    providerLabel: "TV provider",
    productLabel: "Bouquet or package",
    recipientLabel: "Smartcard / IUC / decoder number",
    recipientHelp: "Enter the decoder, smartcard or IUC number for the selected bouquet.",
    amountLabel: "Bouquet amount",
    description: "Select a TV provider and bouquet before reviewing your request.",
    needsProduct: true
  }
};

const defaultAmountBounds: Record<UtilityServiceType, { min: number; max: number }> = {
  AIRTIME: { min: 10000, max: 10000000 },
  DATA: { min: 10000, max: 10000000 },
  ELECTRICITY: { min: 50000, max: 50000000 },
  CABLE_TV: { min: 50000, max: 100000000 }
};

const cancellableStatuses = new Set(["DRAFT", "PENDING"]);
const utilityProviderConnectionUnavailable = "Utility provider connection is temporarily unavailable. Please try again later.";
const moneyKobo = (value: number) => `\u20A6${(value / 100).toLocaleString()}`;
const toKobo = (value: string) => {
  const amount = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
};
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

function normalizeNigerianPhone(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (/^0[789][01]\d{8}$/.test(digits)) return `+234${digits.slice(1)}`;
  if (/^234[789][01]\d{8}$/.test(digits)) return `+${digits}`;
  if (/^\+234[789][01]\d{8}$/.test(trimmed)) return trimmed;
  return null;
}

function recipientValidation(config: UtilityFormConfig, recipient: string) {
  const trimmed = recipient.trim();
  if (!trimmed) return config.type === "ELECTRICITY" ? "Enter a meter number." : config.type === "CABLE_TV" ? "Enter a smartcard, IUC or decoder number." : "Enter a valid Nigerian phone number.";
  if (config.type === "AIRTIME" || config.type === "DATA") {
    return normalizeNigerianPhone(trimmed) ? "" : "Enter a valid Nigerian phone number.";
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 20) {
    return config.type === "ELECTRICITY" ? "Enter a valid meter number." : "Enter a valid smartcard or IUC number.";
  }
  return "";
}

function receiptMessage(transaction: UtilityTransactionSummary) {
  if (transaction.status === "CANCELLED" && (transaction.walletReversalReference || transaction.walletDebitStatus === "REVERSED")) {
    return "This utility request was cancelled and your wallet has been reversed.";
  }
  if (transaction.walletReversalReference || transaction.walletDebitStatus === "REVERSED") {
    return "This utility request failed and your wallet has been reversed.";
  }
  if (transaction.status === "CANCELLED") {
    return "This utility request was cancelled before fulfilment. If your wallet was debited, KariGO will confirm the reversal status.";
  }
  if (transaction.status === "SUCCESSFUL") {
    return "Your utility request was successful.";
  }
  if (transaction.status === "FAILED") {
    return "This utility request failed. If your wallet was debited, KariGO will reverse it automatically.";
  }
  if (transaction.status === "PENDING" || transaction.status === "PROCESSING") {
    return "Your request is being processed. KariGO will confirm once the provider completes fulfilment.";
  }
  return transaction.testMode
    ? "This request is queued for KariGO provider verification."
    : "Your request is being processed. KariGO will confirm once the provider completes fulfilment.";
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
  const [availability, setAvailability] = useState<UtilityAvailability>("TEMPORARILY_UNAVAILABLE");
  const [availabilityNote, setAvailabilityNote] = useState("This utility service is temporarily unavailable.");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [catalogueError, setCatalogueError] = useState("");

  async function loadCatalogue() {
    if (!config) return;
    setLoading(true);
    setError("");
    setCatalogueError("");
    try {
      const [paymentConfig, readiness, nextProviders, nextProducts, walletSummary] = await Promise.all([
        paymentsApi.publicConfig(),
        utilitiesApi.readiness(),
        utilitiesApi.providers(config.type),
        utilitiesApi.products({ type: config.type }),
        walletApi.summary()
      ]);
      setUtilitiesEnabled(Boolean(paymentConfig.utilitiesCustomerPurchaseEnabled));
      const serviceReadiness = readiness.services.find((item) => item.serviceType === config.type);
      setAvailability(serviceReadiness?.availability ?? "TEMPORARILY_UNAVAILABLE");
      setAvailabilityNote(serviceReadiness?.note ?? "This utility service is temporarily unavailable.");
      setWalletPaymentEnabled(walletUtilitiesEnabled(paymentConfig));
      setUtilitiesStatusNote(paymentConfig.utilitiesStatusNote ?? fallbackCustomerPaymentConfig.utilitiesStatusNote);
      setWallet(walletSummary);
      setProviders(nextProviders);
      setProducts(nextProducts);
      setProviderId(nextProviders[0]?.id ?? "");
      setProductId("");
      setAmount("");
      setQuote(null);
      setTransaction(null);
    } catch {
      setProviders([]);
      setProducts([]);
      setProviderId("");
      setProductId("");
      setUtilitiesEnabled(false);
      setWalletPaymentEnabled(false);
      setUtilitiesStatusNote(fallbackCustomerPaymentConfig.utilitiesStatusNote);
      setCatalogueError(utilityProviderConnectionUnavailable);
      setAvailability("TEMPORARILY_UNAVAILABLE");
      setAvailabilityNote(utilityProviderConnectionUnavailable);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCatalogue();
  }, [config?.type]);

  const selectedProvider = providers.find((provider) => provider.id === providerId);
  const providerProducts = useMemo(() => products.filter((product) => product.providerId === providerId), [products, providerId]);
  const selectedProduct = providerProducts.find((product) => product.id === productId);
  const amountKobo = selectedProduct?.amountKobo ?? toKobo(amount);
  const walletKobo = walletBalanceKobo(wallet);
  const amountBounds = {
    min: selectedProduct?.minAmountKobo ?? defaultAmountBounds[config?.type ?? "AIRTIME"].min,
    max: selectedProduct?.maxAmountKobo ?? defaultAmountBounds[config?.type ?? "AIRTIME"].max
  };
  const insufficientWalletKobo = walletPaymentEnabled && amountKobo > 0 ? Math.max(0, amountKobo - walletKobo) : 0;
  const quoteWalletShortageKobo = walletPaymentEnabled && quote ? Math.max(0, quote.totalKobo - walletKobo) : 0;

  function amountValidation() {
    if (selectedProduct?.amountKobo) return "";
    if (!amount.trim()) return "Enter an amount.";
    if (amountKobo <= 0) return "Enter a valid amount.";
    if (amountKobo < amountBounds.min || amountKobo > amountBounds.max) {
      return `Enter an amount between ${moneyKobo(amountBounds.min)} and ${moneyKobo(amountBounds.max)}.`;
    }
    return "";
  }

  function reviewDisabledReason() {
    if (catalogueError) return catalogueError;
    if (!providers.length) return "This service is temporarily unavailable.";
    if (availability !== "AVAILABLE") return availabilityNote;
    if (!providerId || !selectedProvider) return `Select a ${config.providerLabel.toLowerCase()}.`;
    if (config.needsProduct && !providerProducts.length) return `${config.productLabel ?? "Package"} catalogue is temporarily unavailable for ${selectedProvider.name}.`;
    if (config.needsProduct && !selectedProduct) return `Select a ${config.productLabel?.toLowerCase() ?? "package"}.`;
    if (config.needsProduct && selectedProduct && selectedProduct.providerId !== providerId) return "Select a package that belongs to the selected provider.";
    const recipientReason = recipientValidation(config, recipient);
    if (recipientReason) return recipientReason;
    if (config.supportsMeterType && !meterType) return "Select prepaid or postpaid meter type.";
    const amountReason = amountValidation();
    if (amountReason) return amountReason;
    if (insufficientWalletKobo > 0) return `Insufficient KariGO Wallet balance. Add at least ${moneyKobo(insufficientWalletKobo)} to continue.`;
    return "";
  }

  const disabledReason = config ? reviewDisabledReason() : "";
  const canQuote = Boolean(config && !loading && !busy && !disabledReason);

  function chooseProvider(id: string) {
    setProviderId(id);
    setProductId("");
    setAmount("");
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
    if (!config || !quote || busy || quoteWalletShortageKobo > 0) return;
    setBusy(true);
    setError("");
    try {
      const created = await utilitiesApi.create({
        serviceType: config.type,
        providerId,
        productId: productId || undefined,
        amountKobo,
        recipient,
        recipientName: recipientName || undefined,
        meterType: config.supportsMeterType ? meterType : undefined,
        idempotencyKey: quote.quoteReference
      });
      setTransaction(created);
      if (walletPaymentEnabled) setWallet(await walletApi.summary());
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function cancelInlineTransaction() {
    if (!transaction || busy) return;
    Alert.alert(
      "Cancel this utility request?",
      "Keep request if provider fulfilment may already be in progress. Cancel request is only accepted before fulfilment becomes irreversible.",
      [
        { text: "Keep request", style: "cancel" },
        {
          text: "Cancel request",
          style: "destructive",
          onPress: async () => {
            try {
              setBusy(true);
              setError("");
              const cancelled = await utilitiesApi.cancel(transaction.id);
              setTransaction(cancelled);
              setWallet(await walletApi.summary().catch(() => wallet));
            } catch (e) {
              setError(friendlyError(e));
            } finally {
              setBusy(false);
            }
          }
        }
      ]
    );
  }

  if (!config) return <Protected><Screen title="Bills & Utilities"><Empty message="This utility service is not available." /></Screen></Protected>;

  return <Protected><Screen title={config.title}>
    <Text style={ui.pageIntro}>{config.description}</Text>
    <Message>{utilitiesStatusNote}</Message>
    <Message error>{error}</Message>
    <Message>{availability === "AVAILABLE" ? "Available" : availability === "PREPARING_LAUNCH" ? "Preparing launch" : "Temporarily unavailable"}: {availabilityNote}</Message>
    {loading ? <Loading label={`Loading ${config.title} catalogue...`} /> : catalogueError ? <Card>
      <Text style={ui.cardTitle}>This service is temporarily unavailable.</Text>
      <Text style={ui.muted}>{catalogueError}</Text>
      <Button title="Retry provider connection" tone="muted" onPress={() => void loadCatalogue()} />
    </Card> : !providers.length ? <Card>
      <Text style={ui.cardTitle}>This service is temporarily unavailable.</Text>
      <Text style={ui.muted}>No enabled provider is currently available for {config.title}. Please try again later.</Text>
      <Button title="Retry catalogue" tone="muted" onPress={() => void loadCatalogue()} />
    </Card> : <>
      <Card>
        <Text style={ui.cardTitle}>KariGO Wallet</Text>
        <Text style={ui.cardText}>Available balance: {moneyKobo(walletKobo)}</Text>
        {walletPaymentEnabled ? <Text style={ui.muted}>Your KariGO Wallet will be debited after you submit this request. If provider fulfilment fails, KariGO will reverse the debit automatically.</Text> : <Text style={ui.muted}>Wallet-backed Utilities are controlled by backend readiness flags. No utility request can be submitted until this service is available.</Text>}
      </Card>

      <Text style={ui.sectionTitle}>{config.providerLabel}</Text>
      <View style={styles.optionGrid}>
        {providers.map((provider) => <Pressable key={provider.id} accessibilityRole="button" accessibilityLabel={`Select ${provider.name}`} onPress={() => chooseProvider(provider.id)} style={[styles.option, provider.id === providerId && styles.optionActive]}>
          <Text style={ui.cardText}>{provider.name}</Text>
          <Text style={ui.muted}>{provider.id === providerId ? "Selected provider" : "Tap to select"}</Text>
        </Pressable>)}
      </View>

      {config.needsProduct ? <>
        <Text style={ui.sectionTitle}>{config.productLabel}</Text>
        {providerProducts.length ? <View style={styles.optionGrid}>
          {providerProducts.map((product) => <Pressable key={product.id} accessibilityRole="button" accessibilityLabel={`Select ${product.name}`} onPress={() => chooseProduct(product)} style={[styles.option, product.id === productId && styles.optionActive]}>
            <View>
              <Text style={ui.cardText}>{product.name}</Text>
              <Text style={ui.muted}>{product.amountKobo ? moneyKobo(product.amountKobo) : "Variable amount"}</Text>
              {product.minAmountKobo || product.maxAmountKobo ? <Text style={ui.muted}>Allowed: {moneyKobo(product.minAmountKobo ?? defaultAmountBounds[config.type].min)} - {moneyKobo(product.maxAmountKobo ?? defaultAmountBounds[config.type].max)}</Text> : null}
            </View>
          </Pressable>)}
        </View> : <Card>
          <Text style={ui.cardTitle}>{config.productLabel} unavailable</Text>
          <Text style={ui.muted}>{config.productLabel} catalogue is temporarily unavailable for {selectedProvider?.name ?? "this provider"}. Please try another provider or retry later.</Text>
        </Card>}
      </> : null}

      <Text style={ui.sectionTitle}>{config.recipientLabel}</Text>
      <Text style={ui.muted}>{config.recipientHelp}</Text>
      <Field placeholder={config.recipientLabel} value={recipient} onChangeText={(value) => { setRecipient(value); setQuote(null); setTransaction(null); }} keyboardType={config.type === "AIRTIME" || config.type === "DATA" ? "phone-pad" : "number-pad"} />
      {recipient ? <Text style={recipientValidation(config, recipient) ? styles.validationHint : styles.readyHint}>{recipientValidation(config, recipient) || "Recipient details look valid."}</Text> : null}

      {config.showRecipientName ? <>
        <Text style={ui.sectionTitle}>Customer name</Text>
        <Field placeholder="Customer name (optional)" value={recipientName} onChangeText={(value) => { setRecipientName(value); setQuote(null); setTransaction(null); }} />
      </> : null}

      {config.supportsMeterType ? <>
        <Text style={ui.sectionTitle}>Meter type</Text>
        <View style={styles.meterTypeRow}>
          {(["PREPAID", "POSTPAID"] as UtilityMeterType[]).map((type) => <Pressable key={type} accessibilityRole="button" accessibilityLabel={`Select ${type.toLowerCase()} meter`} onPress={() => { setMeterType(type); setQuote(null); setTransaction(null); }} style={[styles.meterTypeOption, meterType === type && styles.optionActive]}>
            <Text style={[ui.cardText, meterType === type && styles.meterTypeTextActive]}>{type === "PREPAID" ? "Prepaid" : "Postpaid"}</Text>
          </Pressable>)}
        </View>
      </> : null}

      <Text style={ui.sectionTitle}>{config.amountLabel}</Text>
      <Field placeholder={config.amountLabel} value={amount} onChangeText={(value) => { setAmount(value); setQuote(null); setTransaction(null); }} keyboardType="numeric" editable={!selectedProduct?.amountKobo} />
      {selectedProduct?.amountKobo ? <Text style={ui.muted}>Amount is fixed by the selected package.</Text> : <Text style={ui.muted}>Allowed amount: {moneyKobo(amountBounds.min)} - {moneyKobo(amountBounds.max)}.</Text>}

      <Button title={busy ? "Checking..." : "Review Utility Request"} disabled={!canQuote} onPress={quoteTransaction} />
      <Text style={disabledReason ? styles.validationHint : styles.readyHint}>{disabledReason || "All required fields are ready. Review before submitting."}</Text>

      {quote ? <Card>
        <Text style={ui.cardTitle}>{utilitiesEnabled ? "Confirm utility request" : "Confirm utility review"}</Text>
        <Text style={ui.muted}>Opening Review does not submit the request. Confirm only after checking the details below.</Text>
        <View style={ui.priceRow}><Text style={ui.priceLabel}>Service:</Text><Text style={ui.priceValue}>{config.title}</Text></View>
        <View style={ui.priceRow}><Text style={ui.priceLabel}>Provider:</Text><Text style={ui.priceValue}>{selectedProvider?.name ?? quote.provider.name}</Text></View>
        {selectedProduct || quote.product ? <View style={ui.priceRow}><Text style={ui.priceLabel}>{config.productLabel ?? "Package"}:</Text><Text style={ui.priceValue}>{selectedProduct?.name ?? quote.product?.name}</Text></View> : null}
        <View style={ui.priceRow}><Text style={ui.priceLabel}>{config.recipientLabel}:</Text><Text style={ui.priceValue}>{recipient}</Text></View>
        {config.supportsMeterType ? <View style={ui.priceRow}><Text style={ui.priceLabel}>Meter type:</Text><Text style={ui.priceValue}>{meterType === "PREPAID" ? "Prepaid" : "Postpaid"}</Text></View> : null}
        <View style={ui.priceRow}><Text style={ui.priceLabel}>Amount:</Text><Text style={ui.priceValue}>{moneyKobo(quote.amountKobo)}</Text></View>
        <View style={ui.priceRow}><Text style={ui.priceLabel}>Fee:</Text><Text style={ui.priceValue}>{moneyKobo(quote.convenienceFeeKobo)}</Text></View>
        <View style={ui.priceRow}><Text style={ui.sectionTitle}>Total:</Text><Text style={ui.payable}>{moneyKobo(quote.totalKobo)}</Text></View>
        {walletPaymentEnabled ? <>
          <View style={ui.priceRow}><Text style={ui.priceLabel}>Wallet before:</Text><Text style={ui.priceValue}>{moneyKobo(walletKobo)}</Text></View>
          <View style={ui.priceRow}><Text style={ui.priceLabel}>Wallet after:</Text><Text style={ui.priceValue}>{moneyKobo(Math.max(0, walletKobo - quote.totalKobo))}</Text></View>
          <Text style={quoteWalletShortageKobo ? styles.validationHint : ui.muted}>{quoteWalletShortageKobo ? `Insufficient KariGO Wallet balance. Add at least ${moneyKobo(quoteWalletShortageKobo)} to continue.` : "Payment method: KariGO Wallet"}</Text>
        </> : null}
        <Text style={ui.muted}>Reversal policy: if provider fulfilment fails after a wallet debit, KariGO will reverse the debit automatically.</Text>
        <Text style={ui.quoteText}>Quote: {quote.quoteReference}</Text>
        <View style={styles.actionRow}>
          <View style={styles.actionItem}><Button title="Edit details" tone="muted" onPress={() => { setQuote(null); setTransaction(null); }} /></View>
          <View style={styles.actionItem}><Button title={busy ? "Submitting..." : walletPaymentEnabled ? "Pay with Wallet" : utilitiesEnabled ? "Submit Utility Request" : "Submit Review Record"} disabled={busy || quoteWalletShortageKobo > 0} onPress={submitTransaction} /></View>
        </View>
      </Card> : null}

      {transaction ? <Card>
        <Text style={ui.cardTitle}>{transaction.testMode ? "Utility review receipt" : "Utility request receipt"}</Text>
        <Text style={ui.muted}>{receiptMessage(transaction)}</Text>
        <Text>Reference: {transaction.reference}</Text>
        <Text>Provider: {transaction.provider.name}</Text>
        {transaction.product ? <Text>Package: {transaction.product.name}</Text> : null}
        <Text>Total: {moneyKobo(transaction.totalKobo)}</Text>
        {transaction.walletDebitReference ? <Text>Wallet debit: {transaction.walletDebitReference}</Text> : null}
        {transaction.walletReversalReference ? <Text>Wallet reversal: {transaction.walletReversalReference}</Text> : null}
        {transaction.mockToken ? <Text style={ui.otpCode}>{transaction.mockToken}</Text> : null}
        <StatusBadge status={transaction.status} />
        {cancellableStatuses.has(transaction.status) ? <>
          <Text style={ui.muted}>Cancellation is available only before provider fulfilment becomes irreversible.</Text>
          <Button title={busy ? "Cancelling..." : "Cancel utility request"} tone="danger" onPress={cancelInlineTransaction} disabled={busy} />
        </> : null}
        <Button title="View full receipt" tone="muted" onPress={() => router.push(`/utilities/transactions/${transaction.id}`)} />
      </Card> : null}
    </>}
  </Screen></Protected>;
}

const styles = StyleSheet.create({
  optionGrid: { gap: 10 },
  option: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, padding: 14 },
  optionActive: { borderColor: brand.colors.primary, backgroundColor: "#FEF2F2" },
  meterTypeRow: { flexDirection: "row", gap: 10 },
  meterTypeOption: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, flex: 1, padding: 14 },
  meterTypeTextActive: { color: brand.colors.primary },
  validationHint: { backgroundColor: "#FEF2F2", borderRadius: 10, color: brand.colors.primaryDark, fontSize: 13, fontWeight: "800", lineHeight: 19, padding: 10 },
  readyHint: { backgroundColor: "#ECFDF3", borderRadius: 10, color: brand.colors.success, fontSize: 13, fontWeight: "800", lineHeight: 19, padding: 10 },
  actionRow: { flexDirection: "row", gap: 10 },
  actionItem: { flex: 1 }
});
