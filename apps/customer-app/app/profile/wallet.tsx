import { Feather } from "@expo/vector-icons";
import { brand } from "@karigo/config";
import type { PublicPaymentConfig } from "@karigo/shared-types";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CustomerWalletLedgerResult, walletApi, WalletLedgerDirection, WalletLedgerEntryType } from "../../src/api/wallet.api";
import { paymentsApi } from "../../src/api/payments.api";
import { Button, Card, Empty, Field, Loading, Message, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { friendlyError, money } from "../../src/lib/errors";
import { isExternalPaymentAuthorizationUrl, isMockAuthorizationUrl, openExternalPaymentUrl, paymentAuthorizationUrlFrom } from "../../src/lib/payment-flow";
import { fallbackCustomerPaymentConfig } from "../../src/lib/payment-status";

const titleForType: Record<WalletLedgerEntryType, string> = {
  TOP_UP: "Top-up",
  REFUND: "Refund",
  ADMIN_ADJUSTMENT: "Admin adjustment",
  ORDER_PAYMENT: "Order payment",
  SERVICE_PAYMENT: "Service payment",
  REVERSAL: "Reversal",
  REFERRAL_REWARD: "Referral reward"
};

function signedAmount(direction: WalletLedgerDirection, amount: string | number) {
  return `${direction === "CREDIT" ? "+" : "-"}${money(amount)}`;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Not yet";
}

export default function CustomerWalletScreen() {
  const [data, setData] = useState<CustomerWalletLedgerResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpBusy, setTopUpBusy] = useState(false);
  const [topUpMessage, setTopUpMessage] = useState("");
  const [topUpError, setTopUpError] = useState("");
  const [pendingTopUpReference, setPendingTopUpReference] = useState("");
  const [pendingTopUpUrl, setPendingTopUpUrl] = useState("");
  const [paymentConfig, setPaymentConfig] = useState<PublicPaymentConfig>(fallbackCustomerPaymentConfig);
  const [paymentConfigError, setPaymentConfigError] = useState("");

  const load = async () => {
    setError("");
    try {
      setData(await walletApi.transactions());
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  async function loadPaymentConfig() {
    try {
      setPaymentConfig(await paymentsApi.publicConfig());
      setPaymentConfigError("");
    } catch {
      setPaymentConfig(fallbackCustomerPaymentConfig);
      setPaymentConfigError("Wallet top-up availability could not be refreshed. Please retry.");
    }
  }

  useEffect(() => {
    void load();
    void loadPaymentConfig();
  }, []);

  async function initiateTopUp() {
    if (!paymentConfig.walletTopUpEnabled) {
      setTopUpError("Wallet top-up is not available from backend config right now.");
      return;
    }
    const amount = Number(topUpAmount);
    const minimumAmount = paymentConfig.walletMinimumTopUpAmount ?? 100;
    if (!Number.isFinite(amount) || amount < minimumAmount) {
      setTopUpError(`Enter a top-up amount of at least ${money(minimumAmount)}.`);
      return;
    }
    setTopUpBusy(true);
    setTopUpError("");
    setTopUpMessage("");
    try {
      const result = await walletApi.initiateTopUp(amount);
      const url = paymentAuthorizationUrlFrom(result.authorization);
      if (isExternalPaymentAuthorizationUrl(url)) {
        const openResult = await openExternalPaymentUrl(url);
        if (!openResult.opened) throw new Error(openResult.message);
        setPendingTopUpReference(result.payment.transactionReference);
        setPendingTopUpUrl(url);
        setTopUpMessage("Squad wallet top-up checkout opened. Return here and verify after completing payment. Pending verification.");
      } else if (isMockAuthorizationUrl(url)) {
        await walletApi.verifyTopUp(result.payment.transactionReference);
        setTopUpMessage("Wallet top-up verified.");
        setPendingTopUpReference("");
        setPendingTopUpUrl("");
        await load();
      } else if (!url) {
        throw new Error("Wallet top-up provider did not return a checkout link.");
      } else {
        throw new Error("Wallet top-up provider returned an invalid checkout link.");
      }
    } catch (e) {
      setTopUpError(friendlyError(e));
    } finally {
      setTopUpBusy(false);
    }
  }

  async function verifyTopUp() {
    if (!pendingTopUpReference) return;
    setTopUpBusy(true);
    setTopUpError("");
    try {
      await walletApi.verifyTopUp(pendingTopUpReference);
      setTopUpMessage("Wallet top-up verified and balance updated.");
      setPendingTopUpReference("");
      setPendingTopUpUrl("");
      setTopUpAmount("");
      await load();
    } catch (e) {
      setTopUpError(`Payment is still pending verification. ${friendlyError(e)}`);
    } finally {
      setTopUpBusy(false);
    }
  }

  async function reopenTopUpAuthorization() {
      if (!pendingTopUpUrl) return;
    setTopUpBusy(true);
    setTopUpError("");
    try {
      const openResult = await openExternalPaymentUrl(pendingTopUpUrl);
      if (!openResult.opened) throw new Error(openResult.message);
      setTopUpMessage("Squad wallet top-up checkout reopened. Return here and verify after completing payment.");
    } catch (e) {
      setTopUpError(friendlyError(e));
    } finally {
      setTopUpBusy(false);
    }
  }

  if (loading && !data) return <Protected><Loading label="Loading wallet..." /></Protected>;

  const wallet = data?.wallet;

  return <Protected>
    <Screen title="KariGO Wallet" refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); void loadPaymentConfig(); }}>
      <Message error>{error}</Message>
      <Message error>{paymentConfigError}</Message>

      {wallet ? <View style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <View style={styles.walletIcon}><Feather name="credit-card" size={22} color={brand.colors.primary} /></View>
          <StatusBadge status={wallet.status} />
        </View>
        <Text style={styles.balanceLabel}>Available balance</Text>
        <Text style={styles.balanceValue}>{money(wallet.availableBalance)}</Text>
        <Text style={styles.balanceMeta}>Ledger balance: {money(wallet.ledgerBalance)} - {wallet.currency}</Text>
        <Text style={styles.balanceMeta}>Last activity: {formatDate(wallet.lastActivityAt)}</Text>
      </View> : null}

      <Card>
        <Text style={ui.cardTitle}>Wallet safety status</Text>
        <Text style={ui.muted}>KariGO Wallet top-up and wallet checkout are controlled launch features. Top-up credits only after backend payment verification. Withdrawals, automatic refunds, referral rewards and subscription billing remain disabled.</Text>
      </Card>

      <Card>
        <Text style={ui.cardTitle}>Top up wallet</Text>
        <Text style={ui.muted}>Provider: {paymentConfig.walletTopUpProviderLabel ?? "Squad by GTBank"}</Text>
        <Text style={ui.muted}>Minimum amount: {money(paymentConfig.walletMinimumTopUpAmount ?? 100)}</Text>
        <Text style={ui.muted}>{paymentConfig.walletTopUpEnabled ? "Enter an amount, complete Squad checkout, return to KariGO, then verify. KariGO will not credit the wallet from the app alone." : "Wallet top-up is disabled by backend configuration. KariGO will show the action only when operations enables it."}</Text>
        <Message>{topUpMessage}</Message>
        <Message error>{topUpError}</Message>
        <Field keyboardType="decimal-pad" value={topUpAmount} onChangeText={setTopUpAmount} placeholder="Amount e.g. 5000" />
        <Button title={topUpBusy ? "Starting top-up..." : "Start wallet top-up"} onPress={initiateTopUp} disabled={topUpBusy || !!pendingTopUpReference || !paymentConfig.walletTopUpEnabled} />
        {pendingTopUpUrl ? <Button title="Open Squad checkout again" tone="muted" onPress={reopenTopUpAuthorization} disabled={topUpBusy} /> : null}
        {pendingTopUpReference ? <Button title={topUpBusy ? "Verifying..." : "Verify wallet top-up"} onPress={verifyTopUp} disabled={topUpBusy} /> : null}
        {pendingTopUpReference ? <Text style={ui.muted}>Pending verification. Your balance updates only after backend verification or webhook confirmation.</Text> : null}
        <Text style={ui.muted}>Wallet order payment: {paymentConfig.walletPaymentsEnabled ? "Available when your balance covers an order." : "Disabled by backend config until wallet payments are enabled."}</Text>
      </Card>

      <Card>
        <Text style={ui.cardTitle}>Controlled wallet features</Text>
        <View style={styles.guardrailGrid}>
          {["Withdraw", "Automatic refunds", "Referral rewards", "Subscriptions"].map((label) => <View style={styles.guardrailChip} key={label}>
            <Text style={styles.guardrailText}>{label} - Approval required</Text>
          </View>)}
        </View>
      </Card>

      <Card>
        <Text style={ui.cardTitle}>Wallet activity</Text>
        {!data?.items.length ? <Empty message="Wallet transactions will appear here after KariGO records approved wallet activity." /> : data.items.map((entry) => (
          <View style={styles.ledgerRow} key={entry.id}>
            <View style={styles.ledgerIcon}>
              <Feather name={entry.direction === "CREDIT" ? "arrow-down-left" : "arrow-up-right"} size={18} color={entry.direction === "CREDIT" ? brand.colors.success : brand.colors.primary} />
            </View>
            <View style={styles.ledgerCopy}>
              <Text style={styles.ledgerTitle}>{entry.description || titleForType[entry.entryType]}</Text>
              <Text style={ui.muted}>{titleForType[entry.entryType]} - {formatDate(entry.postedAt ?? entry.createdAt)}</Text>
              <Text style={styles.referenceText}>{entry.reference}</Text>
            </View>
            <View style={styles.ledgerAmount}>
              <Text style={[styles.amountText, entry.direction === "CREDIT" ? styles.credit : styles.debit]}>{signedAmount(entry.direction, entry.amount)}</Text>
              <Text style={ui.muted}>Bal. {money(entry.balanceAfter)}</Text>
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  </Protected>;
}

const styles = StyleSheet.create({
  amountText: { fontSize: 15, fontWeight: "900", textAlign: "right" },
  balanceCard: { backgroundColor: brand.colors.charcoal, borderRadius: 28, gap: 8, padding: 20 },
  balanceHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  balanceLabel: { color: brand.colors.white, fontSize: 13, fontWeight: "800", opacity: 0.82 },
  balanceMeta: { color: brand.colors.white, fontSize: 13, opacity: 0.76 },
  balanceValue: { color: brand.colors.white, fontSize: 34, fontWeight: "900", letterSpacing: -0.5 },
  credit: { color: brand.colors.success },
  debit: { color: brand.colors.primary },
  guardrailChip: { backgroundColor: "#F9FAFB", borderColor: brand.colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  guardrailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  guardrailText: { color: brand.colors.charcoal, fontSize: 12, fontWeight: "800" },
  ledgerAmount: { alignItems: "flex-end", gap: 2 },
  ledgerCopy: { flex: 1, gap: 3 },
  ledgerIcon: { alignItems: "center", backgroundColor: "#F9FAFB", borderRadius: 999, height: 38, justifyContent: "center", width: 38 },
  ledgerRow: { alignItems: "center", borderBottomColor: brand.colors.border, borderBottomWidth: 1, flexDirection: "row", gap: 12, paddingVertical: 12 },
  ledgerTitle: { color: brand.colors.charcoal, fontSize: 15, fontWeight: "900" },
  referenceText: { color: brand.colors.muted, fontSize: 11 },
  walletIcon: { alignItems: "center", backgroundColor: brand.colors.white, borderRadius: 999, height: 42, justifyContent: "center", width: 42 }
});
