import { Feather } from "@expo/vector-icons";
import { brand } from "@karigo/config";
import type { TaxiTrip } from "@karigo/shared-types";
import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CaptainAccess, CaptainWorkState } from "../../src/api/captain-access.api";
import { captainAccessApi } from "../../src/api/captain-access.api";
import { jobsApi, RiderJob } from "../../src/api/jobs.api";
import { taxiApi } from "../../src/api/taxi.api";
import { Card, Empty, Message, NavLink, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { friendlyError, money } from "../../src/lib/errors";
import { projectCaptainOperationalState } from "../../src/lib/captain-operational-state";

const ACTIVE_DELIVERY = new Set(["RIDER_ASSIGNED", "RIDER_ARRIVING_PICKUP", "PICKED_UP", "ON_THE_WAY", "ARRIVED_DESTINATION", "DELIVERED"]);
const TERMINAL_RIDE = new Set(["COMPLETED", "CANCELLED_BY_CUSTOMER", "CANCELLED_BY_DRIVER", "CANCELLED_BY_ADMIN", "EXPIRED"]);
type WorkFilter = "ALL" | "RIDES" | "DELIVERIES";

function tripTime(trip: TaxiTrip) { return trip.completedAt ?? trip.cancelledAt ?? trip.updatedAt ?? trip.createdAt; }
function deliveryRoute(job: RiderJob) {
  const from = job.vendor?.businessName ?? ([job.pickupAddress?.addressLine, job.pickupAddress?.city].filter(Boolean).join(", ") || "Pickup");
  const to = [job.deliveryAddress?.addressLine, job.deliveryAddress?.city].filter(Boolean).join(", ") || "Destination";
  return `${from} → ${to}`;
}

export default function Work() {
  const [jobs, setJobs] = useState<RiderJob[]>([]);
  const [rides, setRides] = useState<TaxiTrip[]>([]);
  const [access, setAccess] = useState<CaptainAccess | null>(null);
  const [workState, setWorkState] = useState<CaptainWorkState | null>(null);
  const [filter, setFilter] = useState<WorkFilter>("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [resolvedAccess, state] = await Promise.all([captainAccessApi.resolve(), captainAccessApi.workState().catch(() => null)]);
      setAccess(resolvedAccess); setWorkState(state);
      const projection = projectCaptainOperationalState(resolvedAccess, state);
      const [deliveryJobs, rideTrips] = await Promise.all([projection.hasActiveDeliveryMode ? jobsApi.list() : Promise.resolve([]), projection.hasActiveRideMode ? taxiApi.trips() : Promise.resolve([])]);
      setJobs(deliveryJobs); setRides(rideTrips); setError("");
    } catch (cause) { setError(friendlyError(cause)); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const projection = useMemo(() => projectCaptainOperationalState(access, workState), [access, workState]);
  const activeDelivery = jobs.find((job) => ACTIVE_DELIVERY.has(job.orderStatus));
  const activeRide = rides.find((ride) => !TERMINAL_RIDE.has(ride.status));
  const availableFilters: WorkFilter[] = projection.hasActiveRideMode && projection.hasActiveDeliveryMode ? ["ALL", "RIDES", "DELIVERIES"] : projection.hasActiveRideMode ? ["RIDES"] : ["DELIVERIES"];
  const activeFilter = availableFilters.includes(filter) ? filter : availableFilters[0];
  const chronological = [
    ...rides.filter((ride) => TERMINAL_RIDE.has(ride.status)).map((ride) => ({ type: "Ride" as const, id: ride.id, date: tripTime(ride), ride })),
    ...jobs.filter((job) => !ACTIVE_DELIVERY.has(job.orderStatus)).map((job) => ({ type: "Delivery" as const, id: job.id, date: job.updatedAt ?? job.createdAt, job }))
  ].filter((record) => activeFilter === "ALL" || (activeFilter === "RIDES" ? record.type === "Ride" : record.type === "Delivery"))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return <Protected><Screen title="Work" subtitle="Your current assignment and completed work." refreshing={loading} onRefresh={load}>
    <Message error>{error}</Message>
    {!projection.hasAnyActiveMode ? <Card tone="soft"><Text style={ui.sectionTitle}>Captain activation pending</Text><Text style={ui.pageIntro}>Work becomes available after a Captain mode is activated.</Text><NavLink href="/application-status" label="View application status" /></Card> : <>
      <View style={styles.statusSurface}><View><Text style={styles.kicker}>CURRENT STATUS</Text><Text style={styles.statusTitle}>{workState?.activeWorkMode ? "On an assignment" : "Ready for work"}</Text></View><StatusBadge status={workState?.activeWorkMode ? `Busy — ${workState.activeWorkMode === "RIDE" ? "Ride" : "Delivery"}` : projection.overallStatus} /></View>

      <Text style={ui.sectionTitle}>Active</Text>
      {activeRide ? <View style={styles.activeSurface}><WorkIcon mode="Ride" /><View style={styles.activeCopy}><Text style={styles.reference}>{activeRide.tripReference}</Text><Text numberOfLines={1} style={styles.route}>{activeRide.pickupAddress} → {activeRide.destinationAddress}</Text><StatusBadge status={activeRide.status} /></View><NavLink href="/tabs/dashboard" label="OPEN" /></View>
        : activeDelivery ? <View style={styles.activeSurface}><WorkIcon mode="Delivery" /><View style={styles.activeCopy}><Text style={styles.reference}>{activeDelivery.orderNumber}</Text><Text numberOfLines={1} style={styles.route}>{deliveryRoute(activeDelivery)}</Text><StatusBadge status={activeDelivery.orderStatus} /></View><NavLink href={`/jobs/${activeDelivery.id}`} label="OPEN" /></View>
          : <View style={styles.emptyActive}><Feather name="check-circle" size={20} color="#16A34A" /><Text style={styles.route}>No active assignment.</Text></View>}

      <View style={styles.sectionHeading}><Text style={ui.sectionTitle}>Work history</Text><Text style={styles.count}>{chronological.length} shown</Text></View>
      <View accessibilityRole="tablist" style={styles.filterRow}>{availableFilters.map((item) => <Pressable key={item} accessibilityRole="tab" accessibilityLabel={`Show ${item.toLowerCase()} work`} accessibilityState={{ selected: activeFilter === item }} onPress={() => setFilter(item)} style={[styles.filterChip, activeFilter === item && styles.filterChipActive]}><Text style={[styles.filterText, activeFilter === item && styles.filterTextActive]}>{item === "ALL" ? "All" : item === "RIDES" ? "Rides" : "Deliveries"}</Text></Pressable>)}</View>

      {!chronological.length ? <Empty message="Completed and cancelled work will appear here." /> : <View style={styles.historySurface}>{chronological.map((record, index) => {
        const row = record.type === "Ride" ? { reference: record.ride.tripReference, route: `${record.ride.pickupAddress} → ${record.ride.destinationAddress}`, status: record.ride.status, amount: record.ride.finalFareKobo ?? record.ride.estimatedFareKobo } : { reference: record.job.orderNumber, route: deliveryRoute(record.job), status: record.job.orderStatus, amount: record.job.deliveryFee };
        const content = <View style={[styles.historyRow, index < chronological.length - 1 && styles.rowDivider]}><WorkIcon mode={record.type} /><View style={styles.historyCopy}><View style={styles.referenceLine}><Text style={styles.rowReference}>{row.reference}</Text><Text style={styles.amount}>{money(row.amount)}</Text></View><Text numberOfLines={1} style={styles.route}>{row.route}</Text><View style={styles.metaLine}><StatusBadge status={row.status} /><Text style={styles.date}>{new Date(record.date).toLocaleDateString()}</Text></View></View></View>;
        return record.type === "Delivery" ? <Link key={`delivery-${record.id}`} href={`/jobs/${record.job.id}` as never} asChild><Pressable accessibilityRole="button" accessibilityLabel={`Open Delivery ${row.reference}`}>{content}</Pressable></Link> : <View key={`ride-${record.id}`}>{content}</View>;
      })}</View>}
    </>}
  </Screen></Protected>;
}

function WorkIcon({ mode }: { mode: "Ride" | "Delivery" }) { return <View style={styles.icon}><Feather name={mode === "Ride" ? "navigation" : "package"} size={18} color={brand.colors.primary} /></View>; }

const styles = StyleSheet.create({
  statusSurface: { alignItems: "center", backgroundColor: brand.colors.charcoal, borderRadius: 20, flexDirection: "row", justifyContent: "space-between", padding: 16 },
  kicker: { color: "#D1D5DB", fontSize: 9, fontWeight: "900", letterSpacing: 1 }, statusTitle: { color: brand.colors.white, fontSize: 19, fontWeight: "900", marginTop: 4 },
  activeSurface: { alignItems: "center", backgroundColor: "#FFF7F4", borderRadius: 20, flexDirection: "row", gap: 11, padding: 14 }, activeCopy: { flex: 1, gap: 5 },
  emptyActive: { alignItems: "center", backgroundColor: "#F0FDF4", borderRadius: 16, flexDirection: "row", gap: 9, padding: 14 },
  icon: { alignItems: "center", backgroundColor: "#FFF1ED", borderRadius: 13, height: 42, justifyContent: "center", width: 42 },
  reference: { color: brand.colors.charcoal, fontSize: 16, fontWeight: "900" }, route: { color: brand.colors.muted, fontSize: 12.5 },
  sectionHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, count: { color: brand.colors.muted, fontSize: 12, fontWeight: "800" },
  filterRow: { flexDirection: "row", gap: 8 }, filterChip: { alignItems: "center", backgroundColor: "#F3F4F6", borderRadius: 999, justifyContent: "center", minHeight: 42, paddingHorizontal: 16 }, filterChipActive: { backgroundColor: brand.colors.charcoal }, filterText: { color: brand.colors.muted, fontWeight: "900" }, filterTextActive: { color: brand.colors.white },
  historySurface: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 20, borderWidth: 1, overflow: "hidden", paddingHorizontal: 14 },
  historyRow: { alignItems: "center", flexDirection: "row", gap: 11, minHeight: 94, paddingVertical: 12 }, rowDivider: { borderBottomColor: brand.colors.border, borderBottomWidth: 1 }, historyCopy: { flex: 1, gap: 5 },
  referenceLine: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, rowReference: { color: brand.colors.charcoal, fontSize: 14, fontWeight: "900" }, amount: { color: brand.colors.charcoal, fontSize: 14, fontWeight: "900" },
  metaLine: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, date: { color: brand.colors.muted, fontSize: 11.5 }
});
