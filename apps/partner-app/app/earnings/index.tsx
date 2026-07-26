import { brand } from "@karigo/config";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { partnerApi, VendorSettlement, VendorSettlementFilter, VendorSettlementsResult } from "../../src/api/partner.api";
import { AuthGate } from "../../src/components/auth-gate";
import { Badge, Card, EmptyState, Hero, LoadingState, MutedText, PrimaryButton, Screen, StatCard } from "../../src/components/ui";
import { formatLabel, money, statusTone } from "../../src/lib/labels";

const filters: Array<{ value: VendorSettlementFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Paid" }
];

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : "Not yet";
}

function SettlementCard({ settlement }: { settlement: VendorSettlement }) {
  return (
    <Card>
      <View style={styles.row}>
        <Text style={styles.title}>{settlement.orderNumber}</Text>
        <Badge label={formatLabel(settlement.settlementStatus)} tone={statusTone(settlement.settlementStatus)} />
      </View>
      <Text style={styles.amount}>{money(settlement.settlementAmount)}</Text>
      <MutedText>Order subtotal: {money(settlement.grossOrderSubtotal)}</MutedText>
      <MutedText>Platform fee: {money(settlement.platformFee)} at {Number(settlement.commissionRate)}%</MutedText>
      <MutedText>Completed: {formatDate(settlement.orderCompletedAt)} - Paid: {formatDate(settlement.paidAt)}</MutedText>
      {settlement.payoutReference ? <MutedText>Reference: {settlement.payoutReference}</MutedText> : null}
    </Card>
  );
}

function EarningsContent() {
  const router = useRouter();
  const [filter, setFilter] = useState<VendorSettlementFilter>("ALL");
  const [result, setResult] = useState<VendorSettlementsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false, nextFilter = filter) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setResult(await partnerApi.settlements(nextFilter));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Earnings could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function selectFilter(nextFilter: VendorSettlementFilter) {
    setFilter(nextFilter);
    await load(false, nextFilter);
  }

  if (loading) return <LoadingState label="Loading earnings..." />;

  const summary = result?.summary;
  const settlements = result?.items ?? [];

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
      <Hero eyebrow="Settlements" title="Earnings" subtitle="Track order settlement visibility. Automated payouts remain disabled and controlled by KariGO operations." />
      {error ? <MutedText>{error}</MutedText> : null}
      <View style={styles.statsRow}>
        <StatCard label="Settlements" value={summary?.totalSettlements ?? 0} />
        <StatCard label="Pending" value={money(summary?.pendingPayout ?? 0)} />
        <StatCard label="Paid out" value={money(summary?.paidOut ?? 0)} />
      </View>
      <Card>
        <Text style={styles.title}>Payout account</Text>
        <MutedText>Add or update bank details for future manual settlement verification. This screen does not send money.</MutedText>
        <PrimaryButton label="Manage payout account" onPress={() => router.push("/payout")} variant="secondary" />
      </Card>
      <View style={styles.filterRow}>
        {filters.map((item) => {
          const active = item.value === filter;
          return (
            <Pressable
              accessibilityRole="button"
              key={item.value}
              onPress={() => void selectFilter(item.value)}
              style={[styles.filterButton, active ? styles.filterButtonActive : null]}
            >
              <Text style={[styles.filterText, active ? styles.filterTextActive : null]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {settlements.length === 0 ? (
        <EmptyState title="No settlement records yet" body="Settlement records will appear after completed eligible orders are reviewed." />
      ) : (
        settlements.map((settlement) => <SettlementCard key={settlement.id} settlement={settlement} />)
      )}
    </Screen>
  );
}

export default function EarningsScreen() {
  return (
    <AuthGate>
      <EarningsContent />
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    gap: 10
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  title: {
    flex: 1,
    color: brand.colors.charcoal,
    fontSize: 16,
    fontWeight: "900"
  },
  amount: {
    color: brand.colors.charcoal,
    fontSize: 20,
    fontWeight: "900"
  },
  filterRow: {
    flexDirection: "row",
    gap: 8
  },
  filterButton: {
    borderWidth: 1,
    borderColor: brand.colors.border,
    borderRadius: 999,
    backgroundColor: brand.colors.white,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  filterButtonActive: {
    borderColor: brand.colors.primary,
    backgroundColor: "#FEF2F2"
  },
  filterText: {
    color: brand.colors.muted,
    fontWeight: "900"
  },
  filterTextActive: {
    color: brand.colors.primary
  }
});
