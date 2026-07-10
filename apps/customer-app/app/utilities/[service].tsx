import { brand } from "@karigo/config";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { UtilityProductSummary, UtilityProviderSummary, UtilityQuoteResult, UtilityServiceType, UtilityTransactionSummary } from "@karigo/shared-types";
import { utilitiesApi } from "../../src/api/utilities.api";
import { Button, Card, Empty, Field, Loading, Message, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";

const configs: Record<string, {
  type: UtilityServiceType;
  title: string;
  recipientLabel: string;
  amountLabel: string;
  description: string;
  needsProduct: boolean;
  showRecipientName?: boolean;
}> = {
  airtime: {
    type: "AIRTIME",
    title: "Airtime",
    recipientLabel: "Phone number",
    amountLabel: "Amount in NGN",
    description: "Run a safe test airtime purchase for a Nigerian phone number.",
    needsProduct: false
  },
  data: {
    type: "DATA",
    title: "Data",
    recipientLabel: "Phone number",
    amountLabel: "Plan amount in NGN",
    description: "Choose a demo data bundle and run a safe test transaction.",
    needsProduct: true
  },
  electricity: {
    type: "ELECTRICITY",
    title: "Electricity",
    recipientLabel: "Meter number",
    amountLabel: "Amount in NGN",
    description: "Validate a demo meter and receive a fictional test token.",
    needsProduct: false,
    showRecipientName: true
  },
  "cable-tv": {
    type: "CABLE_TV",
    title: "Cable TV",
    recipientLabel: "Smartcard / IUC number",
    amountLabel: "Package amount in NGN",
    description: "Choose a demo cable package for a safe test subscription.",
    needsProduct: true
  }
};

const moneyKobo = (value: number) => `NGN ${(value / 100).toLocaleString()}`;
const toKobo = (value: string) => Math.round(Number(value.replace(/[^\d.]/g, "")) * 100);

export default function UtilityServiceFlow() {
  const { service } = useLocalSearchParams<{ service: string }>();
  const config = configs[service ?? ""];
  const [providers, setProviders] = useState<UtilityProviderSummary[]>([]);
  const [products, setProducts] = useState<UtilityProductSummary[]>([]);
  const [providerId, setProviderId] = useState("");
  const [productId, setProductId] = useState("");
  const [recipient, setRecipient] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<UtilityQuoteResult | null>(null);
  const [transaction, setTransaction] = useState<UtilityTransactionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!config) return;
    setLoading(true);
    Promise.all([utilitiesApi.providers(config.type), utilitiesApi.products({ type: config.type })])
      .then(([nextProviders, nextProducts]) => {
        setProviders(nextProviders);
        setProducts(nextProducts);
        setProviderId(nextProviders[0]?.id ?? "");
        const firstProduct = nextProducts.find((product) => product.providerId === nextProviders[0]?.id);
        setProductId(firstProduct?.id ?? "");
        setAmount(firstProduct?.amountKobo ? String(firstProduct.amountKobo / 100) : "");
      })
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setLoading(false));
  }, [config?.type]);

  const providerProducts = useMemo(() => products.filter((product) => product.providerId === providerId), [products, providerId]);
  const selectedProduct = providerProducts.find((product) => product.id === productId);
  const amountKobo = selectedProduct?.amountKobo ?? toKobo(amount);
  const canQuote = !!config && !!providerId && !!recipient.trim() && amountKobo > 0 && (!config.needsProduct || !!productId);

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
        recipientName: recipientName || undefined
      }));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function runTestTransaction() {
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
        recipientName: recipientName || undefined
      }));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  if (!config) return <Protected><Screen title="Bills & Utilities"><Empty message="This utility service is not available." /></Screen></Protected>;

  return <Protected><Screen title={config.title}>
    <Text style={ui.pageIntro}>{config.description}</Text>
    <Message>Bills & Utilities is currently in test mode. No real airtime, data, electricity token or cable subscription will be delivered.</Message>
    <Message error>{error}</Message>
    {loading ? <Loading label={`Loading ${config.title} demo catalogue...`} /> : <>
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
      <Field placeholder={config.amountLabel} value={amount} onChangeText={(value) => { setAmount(value); setQuote(null); setTransaction(null); }} keyboardType="numeric" editable={!selectedProduct?.amountKobo} />
      <Button title={busy ? "Checking..." : "Review Test Transaction"} disabled={busy || !canQuote} onPress={quoteTransaction} />
      {quote ? <Card>
        <Text style={ui.cardTitle}>Confirm test transaction</Text>
        <View style={ui.priceRow}><Text style={ui.priceLabel}>Amount:</Text><Text style={ui.priceValue}>{moneyKobo(quote.amountKobo)}</Text></View>
        <View style={ui.priceRow}><Text style={ui.priceLabel}>Fee:</Text><Text style={ui.priceValue}>{moneyKobo(quote.convenienceFeeKobo)}</Text></View>
        <View style={ui.priceRow}><Text style={ui.sectionTitle}>Total:</Text><Text style={ui.payable}>{moneyKobo(quote.totalKobo)}</Text></View>
        <Text style={ui.quoteText}>Quote: {quote.quoteReference}</Text>
        <Button title={busy ? "Running test..." : "Run Test Transaction"} disabled={busy} onPress={runTestTransaction} />
      </Card> : null}
      {transaction ? <Card>
        <Text style={ui.cardTitle}>Test receipt</Text>
        <Text>Reference: {transaction.reference}</Text>
        <Text>Provider: {transaction.provider.name}</Text>
        <Text>Total: {moneyKobo(transaction.totalKobo)}</Text>
        {transaction.mockToken ? <Text style={ui.otpCode}>{transaction.mockToken}</Text> : null}
        <StatusBadge status={transaction.status} />
        <Text style={ui.muted}>This is a test transaction. No live provider fulfilment occurred.</Text>
        <Button title="View full receipt" tone="muted" onPress={() => router.push(`/utilities/transactions/${transaction.id}`)} />
      </Card> : null}
    </>}
  </Screen></Protected>;
}

const styles = StyleSheet.create({
  option: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, padding: 14 },
  optionActive: { borderColor: brand.colors.primary, backgroundColor: "#FEF2F2" }
});
