import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { TaxiTrip, customerCancellableTaxiTripStatuses, isActiveTaxiTripStatus, isTerminalTaxiTripStatus } from "@karigo/shared-types";
import { Order, ordersApi } from "../../src/api/orders.api";
import { taxiApi } from "../../src/api/taxi.api";
import { KariGoAppTopBar } from "../../src/components/kari-go-app-top-bar";
import { Button, Card, Empty, Loading, Message, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { friendlyError, money } from "../../src/lib/errors";

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

function mergeRide(trips: TaxiTrip[], updated: TaxiTrip) {
  const exists = trips.some((trip) => trip.id === updated.id);
  const next = exists ? trips.map((trip) => trip.id === updated.id ? updated : trip) : [updated, ...trips];
  return next.sort((a, b) => new Date(b.requestedAt || b.createdAt).getTime() - new Date(a.requestedAt || a.createdAt).getTime());
}

function RideRow({ trip, active, busy, onCancel, onDetails }: { trip: TaxiTrip; active: boolean; busy: boolean; onCancel: (trip: TaxiTrip) => void; onDetails: (trip: TaxiTrip) => void }) {
  return <Card>
    <View style={ui.spaceBetween}>
      <Text style={styles.ref}>{trip.tripReference}</Text>
      <StatusBadge status={trip.status} />
    </View>
    <Text style={ui.muted} numberOfLines={1}>{shortAddress(trip.pickupAddress)} to {shortAddress(trip.destinationAddress)}</Text>
    <Text style={ui.muted}>{rideCategoryLabel(trip)} - {money(trip.finalFareKobo ?? trip.estimatedFareKobo)}</Text>
    <Text style={ui.muted}>{rideDate(trip)}</Text>
    {active ? <View style={styles.actions}>
      <Button title="View status" tone="muted" onPress={() => router.push(`/taxi/request?tripId=${trip.id}` as never)} />
      {cancellableRideStatuses.has(trip.status) ? <Button title={busy ? "Cancelling..." : "Cancel request"} tone="muted" disabled={busy} onPress={() => onCancel(trip)} /> : null}
    </View> : <Button title="View ride details" tone="muted" onPress={() => onDetails(trip)} />}
  </Card>;
}

function RideDetails({ trip, canBookAnother, onClose, onBookAnother }: { trip: TaxiTrip; canBookAnother: boolean; onClose: () => void; onBookAnother: () => void }) {
  const closedAt = terminalTime(trip);
  return <Card>
    <View style={ui.spaceBetween}>
      <Text style={ui.cardTitle}>Ride details</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Close ride details" onPress={onClose}>
        <Text style={styles.link}>Close</Text>
      </Pressable>
    </View>
    <Text style={styles.ref}>{trip.tripReference}</Text>
    <StatusBadge status={trip.status} />
    <Text style={ui.muted}>{shortAddress(trip.pickupAddress)} to {shortAddress(trip.destinationAddress)}</Text>
    <Text style={ui.muted}>{rideCategoryLabel(trip)}</Text>
    <Text style={ui.muted}>Fare: {money(trip.finalFareKobo ?? trip.estimatedFareKobo)}</Text>
    <Text style={ui.muted}>Payment: {ridePaymentPreference(trip)}</Text>
    <Text style={ui.muted}>Requested: {rideDate(trip)}</Text>
    {closedAt ? <Text style={ui.muted}>Closed: {new Date(closedAt).toLocaleString()}</Text> : null}
    {trip.cancellationReason ? <Text style={ui.muted}>Reason: {trip.cancellationReason}</Text> : null}
    {isTerminalTaxiTripStatus(trip.status) && canBookAnother ? <Button title="Book another ride" tone="muted" onPress={onBookAnother} /> : null}
  </Card>;
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
  ref: { color: "#111827", fontWeight: "900" },
  tabRow: { flexDirection: "row", gap: 10 }
});
