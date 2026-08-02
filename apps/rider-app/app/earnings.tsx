import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { brand } from "@karigo/config";
import type { CaptainAccess } from "../src/api/captain-access.api";
import { captainAccessApi } from "../src/api/captain-access.api";
import { earningsApi, EarningsSummary } from "../src/api/earnings.api";
import { Card, Empty, Message, Protected, Screen, StatusBadge, ui } from "../src/components/ui";
import { friendlyError, money } from "../src/lib/errors";
import { projectCaptainOperationalState } from "../src/lib/captain-operational-state";

type EarningsFilter = "ALL" | "RIDES" | "DELIVERIES";

export default function Earnings() {
  const [data, setData] = useState<EarningsSummary | null>(null);
  const [access, setAccess] = useState<CaptainAccess | null>(null);
  const [filter, setFilter] = useState<EarningsFilter>("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const resolvedAccess = await captainAccessApi.resolve();
      setAccess(resolvedAccess);
      const projection = projectCaptainOperationalState(resolvedAccess);
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

  const projection = useMemo(() => projectCaptainOperationalState(access), [access]);
  const hasAnyActiveMode = projection.hasAnyActiveMode;
  const deliveryRecords = data?.completedJobs ?? [];
  const rideRecords = data?.completedRides ?? [];
  const showDeliveryRecords = filter === "ALL" || filter === "DELIVERIES";
  const showRideRecords = filter === "ALL" || filter === "RIDES";

  return <Protected><Screen title="Earnings" subtitle={hasAnyActiveMode ? "Track recorded Ride and Delivery earnings." : "Earnings become available after a Captain mode is activated."} refreshing={loading} onRefresh={load}><Message error>{error}</Message>
    {!hasAnyActiveMode ? <Card tone="soft">
      <Text style={ui.sectionTitle}>Activation pending</Text>
      <Text style={ui.pageIntro}>Earnings unlock after KariGO activates at least one Captain mode.</Text>
    </Card> : <>
    <Card tone="soft">
      <Text style={ui.sectionTitle}>Earnings</Text>
      <View style={styles.summaryGrid}>
        <View style={styles.statBox}><Text style={ui.muted}>Today</Text><Text style={styles.total}>{money(data?.todayEarnings ?? 0)}</Text></View>
        <View style={styles.statBox}><Text style={ui.muted}>This week</Text><Text style={styles.total}>{money(data?.thisWeekEarnings ?? 0)}</Text></View>
      </View>
      <View style={styles.summaryGrid}>
        <View style={styles.statBox}><Text style={ui.muted}>Completed Rides</Text><Text style={styles.metric}>{data?.completedRidesCount ?? rideRecords.length}</Text></View>
        <View style={styles.statBox}><Text style={ui.muted}>Completed Deliveries</Text><Text style={styles.metric}>{data?.completedDeliveriesCount ?? deliveryRecords.length}</Text></View>
      </View>
      <Text style={ui.pageIntro}>Your earnings will appear here after you complete a Ride or Delivery.</Text>
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Recorded totals</Text>
      <Text style={styles.grandTotal}>{money(data?.totalEarnings ?? 0)}</Text>
      <Text style={ui.muted}>Payout automation is not enabled. KariGO Operations will handle settlement review separately.</Text>
      <View style={styles.summaryGrid}>
        <View style={styles.statBox}><Text style={ui.muted}>Pending</Text><Text style={styles.metric}>{money(data?.pendingEarnings ?? 0)}</Text></View>
        <View style={styles.statBox}><Text style={ui.muted}>Marked paid</Text><Text style={styles.metric}>{money(data?.paidEarnings ?? 0)}</Text></View>
      </View>
    </Card>

    <View style={styles.filterRow}>
      {(["ALL", "RIDES", "DELIVERIES"] as EarningsFilter[]).map((item) => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filterChip, filter === item && styles.filterChipActive]}>
        <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item === "ALL" ? "All" : item === "RIDES" ? "Rides" : "Deliveries"}</Text>
      </Pressable>)}
    </View>

    {showRideRecords ? <>
      <Text style={ui.sectionTitle}>Ride earnings</Text>
      {!rideRecords.length ? <Empty message="Completed Ride earnings will appear here." /> : rideRecords.map((item) => <Card key={item.id}>
        <View style={ui.spaceBetween}><Text style={ui.sectionTitle}>{item.trip.tripReference}</Text><StatusBadge status={item.payoutStatus} /></View>
        <Text style={styles.metric}>{money(item.riderPayout)}</Text>
        <Text style={ui.muted}>{new Date(item.trip.completedAt ?? item.createdAt).toLocaleString()}</Text>
      </Card>)}
    </> : null}

    {showDeliveryRecords ? <>
      <Text style={ui.sectionTitle}>Delivery earnings</Text>
      {!deliveryRecords.length ? <Empty message="Completed Delivery earnings will appear here." /> : deliveryRecords.map((item) => <Card key={item.id}>
        <View style={ui.spaceBetween}><Text style={ui.sectionTitle}>{item.order.orderNumber}</Text><StatusBadge status={item.payoutStatus} /></View>
        <Text style={styles.metric}>{money(item.riderPayout)}</Text>
        <Text style={ui.muted}>{new Date(item.order.completedAt ?? item.createdAt).toLocaleString()}</Text>
      </Card>)}
    </> : null}
    </>}
  </Screen></Protected>;
}

const styles = StyleSheet.create({
  grandTotal: { color: brand.colors.charcoal, fontSize: 34, fontWeight: "900", letterSpacing: -0.5 },
  total: { color: brand.colors.charcoal, fontSize: 24, fontWeight: "900", letterSpacing: -0.3 },
  metric: { color: brand.colors.charcoal, fontSize: 20, fontWeight: "900" },
  summaryGrid: { gap: 12 },
  statBox: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, gap: 4, padding: 12 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: { backgroundColor: "#F3F4F6", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  filterChipActive: { backgroundColor: brand.colors.charcoal },
  filterText: { color: brand.colors.muted, fontWeight: "900" },
  filterTextActive: { color: brand.colors.white }
});
