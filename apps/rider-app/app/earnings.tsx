import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { brand } from "@karigo/config";
import type { CaptainAccess, CaptainWorkState } from "../src/api/captain-access.api";
import { captainAccessApi } from "../src/api/captain-access.api";
import type { EarningsSummary } from "../src/api/earnings.api";
import { earningsApi } from "../src/api/earnings.api";
import { Card, Empty, Message, Protected, Screen, StatusBadge, ui } from "../src/components/ui";
import { friendlyError, money } from "../src/lib/errors";
import { projectCaptainOperationalState } from "../src/lib/captain-operational-state";

type EarningsFilter = "ALL" | "RIDES" | "DELIVERIES";
type EarningsHistoryRecord = {
  id: string;
  mode: "Ride" | "Delivery";
  reference: string;
  amount: string | number;
  payoutStatus: string;
  occurredAt: string;
};

function amountTotal(records: Array<{ riderPayout: string | number }>) {
  return records.reduce((total, record) => total + Number(record.riderPayout ?? 0), 0);
}

export default function Earnings() {
  const [data, setData] = useState<EarningsSummary | null>(null);
  const [access, setAccess] = useState<CaptainAccess | null>(null);
  const [workState, setWorkState] = useState<CaptainWorkState | null>(null);
  const [filter, setFilter] = useState<EarningsFilter>("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [resolvedAccess, state] = await Promise.all([
        captainAccessApi.resolve(),
        captainAccessApi.workState().catch(() => null)
      ]);
      setAccess(resolvedAccess);
      setWorkState(state);
      const projection = projectCaptainOperationalState(resolvedAccess, state);
      if (!projection.hasAnyActiveMode) {
        setData(null);
        setError("");
        return;
      }
      setData(await earningsApi.summary());
      setError("");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const projection = useMemo(() => projectCaptainOperationalState(access, workState), [access, workState]);
  const hasAnyActiveMode = projection.hasAnyActiveMode;
  const deliveryRecords = data?.completedJobs ?? [];
  const rideRecords = data?.completedRides ?? [];
  const availableFilters: EarningsFilter[] = projection.hasActiveRideMode && projection.hasActiveDeliveryMode
    ? ["ALL", "RIDES", "DELIVERIES"]
    : projection.hasActiveRideMode
      ? ["RIDES"]
      : projection.hasActiveDeliveryMode
        ? ["DELIVERIES"]
        : [];
  const activeFilter = availableFilters.includes(filter) ? filter : availableFilters[0] ?? "ALL";
  const historyRecords: EarningsHistoryRecord[] = [
    ...rideRecords.map((item) => ({
      id: `ride-${item.id}`,
      mode: "Ride" as const,
      reference: item.trip?.tripReference ?? item.tripReference,
      amount: item.riderPayout,
      payoutStatus: item.payoutStatus,
      occurredAt: item.trip?.completedAt ?? item.createdAt
    })),
    ...deliveryRecords.map((item) => ({
      id: `delivery-${item.id}`,
      mode: "Delivery" as const,
      reference: item.order.orderNumber,
      amount: item.riderPayout,
      payoutStatus: item.payoutStatus,
      occurredAt: item.order.completedAt ?? item.createdAt
    }))
  ]
    .filter((item) => activeFilter === "ALL" || (activeFilter === "RIDES" ? item.mode === "Ride" : item.mode === "Delivery"))
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  return <Protected><Screen title="Earnings" subtitle={hasAnyActiveMode ? "Track your KariGO Captain earnings." : "Earnings become available after a Captain mode is activated."} refreshing={loading} onRefresh={load}><Message error>{error}</Message>
    {!hasAnyActiveMode ? <Card tone="soft">
      <Text style={ui.sectionTitle}>Activation pending</Text>
      <Text style={ui.pageIntro}>Earnings unlock after KariGO activates at least one Captain mode.</Text>
    </Card> : <>
    <Card tone="soft">
      <Text style={ui.sectionTitle}>Captain earnings</Text>
      <View style={styles.summaryGrid}>
        <View style={styles.statBox}><Text style={ui.muted}>Total earnings</Text><Text style={styles.total}>{money(data?.totalEarnings ?? 0)}</Text></View>
        <View style={styles.statBox}><Text style={ui.muted}>Pending payout</Text><Text style={styles.total}>{money(data?.pendingEarnings ?? 0)}</Text></View>
      </View>
      <View style={styles.summaryGrid}>
        <View style={styles.statBox}><Text style={ui.muted}>Paid</Text><Text style={styles.metric}>{money(data?.paidEarnings ?? 0)}</Text></View>
        <View style={styles.statBox}><Text style={ui.muted}>Ride earnings</Text><Text style={styles.metric}>{money(amountTotal(rideRecords))}</Text></View>
        <View style={styles.statBox}><Text style={ui.muted}>Delivery earnings</Text><Text style={styles.metric}>{money(amountTotal(deliveryRecords))}</Text></View>
      </View>
      <Text style={ui.pageIntro}>Your earnings will appear here after you complete a Ride or Delivery.</Text>
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Recent activity</Text>
      <Text style={styles.grandTotal}>{money(data?.todayEarnings ?? 0)}</Text>
      <Text style={ui.muted}>Today across active Captain modes.</Text>
      <View style={styles.summaryGrid}>
        <View style={styles.statBox}><Text style={ui.muted}>This week</Text><Text style={styles.metric}>{money(data?.thisWeekEarnings ?? 0)}</Text></View>
        <View style={styles.statBox}><Text style={ui.muted}>Completed Rides</Text><Text style={styles.metric}>{data?.completedRidesCount ?? rideRecords.length}</Text></View>
        <View style={styles.statBox}><Text style={ui.muted}>Completed Deliveries</Text><Text style={styles.metric}>{data?.completedDeliveriesCount ?? deliveryRecords.length}</Text></View>
      </View>
      <Text style={ui.muted}>KariGO Operations reviews and records settlements outside the Captain app.</Text>
    </Card>

    <View style={styles.filterRow}>
      {availableFilters.map((item) => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filterChip, activeFilter === item && styles.filterChipActive]}>
        <Text style={[styles.filterText, activeFilter === item && styles.filterTextActive]}>{item === "ALL" ? "All" : item === "RIDES" ? "Rides" : "Deliveries"}</Text>
      </Pressable>)}
    </View>

    <Text style={ui.sectionTitle}>Earnings history</Text>
    {!historyRecords.length ? <Empty message="Completed Captain earnings will appear here." /> : historyRecords.map((item) => <Card key={item.id}>
      <View style={ui.spaceBetween}><Text style={ui.sectionTitle}>{item.reference}</Text><StatusBadge status={item.payoutStatus} /></View>
      <Text style={styles.modeLabel}>{item.mode}</Text>
      <Text style={styles.metric}>{money(item.amount)}</Text>
      <Text style={ui.muted}>{new Date(item.occurredAt).toLocaleString()}</Text>
    </Card>)}
    </>}
  </Screen></Protected>;
}

const styles = StyleSheet.create({
  grandTotal: { color: brand.colors.charcoal, fontSize: 34, fontWeight: "900", letterSpacing: -0.5 },
  total: { color: brand.colors.charcoal, fontSize: 24, fontWeight: "900", letterSpacing: -0.3 },
  metric: { color: brand.colors.charcoal, fontSize: 20, fontWeight: "900" },
  summaryGrid: { gap: 12 },
  statBox: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, gap: 4, padding: 12 },
  modeLabel: { color: brand.colors.primary, fontSize: 12, fontWeight: "900", letterSpacing: 0.6, textTransform: "uppercase" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: { backgroundColor: "#F3F4F6", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  filterChipActive: { backgroundColor: brand.colors.charcoal },
  filterText: { color: brand.colors.muted, fontWeight: "900" },
  filterTextActive: { color: brand.colors.white }
});
