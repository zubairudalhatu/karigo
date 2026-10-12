import { useEffect, useRef, useState } from "react";
import { Alert, Text } from "react-native";
import { GotvAcceptanceAccount, GotvAcceptanceQuote, utilitiesApi } from "../../src/api/utilities.api";
import { Button, Card, Field, Loading, Message, Protected, Screen, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";

const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export default function GotvAcceptanceScreen() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [recipient, setRecipient] = useState("");
  const [account, setAccount] = useState<GotvAcceptanceAccount | null>(null);
  const [productId, setProductId] = useState("");
  const [quote, setQuote] = useState<GotvAcceptanceQuote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("");
  const submittedRef = useRef(false);
  const recipientRef = useRef(recipient);
  useEffect(() => { let active = true; utilitiesApi.gotvAcceptanceAccess().then(() => { if (active) setAllowed(true); }).catch(() => { if (active) setAllowed(false); }); return () => { active = false; }; }, []);

  function changeRecipient(value: string) {
    recipientRef.current = value;
    setRecipient(value); setAccount(null); setProductId(""); setQuote(null); setError("");
  }
  async function validate() {
    if (busy) return;
    const submitted = recipient;
    setBusy(true); setError(""); setAccount(null); setQuote(null); setProductId("");
    try { const result = await utilitiesApi.gotvAcceptanceValidate(submitted); if (recipientRef.current === submitted) setAccount(result); }
    catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }
  async function review() {
    if (busy || !account || !productId) return;
    setBusy(true); setError(""); setQuote(null);
    try { setQuote(await utilitiesApi.gotvAcceptanceQuote(recipient, productId)); }
    catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }
  function confirmPayment() {
    if (busy || submittedRef.current || !quote?.paymentAllowed || !quote.paymentToken) return;
    if (Date.now() >= quote.expiresAt) { setError("Quote expired. Review subscription again before confirming."); return; }
    const acceptedQuote = quote;
    Alert.alert("Confirm one GOtv subscription", `Pay ${naira(acceptedQuote.totalKobo)} for ${acceptedQuote.product.name}? This submits one purchase.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm payment", onPress: () => {
        if (submittedRef.current) return;
        submittedRef.current = true; setSubmitted(true); setBusy(true); setError("");
        void utilitiesApi.gotvAcceptancePay(recipient, acceptedQuote.paymentToken!).then(result => {
          setPaymentStatus(result.status === "PROCESSING" || result.status === "PENDING" ? "Your GOtv subscription is being confirmed. Do not pay again." : `GOtv payment status: ${result.status}. Open Orders → Utilities for the receipt.`);
        }).catch(() => { setPaymentStatus("Payment outcome needs confirmation. Do not pay again. Check Orders → Utilities before any further action."); }).finally(() => setBusy(false));
      } }
    ]);
  }
  return <Protected><Screen title="GOtv account verification">
    {allowed === null ? <Loading /> : !allowed ? <Message>This verification flow is not available for this account.</Message> : <>
      <Message>Public Cable TV remains temporarily unavailable. This account can review one controlled GOtv Jolli acceptance purchase.</Message>
      <Message>{paymentStatus}</Message>
      <Message error>{error}</Message>
      <Card>
        <Field placeholder="GOtv IUC" value={recipient} onChangeText={changeRecipient} keyboardType="number-pad" editable={!busy && !submitted} maxLength={20} />
        <Button title={busy ? "Checking..." : "Verify GOtv account"} disabled={busy || submitted || !/^\d{6,20}$/.test(recipient)} onPress={() => void validate()} />
      </Card>
      {account ? <Card>
        <Text style={ui.cardTitle}>Account verified</Text>
        {account.recipientName ? <Text>Customer: {account.recipientName}</Text> : <Text>GOtv did not supply a customer name.</Text>}
        <Text>IUC: {account.recipient}</Text>
        <Text style={ui.cardTitle}>Select a bouquet</Text>
        {account.products.map(product => <Button key={product.id} title={`${product.name} · ${naira(product.amountKobo)}`} tone={productId === product.id ? "primary" : "muted"} disabled={busy || submitted} onPress={() => { setProductId(product.id); setQuote(null); }} />)}
        <Button title="Review subscription" disabled={busy || submitted || !productId} onPress={() => void review()} />
      </Card> : null}
      {quote ? <Card>
        <Text style={ui.cardTitle}>CABLE TV SUBSCRIPTION</Text>
        <Text>Provider: {quote.provider}</Text>
        {quote.recipientName ? <Text>Customer: {quote.recipientName}</Text> : null}
        <Text>IUC: {quote.recipient}</Text>
        <Text>Bouquet: {quote.product.name}</Text>
        <Text>Amount: {naira(quote.amountKobo)}</Text>
        <Text>Fee: {naira(quote.convenienceFeeKobo)}</Text>
        <Text>Total: {naira(quote.totalKobo)}</Text>
        <Text>Wallet before: {naira(quote.walletBeforeKobo)}</Text>
        <Text>Projected wallet after: {naira(quote.projectedWalletAfterKobo)}</Text>
        <Message>Only confirm payment after explicit owner approval. Do not pay again if the outcome is pending.</Message>
        <Button title={quote.paymentAllowed ? "Pay GOtv Jolli" : "Pay — not enabled"} disabled={busy || submitted || !quote.paymentAllowed} onPress={quote.paymentAllowed ? confirmPayment : undefined} />
      </Card> : null}
    </>}
  </Screen></Protected>;
}
