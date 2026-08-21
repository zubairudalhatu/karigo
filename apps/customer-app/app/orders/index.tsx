import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { TaxiTrip, customerCancellableTaxiTripStatuses, isActiveTaxiTripStatus, isTerminalTaxiTripStatus, taxiLifecycleForStatus } from "@karigo/shared-types";
import { Order, ordersApi } from "../../src/api/orders.api";
import { taxiApi } from "../../src/api/taxi.api";
import { KariGoAppTopBar } from "../../src/components/kari-go-app-top-bar";
import { Button, Card, Empty, Loading, Message, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { friendlyError, money } from "../../src/lib/errors";
import { formatRideFareKobo, rideStatusLabel } from "../../src/lib/rides-format";

type OrdersTab = "orders" | "rides";

const cancellableRideStatuses = new Set<string>(customerCancellableTaxiTripStatuses);

function shortAddress(value?: string | null) {
  return value?.split(",")[0]?.trim() || "Address pending";
}

function rideDate(trip: TaxiTrip) {
  const date = new Date(trip.requestedAt || trip.createdAt);
  return Number.isNaN(date.getTime()) ? "Time pending" : date.toLocaleString();
}

function rideCategoryLabel(trip: TaxiTrip) {
  const match = /Ride category:\s*([A-Z_]+)/i.exec(trip.customerNote ?? "");
  if (!match?.[1]) return "KariGO Ride";
  const label = match[1].toUpperCase().replaceAll("_", " ");
  return `KariGO ${label.charAt(0)}${label.slice(1).toLowerCase()}`;
}

function terminalTime(trip: TaxiTrip) {
  return trip.completedAt ?? trip.cancelledAt ?? null;
}

function ridePaymentPreference(trip: TaxiTrip) {
  const match = /Payment preference:\s*(.+)/i.exec(trip.customerNote ?? "");
  return match?.[1]?.trim() || "Cash";
}

function lifecycleForTrip(trip: TaxiTrip) {
  return trip.lifecycle ?? taxiLifecycleForStatus(trip.status);
}

function captainName(trip: TaxiTrip) {
  return trip.captain?.displayName ?? trip.driver?.fullName ?? null;
}

function vehicleDescription(trip: TaxiTrip) {
  const vehicle = trip.vehicle;
  if (vehicle) return [vehicle.colour, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle details pending";
  if (trip.driver) return [trip.driver.vehicleColour, trip.driver.vehicleMake, trip.driver.vehicleModel].filter(Boolean).join(" ") || "Vehicle details pending";
  return null;
}

function vehicleRegistration(trip: TaxiTrip) {
  return trip.vehicle?.registrationNumber ?? trip.driver?.vehiclePlateNumber ?? null;
}

function dateTime(value?: string | null) {
  if (!value) return "Pending";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Pending" : date.toLocaleString();
}

function safeRideReceiptShare(trip: TaxiTrip) {
  return [
    `KariGO Ride ${trip.tripReference}`,
    `Status: ${lifecycleForTrip(trip).customerTitle}`,
    `Pickup: ${trip.pickupAddress}`,
    `Destination: ${trip.destinationAddress}`,
    captainName(trip) ? `Captain: ${captainName(trip)}` : null,
    vehicleDescription(trip) ? `Vehicle: ${vehicleDescription(trip)}` : null,
    vehicleRegistration(trip) ? `Registration: ${vehicleRegistration(trip)}` : null,
    `Fare: ${formatRideFareKobo(trip.finalFareKobo ?? trip.estimatedFareKobo)}`
  ].filter(Boolean).join("\n");
}

function mergeRide(trips: TaxiTrip[], updated: TaxiTrip) {
  const exists = trips.some((trip) => trip.id === updated.id);
  const next = exists ? trips.map((trip) => trip.id === updated.id ? updated : trip) : [updated, ...trips];
  return next.sort((a, b) => new Date(b.requestedAt || b.createdAt).getTime() - new Date(a.requestedAt || a.createdAt).getTime());
}

function RideStatusBadge({ status }: { status: string }) {
  return <Text style={styles.rideStatusBadge}>{rideStatusLabel(status)}</Text>;
}

function RideRow({ trip, active, busy, onCancel, onDetails }: { trip: TaxiTrip; active: boolean; busy: boolean; onCancel: (trip: TaxiTrip) => void; onDetails: (trip: TaxiTrip) => void }) {
  return <Card>
    <View style={styles.rideCardHeader}>
      <Text style={styles.ref} numberOfLines={1}>{trip.tripReference}</Text>
      <RideStatusBadge status={trip.status} />
    </View>
    <Text style={ui.muted} numberOfLines={1}>{shortAddress(trip.pickupAddress)} to {shortAddress(trip.destinationAddress)}</Text>
    <Text style={ui.muted}>{rideCategoryLabel(trip)} - {formatRideFareKobo(trip.finalFareKobo ?? trip.estimatedFareKobo)}</Text>
    <Text style={ui.muted}>{rideDate(trip)}</Text>
    {active ? <View style={styles.actions}>
      <Button title="View status" tone="muted" onPress={() => router.push(`/taxi/request?tripId=${trip.id}` as never)} />
      {cancellableRideStatuses.has(trip.status) ? <Button title={busy ? "Cancelling..." : "Cancel request"} tone="muted" disabled={busy} onPress={() => onCancel(trip)} /> : null}
    </View> : <Button title="View ride details" tone="muted" onPress={() => onDetails(trip)} />}
  </Card>;
}

function RideDetails({ trip, canBookAnother, onClose, onBookAnother }: { trip: TaxiTrip; canBookAnother: boolean; onClose: () => void; onBookAnother: () => void }) {
  const closedAt = terminalTime(trip);
  const lifecycle = lifecycleForTrip(trip);
  const fareLabel = trip.status === "COMPLETED" && trip.finalFareKobo ? "Final fare" : "Estimated fare";
  const receipt = trip.receipt;
  return <Card>
    <View style={ui.spaceBetween}>
      <Text style={ui.cardTitle}>{receipt ? "Ride receipt" : lifecycle.receiptAvailable ? "Ride record" : "Ride details"}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Close ride details" onPress={onClose}>
        <Text style={styles.link}>Close</Text>
      </Pressable>
    </View>
    <Text style={styles.ref}>{trip.tripReference}</Text>
    <RideStatusBadge status={trip.status} />
    <Text style={ui.muted}>{lifecycle.customerCopy}</Text>
    <View style={styles.receiptBox}>
      <ReceiptRow label="Ride" value={rideCategoryLabel(trip)} />
      <ReceiptRow label="Pickup" value={trip.pickupAddress} />
      {receipt ? <ReceiptRow label="Receipt" value={receipt.receiptNumber} /> : null}
      <ReceiptRow label="Destination" value={trip.destinationAddress} />
      <ReceiptRow label="Distance" value={receipt ? [receipt.plannedDistanceKm !== null && receipt.plannedDistanceKm !== undefined ? `Planned ${receipt.plannedDistanceKm} km` : null, receipt.actualDistanceKm !== null && receipt.actualDistanceKm !== undefined ? `Actual ${receipt.actualDistanceKm} km` : null].filter(Boolean).join(" · ") || "Unavailable" : trip.estimatedDistanceKm ? `${Number(trip.estimatedDistanceKm).toLocaleString()} km` : "Pending"} />
      <ReceiptRow label="Duration" value={receipt?.durationSeconds !== null && receipt?.durationSeconds !== undefined ? `${Math.ceil(receipt.durationSeconds / 60)} min` : trip.estimatedDurationMin ? `${trip.estimatedDurationMin} min` : "Pending"} />
      <ReceiptRow label="Captain" value={receipt?.captainName ?? captainName(trip) ?? "Not assigned"} />
      <ReceiptRow label="Vehicle" value={receipt?.vehicleDescription ?? vehicleDescription(trip) ?? "Not assigned"} />
      {vehicleRegistration(trip) ? <ReceiptRow label="Registration" value={vehicleRegistration(trip)!} /> : null}
      {receipt ? <ReceiptRow label="Ride fare" value={formatRideFareKobo(receipt.rideFareKobo)} /> : <ReceiptRow label={fareLabel} value={formatRideFareKobo(trip.finalFareKobo ?? trip.estimatedFareKobo)} />}
      {receipt ? <ReceiptRow label="Waiting" value={`${Math.floor(receipt.totalWaitingSeconds / 60)}m ${receipt.totalWaitingSeconds % 60}s · ${formatRideFareKobo(receipt.waitingChargeKobo)}`} /> : null}
      {receipt ? <ReceiptRow label="Total" value={formatRideFareKobo(receipt.totalFareKobo)} /> : null}
      <ReceiptRow label="Payment" value={receipt?.paymentMethod ?? ridePaymentPreference(trip)} />
      <ReceiptRow label="Requested" value={rideDate(trip)} />
      {trip.acceptedAt ? <ReceiptRow label="Accepted" value={dateTime(trip.acceptedAt)} /> : null}
      {trip.arrivedAtPickupAt ? <ReceiptRow label="Pickup arrival" value={dateTime(trip.arrivedAtPickupAt)} /> : null}
      {trip.startedAt ? <ReceiptRow label="Started" value={dateTime(trip.startedAt)} /> : null}
      {trip.arrivedAtDestinationAt ? <ReceiptRow label="Destination reached" value={dateTime(trip.arrivedAtDestinationAt)} /> : null}
      {trip.completedAt ? <ReceiptRow label="Completed" value={dateTime(trip.completedAt)} /> : null}
      {closedAt ? <ReceiptRow label="Closed" value={dateTime(closedAt)} /> : null}
      {trip.cancellationReason ? <ReceiptRow label="Reason" value={trip.cancellationReason} /> : null}
    </View>
    <RideTimeline trip={trip} />
    <Button title="Share ride summary" tone="muted" onPress={() => void Share.share({ message: safeRideReceiptShare(trip) })} />
    {isTerminalTaxiTripStatus(trip.status) && canBookAnother ? <Button title="Book another ride" tone="muted" onPress={onBookAnother} /> : null}
  </Card>;
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.receiptRow}>
    <Text style={styles.receiptLabel}>{label}</Text>
    <Text style={styles.receiptValue}>{value}</Text>
  </View>;
}

function RideTimeline({ trip }: { trip: TaxiTrip }) {
  const items = trip.timeline?.length ? trip.timeline : [{ key: trip.status, label: lifecycleForTrip(trip).customerTitle, timestamp: trip.updatedAt ?? trip.createdAt, current: true }];
  return <View style={styles.timelineBox}>
    <Text style={styles.timelineTitle}>Timeline</Text>
    {items.map((item) => <View key={item.key} style={styles.timelineRow}>
      <View style={[styles.timelineDot, item.current && styles.timelineDotCurrent]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.timelineLabel}>{item.label}</Text>
        <Text style={ui.muted}>{item.timestamp ? dateTime(item.timestamp) : item.current ? "Current status" : "Pending"}</Text>
      </View>
    </View>)}
  </View>;
}

export default function OrderHistory() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<OrdersTab>(params.tab === "rides" ? "rides" : "orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [rides, setRides] = useState<TaxiTrip[]>([]);
  const [selectedRide, setSelectedRide] = useState<TaxiTrip | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [rideBusyId, setRideBusyId] = useState<string | null>(null);

  const activeRides = useMemo(() => rides.filter((trip) => isActiveTaxiTripStatus(trip.status)), [rides]);
  const rideHistory = useMemo(() => rides.filter((trip) => isTerminalTaxiTripStatus(trip.status) || !isActiveTaxiTripStatus(trip.status)), [rides]);

  useEffect(() => {
    if (params.tab === "rides") setTab("rides");
  }, [params.tab]);

  useFocusEffect(useCallback(() => {
    void loadAll();
  }, []));

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [nextOrders, nextRides] = await Promise.all([
        ordersApi.mine(),
        taxiApi.trips().catch(() => [])
      ]);
      setOrders(nextOrders);
      setRides(nextRides);
      setSelectedRide((current) => current ? nextRides.find((trip) => trip.id === current.id) ?? current : current);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  async function cancelRide(trip: TaxiTrip) {
    setRideBusyId(trip.id);
    setError("");
    setMessage("");
    try {
      const updated = await taxiApi.cancelTrip(trip.id, "Customer cancelled ride from Orders");
      setRides((current) => mergeRide(current, updated));
      setSelectedRide(updated);
      setMessage("Ride request cancelled.");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setRideBusyId(null);
    }
  }

  return <Protected>
    <KariGoAppTopBar title="Orders" rightAction={{ icon: "refresh-cw", label: "Refresh orders and rides", onPress: () => void loadAll() }} />
    <Screen title="Your orders" topPadding={false}>
      <Message>{message}</Message>
      <Message error>{error}</Message>
      <View style={styles.tabRow}>
        <Button title="Orders" tone={tab === "orders" ? "primary" : "muted"} onPress={() => setTab("orders")} />
        <Button title="Rides" tone={tab === "rides" ? "primary" : "muted"} onPress={() => setTab("rides")} />
      </View>
      {loading ? <Loading /> : tab === "orders" ? <>
        {orders.length === 0 ? <Empty message="Your KariGO orders will appear here." /> : orders.map((order) =>
          <Pressable key={order.id} onPress={() => router.push(`/orders/${order.id}` as never)}><Card><Text style={ui.cardTitle}>{order.orderNumber}</Text><StatusBadge status={order.orderStatus} /><Text style={ui.muted}>Payment: {order.paymentStatus}</Text><Text style={ui.payable}>{money(order.totalAmount)}</Text></Card></Pressable>)}
      </> : <>
        {selectedRide ? <RideDetails
          trip={selectedRide}
          canBookAnother={activeRides.length === 0}
          onClose={() => setSelectedRide(null)}
          onBookAnother={() => router.push("/taxi/request" as never)}
        /> : null}
        <Text style={ui.sectionTitle}>Active rides</Text>
        {activeRides.length === 0 ? <Empty message="No active KariGO Ride request is open." /> : activeRides.map((trip) => (
          <RideRow key={trip.id} trip={trip} active busy={rideBusyId === trip.id} onCancel={cancelRide} onDetails={setSelectedRide} />
        ))}
        <Text style={ui.sectionTitle}>Ride history</Text>
        {rideHistory.length === 0 ? <Empty message="Completed, cancelled and expired KariGO Rides will appear here." /> : rideHistory.map((trip) => (
          <RideRow key={trip.id} trip={trip} active={false} busy={rideBusyId === trip.id} onCancel={cancelRide} onDetails={setSelectedRide} />
        ))}
      </>}
    </Screen>
  </Protected>;
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  link: { color: "#DC2626", fontWeight: "900" },
  receiptBox: { backgroundColor: "#F9FAFB", borderColor: "#E5E7EB", borderRadius: 16, borderWidth: 1, gap: 8, padding: 12 },
  receiptLabel: { color: "#6B7280", flexShrink: 0, fontSize: 12, fontWeight: "800", width: 96 },
  receiptRow: { alignItems: "flex-start", borderTopColor: "#E5E7EB", borderTopWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 8 },
  receiptValue: { color: "#111827", flex: 1, fontSize: 13, fontWeight: "800", lineHeight: 18, minWidth: 150 },
  ref: { color: "#111827", flexShrink: 1, fontWeight: "900" },
  rideCardHeader: { alignItems: "flex-start", gap: 8 },
  rideStatusBadge: { alignSelf: "flex-start", backgroundColor: "#DBEAFE", borderRadius: 999, color: "#1E40AF", flexShrink: 1, flexWrap: "wrap", fontSize: 12, fontWeight: "800", lineHeight: 16, maxWidth: "100%", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 6 },
  tabRow: { flexDirection: "row", gap: 10 },
  timelineBox: { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB", borderRadius: 16, borderWidth: 1, gap: 10, padding: 12 },
  timelineDot: { backgroundColor: "#D1D5DB", borderRadius: 999, height: 12, marginTop: 3, width: 12 },
  timelineDotCurrent: { backgroundColor: "#DC2626" },
  timelineLabel: { color: "#111827", fontWeight: "900" },
  timelineRow: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  timelineTitle: { color: "#111827", fontSize: 15, fontWeight: "900" }
});
