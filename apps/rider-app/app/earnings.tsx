import { Feather } from "@expo/vector-icons";
import { brand } from "@karigo/config";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CaptainAccess, CaptainWorkState } from "../src/api/captain-access.api";
import { captainAccessApi } from "../src/api/captain-access.api";
import type { EarningsSummary } from "../src/api/earnings.api";
import { earningsApi } from "../src/api/earnings.api";
import { Card, Empty, Message, Protected, Screen, StatusBadge, ui } from "../src/components/ui";
import { friendlyError, money } from "../src/lib/errors";
import { projectCaptainOperationalState } from "../src/lib/captain-operational-state";

type EarningsFilter = "ALL" | "RIDES" | "DELIVERIES";
type EarningsHistoryRecord = { id: string; mode: "Ride" | "Delivery"; reference: string; amount: string | number; payoutStatus: string; occurredAt: string };

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
      const [resolvedAccess, state] = await Promise.all([captainAccessApi.resolve(), captainAccessApi.workState().catch(() => null)]);
      setAccess(resolvedAccess);
      setWorkState(state);
      if (!projectCaptainOperationalState(resolvedAccess, state).hasAnyActiveMode) {
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
  const deliveryRecords = data?.completedJobs ?? [];
  const rideRecords = data?.completedRides ?? [];
  const availableFilters: EarningsFilter[] = projection.hasActiveRideMode && projection.hasActiveDeliveryMode
    ? ["ALL", "RIDES", "DELIVERIES"] : projection.hasActiveRideMode ? ["RIDES"] : projection.hasActiveDeliveryMode ? ["DELIVERIES"] : [];
  const activeFilter = availableFilters.includes(filter) ? filter : availableFilters[0] ?? "ALL";
  const historyRecords: EarningsHistoryRecord[] = [
    ...rideRecords.map((item) => ({ id: `ride-${item.id}`, mode: "Ride" as const, reference: item.trip?.tripReference ?? item.tripReference, amount: item.riderPayout, payoutStatus: item.payoutStatus, occurredAt: item.trip?.completedAt ?? item.createdAt })),
    ...deliveryRecords.map((item) => ({ id: `delivery-${item.id}`, mode: "Delivery" as const, reference: item.order.orderNumber, amount: item.riderPayout, payoutStatus: item.payoutStatus, occurredAt: item.order.completedAt ?? item.createdAt }))
  ].filter((item) => activeFilter === "ALL" || (activeFilter === "RIDES" ? item.mode === "Ride" : item.mode === "Delivery"))
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  return <Protected><Screen title="Earnings" subtitle={projection.hasAnyActiveMode ? "A clear view of your Captain income." : "Earnings appear after a Captain mode is activated."} refreshing={loading} onRefresh={load}>
    <Message error>{error}</Message>
    {!projection.hasAnyActiveMode ? <Card tone="soft"><Text style={ui.sectionTitle}>Activation pending</Text><Text style={ui.pageIntro}>Earnings unlock when a Captain mode is active.</Text></Card> : <>
      <View style={styles.hero}>
        <View style={styles.heroMetric}><Text style={styles.kicker}>TODAY</Text><Text style={styles.heroValue}>{money(data?.todayEarnings ?? 0)}</Text></View>
        <View style={styles.heroDivider} />
        <View style={styles.heroMetric}><Text style={styles.kicker}>THIS WEEK</Text><Text style={styles.heroValue}>{money(data?.thisWeekEarnings ?? 0)}</Text></View>
      </View>

      <View style={styles.compactGrid}>
        <Metric label="Pending payout" value={money(data?.pendingEarnings ?? 0)} icon="clock" />
        <Metric label="Paid" value={money(data?.paidEarnings ?? 0)} icon="check-circle" />
        <Metric label="Ride earnings" value={money(amountTotal(rideRecords))} icon="navigation" />
        <Metric label="Delivery earnings" value={money(amountTotal(deliveryRecords))} icon="package" />
      </View>

      <View style={styles.sectionHeading}><Text style={ui.sectionTitle}>Earnings history</Text><Text style={styles.totalLabel}>{money(data?.totalEarnings ?? 0)} total</Text></View>
      <View accessibilityRole="tablist" style={styles.filterRow}>
        {availableFilters.map((item) => <Pressable key={item} accessibilityRole="tab" accessibilityLabel={`Show ${item.toLowerCase()} earnings`} accessibilityState={{ selected: activeFilter === item }} onPress={() => setFilter(item)} style={[styles.filterChip, activeFilter === item && styles.filterChipActive]}>
          <Text style={[styles.filterText, activeFilter === item && styles.filterTextActive]}>{item === "ALL" ? "All" : item === "RIDES" ? "Rides" : "Deliveries"}</Text>
        </Pressable>)}
      </View>

      {!historyRecords.length ? <Empty message="Completed Captain earnings will appear here." /> : <View style={styles.historySurface}>
        {historyRecords.map((item, index) => <View key={item.id} style={[styles.historyRow, index < historyRecords.length - 1 && styles.rowDivider]}>
          <View style={styles.historyIcon}><Feather name={item.mode === "Ride" ? "navigation" : "package"} size={17} color={brand.colors.primary} /></View>
          <View style={styles.historyCopy}><Text style={styles.reference}>{item.reference}</Text><Text style={styles.meta}>{item.mode} • {new Date(item.occurredAt).toLocaleDateString()}</Text></View>
          <View style={styles.historyAmount}><Text style={styles.amount}>{money(item.amount)}</Text><StatusBadge status={item.payoutStatus} /></View>
        </View>)}
      </View>}
    </>}
  </Screen></Protected>;
}

function Metric({ label, value, icon }: { label: string; value: string; icon: keyof typeof Feather.glyphMap }) {
  return <View style={styles.metric}><Feather name={icon} size={17} color={brand.colors.primary} /><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  hero: { backgroundColor: brand.colors.charcoal, borderRadius: 24, flexDirection: "row", padding: 18 },
  heroMetric: { flex: 1, gap: 5 },
  heroDivider: { backgroundColor: "rgba(255,255,255,0.2)", marginHorizontal: 14, width: 1 },
  kicker: { color: "#D1D5DB", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  heroValue: { color: brand.colors.white, fontSize: 24, fontWeight: "900", letterSpacing: -0.4 },
  compactGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: { backgroundColor: "#F9FAFB", borderRadius: 16, flexBasis: "47%", flexGrow: 1, gap: 4, padding: 12 },
  metricLabel: { color: brand.colors.muted, fontSize: 11, fontWeight: "700" },
  metricValue: { color: brand.colors.charcoal, fontSize: 16, fontWeight: "900" },
  sectionHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { color: brand.colors.muted, fontSize: 12, fontWeight: "800" },
  filterRow: { flexDirection: "row", gap: 8 },
  filterChip: { alignItems: "center", backgroundColor: "#F3F4F6", borderRadius: 999, justifyContent: "center", minHeight: 42, paddingHorizontal: 16 },
  filterChipActive: { backgroundColor: brand.colors.charcoal },
  filterText: { color: brand.colors.muted, fontWeight: "900" },
  filterTextActive: { color: brand.colors.white },
  historySurface: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 20, borderWidth: 1, overflow: "hidden", paddingHorizontal: 14 },
  historyRow: { alignItems: "center", flexDirection: "row", gap: 10, minHeight: 76, paddingVertical: 10 },
  rowDivider: { borderBottomColor: brand.colors.border, borderBottomWidth: 1 },
  historyIcon: { alignItems: "center", backgroundColor: "#FFF1ED", borderRadius: 12, height: 38, justifyContent: "center", width: 38 },
  historyCopy: { flex: 1, gap: 3 },
  reference: { color: brand.colors.charcoal, fontSize: 14, fontWeight: "900" },
  meta: { color: brand.colors.muted, fontSize: 11.5 },
  historyAmount: { alignItems: "flex-end", gap: 5 },
  amount: { color: brand.colors.charcoal, fontSize: 14, fontWeight: "900" }
});
