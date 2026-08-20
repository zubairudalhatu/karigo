import { brand } from "@karigo/config";
import type { TaxiTrip } from "@karigo/shared-types";
import { Feather } from "@expo/vector-icons";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { taxiApi } from "../api/taxi.api";
import { Button, Field, Message, StatusBadge, ui } from "./ui";
import { friendlyError, money } from "../lib/errors";

type Coordinate = { latitude: number; longitude: number };
type DriverTrip = TaxiTrip & {
  customer?: { fullName?: string | null; phoneNumber?: string | null } | null;
};

function coordinate(latitude: unknown, longitude: unknown): Coordinate | null {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    ? { latitude: lat, longitude: lng }
    : null;
}

function stateCopy(status: TaxiTrip["status"]) {
  if (status === "DRIVER_ASSIGNED") return { eyebrow: "NEW KARIGO RIDE", title: "New Ride assigned", action: "ACCEPT RIDE" };
  if (status === "ACCEPTED") return { eyebrow: "EN ROUTE TO PICKUP", title: "Navigate to pickup", action: "ARRIVED AT PICKUP" };
  if (status === "ARRIVED_PICKUP") return { eyebrow: "AT PICKUP", title: "Waiting for customer", action: "START RIDE" };
  if (status === "STARTED") return { eyebrow: "RIDE IN PROGRESS", title: "Navigate to destination", action: "ARRIVED AT DESTINATION" };
  if (status === "ARRIVED_DESTINATION") return { eyebrow: "DESTINATION REACHED", title: "Complete this Ride", action: "COMPLETE RIDE" };
  return { eyebrow: "KARIGO RIDE", title: "Ride workspace", action: "UPDATE RIDE" };
}

export function CaptainRideWorkspace({
  trip,
  captainCoordinate,
  operatingArea,
  onUpdated
}: {
  trip: DriverTrip;
  captainCoordinate: Coordinate | null;
  operatingArea: string;
  onUpdated: (trip: TaxiTrip) => Promise<void>;
}) {
  const [pin, setPin] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const mapRef = useRef<MapView | null>(null);
  const cameraStateRef = useRef("");
  const pickup = coordinate(trip.pickupLatitude, trip.pickupLongitude);
  const destination = coordinate(trip.destinationLatitude, trip.destinationLongitude);
  const mapTarget = trip.status === "STARTED" || trip.status === "ARRIVED_DESTINATION" ? destination : pickup;
  const visibleCoordinates = [captainCoordinate, pickup, destination].filter((item): item is Coordinate => Boolean(item));
  const copy = stateCopy(trip.status);
  const customerFirstName = trip.customer?.fullName?.trim().split(/\s+/)[0] || "Customer";

  useEffect(() => {
    const cameraState = `${trip.id}:${trip.status}:${Boolean(captainCoordinate)}`;
    if (cameraStateRef.current === cameraState) return;
    cameraStateRef.current = cameraState;
    if (visibleCoordinates.length > 1) {
      mapRef.current?.fitToCoordinates(visibleCoordinates, {
        animated: true,
        edgePadding: { top: 70, right: 55, bottom: 190, left: 55 }
      });
    }
  }, [trip.id, trip.status, Boolean(captainCoordinate), Boolean(pickup), Boolean(destination)]);

  async function mutate(action: "accept" | "decline" | "arrived-pickup" | "start" | "arrived-destination" | "complete") {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const updated = action === "accept" ? await taxiApi.acceptTrip(trip.id)
        : action === "decline" ? await taxiApi.declineTrip(trip.id, declineReason.trim())
          : action === "arrived-pickup" ? await taxiApi.arrivedPickup(trip.id)
            : action === "start" ? await taxiApi.startTrip(trip.id, pin)
              : action === "arrived-destination" ? await taxiApi.arrivedDestination(trip.id)
                : await taxiApi.completeTrip(trip.id);
      setPin("");
      setDeclineReason("");
      await onUpdated(updated);
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setSaving(false);
    }
  }

  function primaryAction() {
    if (trip.status === "DRIVER_ASSIGNED") return mutate("accept");
    if (trip.status === "ACCEPTED") return mutate("arrived-pickup");
    if (trip.status === "ARRIVED_PICKUP") return mutate("start");
    if (trip.status === "STARTED") return mutate("arrived-destination");
    if (trip.status === "ARRIVED_DESTINATION") return mutate("complete");
    return Promise.resolve();
  }

  function openNavigation() {
    if (!mapTarget) return;
    void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${mapTarget.latitude},${mapTarget.longitude}`);
  }

  return <View style={styles.workspace}>
    <View style={styles.mapShell}>
      {visibleCoordinates[0] ? <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{ ...visibleCoordinates[0], latitudeDelta: 0.02, longitudeDelta: 0.02 }}
        showsCompass
        showsMyLocationButton={false}
      >
        {captainCoordinate ? <Marker coordinate={captainCoordinate} title="Your location">
          <View style={styles.captainMarker}><Feather name="navigation" size={18} color={brand.colors.white} /></View>
        </Marker> : null}
        {pickup ? <Marker coordinate={pickup} title="Pickup" pinColor="#E31E24" /> : null}
        {destination ? <Marker coordinate={destination} title="Destination" pinColor="#111111" /> : null}
      </MapView> : <View style={styles.mapFallback}><Feather name="map-pin" size={30} color={brand.colors.primary} /><Text style={ui.muted}>Map coordinates are unavailable. Address details remain authoritative.</Text></View>}
      <View style={styles.mapTopBar}>
        <StatusBadge status={copy.eyebrow} />
        <Pressable accessibilityRole="button" accessibilityLabel="Open Safety and support" onPress={() => router.push("/profile")} style={styles.safetyButton}>
          <Feather name="shield" size={18} color={brand.colors.charcoal} /><Text style={styles.safetyText}>Safety</Text>
        </Pressable>
      </View>
    </View>

    <View style={styles.sheet}>
      <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.reference}>{trip.tripReference} · {operatingArea}</Text>
      {trip.status !== "DRIVER_ASSIGNED" ? <Text style={styles.customer}>{customerFirstName}</Text> : null}

      <View style={styles.routeBlock}>
        <View style={styles.routeRow}><View style={styles.pickupDot} /><View style={styles.routeCopy}><Text style={styles.routeLabel}>PICKUP</Text><Text style={styles.routeAddress}>{trip.pickupAddress}</Text></View></View>
        <View style={styles.routeLine} />
        <View style={styles.routeRow}><View style={styles.destinationDot} /><View style={styles.routeCopy}><Text style={styles.routeLabel}>DESTINATION</Text><Text style={styles.routeAddress}>{trip.destinationAddress}</Text></View></View>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}><Text style={styles.metricLabel}>Distance</Text><Text style={styles.metricValue}>{Number(trip.estimatedDistanceKm ?? 0).toFixed(1)} km</Text></View>
        <View style={styles.metric}><Text style={styles.metricLabel}>Estimate</Text><Text style={styles.metricValue}>{trip.estimatedDurationMin ? `${trip.estimatedDurationMin} min` : "—"}</Text></View>
        <View style={styles.metric}><Text style={styles.metricLabel}>Fare</Text><Text style={styles.metricValue}>{money(trip.estimatedFareKobo)}</Text></View>
      </View>

      {trip.status === "ARRIVED_PICKUP" ? <>
        <Text style={styles.pinGuide}>PIN REQUIRED</Text>
        <Text style={ui.muted}>Ask the customer for the protected 6-digit PIN before starting the Ride.</Text>
        <Field placeholder="Customer trip PIN" value={pin} onChangeText={(value) => setPin(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" />
      </> : null}

      {trip.status === "DRIVER_ASSIGNED" ? <>
        <Button title={saving ? "ACCEPTING..." : copy.action} disabled={saving} onPress={() => void primaryAction()} />
        <Field placeholder="Reason for declining" value={declineReason} onChangeText={setDeclineReason} />
        <Button title={saving ? "UPDATING..." : "DECLINE"} tone="muted" disabled={saving || declineReason.trim().length < 5} onPress={() => void mutate("decline")} />
      </> : <>
        <Button title={saving ? "UPDATING..." : copy.action} disabled={saving || (trip.status === "ARRIVED_PICKUP" && pin.length !== 6)} onPress={() => void primaryAction()} />
      </>}

      {mapTarget ? <Button title="OPEN NAVIGATION" tone="muted" onPress={openNavigation} /> : null}
      {trip.customer?.phoneNumber && trip.status !== "DRIVER_ASSIGNED" ? <Button title="CALL CUSTOMER" tone="muted" onPress={() => void Linking.openURL(`tel:${trip.customer?.phoneNumber}`)} /> : null}
      <Message error>{error}</Message>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  workspace: { flex: 1, gap: 0 },
  mapShell: { backgroundColor: "#E5E7EB", borderRadius: 24, minHeight: 470, overflow: "hidden", position: "relative" },
  map: { height: 470, width: "100%" },
  mapFallback: { alignItems: "center", gap: 10, height: 470, justifyContent: "center", padding: 30 },
  mapTopBar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", left: 12, position: "absolute", right: 12, top: 12 },
  safetyButton: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.96)", borderRadius: 999, flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingVertical: 9 },
  safetyText: { color: brand.colors.charcoal, fontWeight: "900" },
  captainMarker: { alignItems: "center", backgroundColor: brand.colors.primary, borderColor: brand.colors.white, borderRadius: 999, borderWidth: 3, height: 40, justifyContent: "center", width: 40 },
  sheet: { backgroundColor: brand.colors.white, borderRadius: 28, gap: 12, marginTop: -58, padding: 18, paddingTop: 22, shadowColor: "#111827", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16 },
  eyebrow: { color: brand.colors.primary, fontSize: 12, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: brand.colors.charcoal, fontSize: 24, fontWeight: "900", letterSpacing: -0.4 },
  reference: { color: brand.colors.muted, fontSize: 12, fontWeight: "800" },
  customer: { color: brand.colors.charcoal, fontSize: 18, fontWeight: "900" },
  routeBlock: { backgroundColor: "#F9FAFB", borderRadius: 18, padding: 14 },
  routeRow: { alignItems: "flex-start", flexDirection: "row", gap: 11 },
  routeCopy: { flex: 1, gap: 3 },
  routeLabel: { color: brand.colors.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  routeAddress: { color: brand.colors.charcoal, fontSize: 15, fontWeight: "800", lineHeight: 20 },
  pickupDot: { backgroundColor: brand.colors.primary, borderRadius: 999, height: 10, marginTop: 4, width: 10 },
  destinationDot: { backgroundColor: brand.colors.charcoal, borderRadius: 2, height: 10, marginTop: 4, width: 10 },
  routeLine: { backgroundColor: "#D1D5DB", height: 22, marginLeft: 4, width: 2 },
  metrics: { flexDirection: "row", gap: 8 },
  metric: { backgroundColor: "#F9FAFB", borderRadius: 14, flex: 1, gap: 3, padding: 10 },
  metricLabel: { color: brand.colors.muted, fontSize: 10, fontWeight: "800" },
  metricValue: { color: brand.colors.charcoal, fontSize: 13, fontWeight: "900" },
  pinGuide: { color: brand.colors.primary, fontSize: 14, fontWeight: "900", letterSpacing: 1 }
});
