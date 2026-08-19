import type { TaxiTrip } from "@karigo/shared-types";
import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { brand } from "@karigo/config";
import { captainAccessApi } from "../../src/api/captain-access.api";
import type { CaptainAccess, CaptainWorkState } from "../../src/api/captain-access.api";
import { jobsApi, RiderJob } from "../../src/api/jobs.api";
import { taxiApi } from "../../src/api/taxi.api";
import { Card, Empty, Message, NavLink, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { friendlyError, money } from "../../src/lib/errors";
import { projectCaptainOperationalState } from "../../src/lib/captain-operational-state";

const ACTIVE_DELIVERY = new Set(["RIDER_ASSIGNED", "RIDER_ARRIVING_PICKUP", "PICKED_UP", "ON_THE_WAY", "ARRIVED_DESTINATION", "DELIVERED"]);
const TERMINAL_RIDE = new Set(["COMPLETED", "CANCELLED_BY_CUSTOMER", "CANCELLED_BY_DRIVER", "CANCELLED_BY_ADMIN", "EXPIRED"]);

function tripTime(trip: TaxiTrip) {
  return trip.completedAt ?? trip.cancelledAt ?? trip.updatedAt ?? trip.createdAt;
}

export default function Work() {
  const [jobs, setJobs] = useState<RiderJob[]>([]);
  const [rides, setRides] = useState<TaxiTrip[]>([]);
  const [access, setAccess] = useState<CaptainAccess | null>(null);
  const [workState, setWorkState] = useState<CaptainWorkState | null>(null);
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
      const [deliveryJobs, rideTrips] = await Promise.all([
        projection.hasActiveDeliveryMode ? jobsApi.list() : Promise.resolve([]),
        projection.hasActiveRideMode ? taxiApi.trips() : Promise.resolve([])
      ]);
      setJobs(deliveryJobs);
      setRides(rideTrips);
      setError("");
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const projection = useMemo(() => projectCaptainOperationalState(access, workState), [access, workState]);
  const activeDelivery = jobs.find((job) => ACTIVE_DELIVERY.has(job.orderStatus));
  const activeRide = rides.find((ride) => !TERMINAL_RIDE.has(ride.status));
  const rideHistory = rides.filter((ride) => TERMINAL_RIDE.has(ride.status));
  const deliveryHistory = jobs.filter((job) => !ACTIVE_DELIVERY.has(job.orderStatus));
  const chronological = [
    ...rideHistory.map((ride) => ({ type: "Ride" as const, id: ride.id, date: tripTime(ride), ride })),
    ...deliveryHistory.map((job) => ({ type: "Delivery" as const, id: job.id, date: job.updatedAt ?? job.createdAt, job }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return <Protected><Screen title="Work" subtitle="Active assignments, Ride history and Delivery history." refreshing={loading} onRefresh={load}>
    <Message error>{error}</Message>
    {!projection.hasAnyActiveMode ? <Card tone="soft">
      <Text style={ui.sectionTitle}>Captain activation pending</Text>
      <Text style={ui.pageIntro}>Work becomes available after KariGO activates at least one Captain mode.</Text>
      <NavLink href="/application-status" label="View application status" />
    </Card> : <>
      <Card tone="soft">
        <View style={ui.spaceBetween}><Text style={ui.sectionTitle}>Current status</Text><StatusBadge status={workState?.activeWorkMode ? `Busy — ${workState.activeWorkMode === "RIDE" ? "Ride" : "Delivery"}` : projection.overallStatus} /></View>
        <Text style={ui.pageIntro}>{projection.hasActiveRideMode && projection.hasActiveDeliveryMode ? "Ride + Delivery" : projection.hasActiveRideMode ? "Ride" : "Delivery"} capability</Text>
      </Card>

      <Card>
        <Text style={ui.sectionTitle}>Active</Text>
        {activeRide ? <>
          <View style={styles.modeRow}><Text style={styles.mode}>Ride</Text><StatusBadge status={activeRide.status} /></View>
          <Text style={styles.reference}>{activeRide.tripReference}</Text>
          <Text style={ui.muted}>{activeRide.pickupAddress}</Text>
          <Text style={ui.muted}>to {activeRide.destinationAddress}</Text>
          <NavLink href="/tabs/dashboard" label="Open active Ride cockpit" />
        </> : activeDelivery ? <>
          <View style={styles.modeRow}><Text style={styles.mode}>Delivery</Text><StatusBadge status={activeDelivery.orderStatus} /></View>
          <Text style={styles.reference}>{activeDelivery.orderNumber}</Text>
          <NavLink href={`/jobs/${activeDelivery.id}`} label="Open active Delivery" />
        </> : <Text style={ui.muted}>No active assignment.</Text>}
      </Card>

      <Text style={ui.sectionTitle}>Work history</Text>
      {!chronological.length ? <Empty message="Completed and cancelled Ride or Delivery work will appear here." /> : chronological.map((record) => record.type === "Ride" ? <Card key={`ride-${record.id}`}>
        <View style={styles.modeRow}><Text style={styles.mode}>Ride</Text><StatusBadge status={record.ride.status} /></View>
        <Text style={styles.reference}>{record.ride.tripReference}</Text>
        <Text style={ui.muted}>{new Date(record.date).toLocaleString()}</Text>
        <Text style={ui.muted}>From: {record.ride.pickupAddress}</Text>
        <Text style={ui.muted}>To: {record.ride.destinationAddress}</Text>
        <Text style={styles.amount}>{money(record.ride.finalFareKobo ?? record.ride.estimatedFareKobo)}</Text>
      </Card> : <Link key={`delivery-${record.id}`} href={`/jobs/${record.job.id}` as never} asChild><Pressable><Card>
        <View style={styles.modeRow}><Text style={styles.mode}>Delivery</Text><StatusBadge status={record.job.orderStatus} /></View>
        <Text style={styles.reference}>{record.job.orderNumber}</Text>
        <Text style={ui.muted}>{new Date(record.date).toLocaleString()}</Text>
        <Text style={ui.muted}>From: {record.job.vendor?.businessName ?? ([record.job.pickupAddress?.addressLine, record.job.pickupAddress?.city].filter(Boolean).join(", ") || "Pickup withheld")}</Text>
        <Text style={ui.muted}>To: {[record.job.deliveryAddress?.addressLine, record.job.deliveryAddress?.city].filter(Boolean).join(", ") || "Destination withheld"}</Text>
        <Text style={styles.amount}>{money(record.job.deliveryFee)}</Text>
      </Card></Pressable></Link>)}
    </>}
  </Screen></Protected>;
}

const styles = StyleSheet.create({
  modeRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  mode: { color: brand.colors.primary, fontSize: 12, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
  reference: { color: brand.colors.charcoal, fontSize: 18, fontWeight: "900" },
  amount: { color: brand.colors.charcoal, fontSize: 16, fontWeight: "900" }
});
