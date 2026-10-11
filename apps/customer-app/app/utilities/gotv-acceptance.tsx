import { useEffect, useRef, useState } from "react";
import { Text } from "react-native";
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
  return <Protected><Screen title="GOtv account verification">
    {allowed === null ? <Loading /> : !allowed ? <Message>This verification flow is not available for this account.</Message> : <>
      <Message>Cable TV remains temporarily unavailable. You can verify this account and review a bouquet here. Payment is disabled.</Message>
      <Message error>{error}</Message>
      <Card>
        <Field placeholder="GOtv IUC" value={recipient} onChangeText={changeRecipient} keyboardType="number-pad" editable={!busy} maxLength={20} />
        <Button title={busy ? "Checking..." : "Verify GOtv account"} disabled={busy || !/^\d{6,20}$/.test(recipient)} onPress={() => void validate()} />
      </Card>
      {account ? <Card>
        <Text style={ui.cardTitle}>Account verified</Text>
        {account.recipientName ? <Text>Customer: {account.recipientName}</Text> : <Text>GOtv did not supply a customer name.</Text>}
        <Text>IUC: {account.recipient}</Text>
        <Text style={ui.cardTitle}>Select a bouquet</Text>
        {account.products.map(product => <Button key={product.id} title={`${product.name} · ${naira(product.amountKobo)}`} tone={productId === product.id ? "primary" : "muted"} disabled={busy} onPress={() => { setProductId(product.id); setQuote(null); }} />)}
        <Button title="Review subscription" disabled={busy || !productId} onPress={() => void review()} />
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
        <Message>Review only. No payment will be submitted.</Message>
        <Button title="Pay — not enabled" disabled />
      </Card> : null}
    </>}
  </Screen></Protected>;
}
