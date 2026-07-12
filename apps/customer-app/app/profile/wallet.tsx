import { Feather } from "@expo/vector-icons";
import { brand } from "@karigo/config";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CustomerWalletLedgerResult, walletApi, WalletLedgerDirection, WalletLedgerEntryType } from "../../src/api/wallet.api";
import { Card, Empty, Loading, Message, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { friendlyError, money } from "../../src/lib/errors";

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

  useEffect(() => { void load(); }, []);

  if (loading && !data) return <Protected><Loading label="Loading wallet..." /></Protected>;

  const wallet = data?.wallet;

  return <Protected>
    <Screen title="KariGO Wallet" refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }}>
      <Message error>{error}</Message>

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
        <Text style={ui.muted}>Wallet is currently view-only for staging. KariGO has not enabled live top-up, withdrawals, automatic refunds, wallet checkout, referral rewards or subscription billing.</Text>
      </Card>

      <Card>
        <Text style={ui.cardTitle}>Available later</Text>
        <View style={styles.guardrailGrid}>
          {["Top up", "Withdraw", "Pay with wallet", "Referral rewards"].map((label) => <View style={styles.guardrailChip} key={label}>
            <Text style={styles.guardrailText}>{label} - Coming soon</Text>
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
