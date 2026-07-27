import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { TaxiFareEstimate, TaxiRideCategory, TaxiTrip } from "@karigo/shared-types";
import { Address, addressesApi } from "../../src/api/addresses.api";
import { taxiApi } from "../../src/api/taxi.api";
import { Button, Card, Empty, Field, Message, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";
import { ridesControlledPilotEnabled } from "../../src/lib/rides-flags";
import { brand } from "@karigo/config";

type BookingStep = "HOME" | "ROUTE" | "PREVIEW" | "CONFIRM" | "TRACKING";

interface RidePlace {
  label: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  source: "current" | "saved" | "recent" | "manual";
}

const ridePilotNotice = "KariGO Rides Pilot - availability may be limited in your area.";
const cancellableBeforePickup = new Set(["REQUESTED", "DRIVER_ASSIGNED", "ACCEPTED"]);

const money = (kobo?: number | null) => `NGN ${Math.round(Number(kobo ?? 0) / 100).toLocaleString()}`;

function placeFromAddress(address: Address): RidePlace {
  return {
    label: address.label,
    address: `${address.addressLine}, ${address.city}`,
    latitude: address.latitude,
    longitude: address.longitude,
    source: "saved"
  };
}

function distanceKmBetween(a: RidePlace, b: RidePlace) {
  if (!a.latitude || !a.longitude || !b.latitude || !b.longitude) return undefined;
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Number((2 * earthRadiusKm * Math.asin(Math.sqrt(h))).toFixed(2));
}

function paymentCopy(paymentMethod: string) {
  if (paymentMethod === "Cash") return "Cash settlement is coordinated safely during the controlled pilot.";
  if (paymentMethod === "Wallet") return "Wallet ride payment is not active for this pilot.";
  return "Digital ride payment is not active for this pilot.";
}

export default function TaxiRequest() {
  const taxiEnabled = ridesControlledPilotEnabled();
  const [step, setStep] = useState<BookingStep>("HOME");
  const [pickup, setPickup] = useState<RidePlace | null>(null);
  const [destination, setDestination] = useState<RidePlace | null>(null);
  const [pickupText, setPickupText] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const [stopText, setStopText] = useState("");
  const [pickupInstruction, setPickupInstruction] = useState("");
  const [tripNote, setTripNote] = useState("");
  const [scheduleForLater, setScheduleForLater] = useState(false);
  const [scheduledPickupAt, setScheduledPickupAt] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [selectedCategory, setSelectedCategory] = useState("ECONOMY");
  const [categories, setCategories] = useState<TaxiRideCategory[]>([]);
  const [estimate, setEstimate] = useState<TaxiFareEstimate | null>(null);
  const [trips, setTrips] = useState<TaxiTrip[]>([]);
  const [created, setCreated] = useState<TaxiTrip | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const savedPlaces = useMemo(() => addresses.map(placeFromAddress), [addresses]);
  const recentPlaces = useMemo(() => {
    const seen = new Set<string>();
    return trips
      .map((trip) => ({
        label: trip.destinationAddress.split(",")[0] || "Recent destination",
        address: trip.destinationAddress,
        source: "recent" as const
      }))
      .filter((place) => {
        const key = place.address.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 4);
  }, [trips]);

  const routeDistanceKm = pickup && destination ? distanceKmBetween(pickup, destination) : undefined;
  const estimatedDurationMin = routeDistanceKm ? Math.max(8, Math.round(routeDistanceKm * 4)) : undefined;
  const categoryOptions = estimate?.rideCategories?.length ? estimate.rideCategories : categories;
  const selectedCategoryDetail = categoryOptions.find((category) => category.id === selectedCategory) ?? categoryOptions[0];

  async function load() {
    if (!taxiEnabled) return;
    try {
      const [saved, rideCategories, history] = await Promise.all([
        addressesApi.list().catch(() => []),
        taxiApi.rideCategories().catch(() => []),
        taxiApi.trips().catch(() => [])
      ]);
      setAddresses(saved);
      setCategories(rideCategories);
      setTrips(history);
      const defaultPickup = saved.find((address) => address.isDefault) ?? saved[0];
      if (defaultPickup && !pickup) {
        const place = placeFromAddress(defaultPickup);
        setPickup(place);
        setPickupText(place.address);
      }
    } catch {
      // Keep the booking flow usable even if optional history/category calls are slow.
    }
  }

  useEffect(() => { void load(); }, [taxiEnabled]);

  async function useCurrentLocation() {
    setLocating(true);
    setError("");
    setMessage("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setMessage("Location permission was not granted. You can still enter pickup manually.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }).catch(() => []);
      const address = [place?.name, place?.street, place?.district, place?.city ?? place?.subregion].filter(Boolean).join(", ");
      const current: RidePlace = {
        label: "Current location",
        address: address || "Current location",
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        source: "current"
      };
      setPickup(current);
      setPickupText(current.address);
      setMessage("Current location set as pickup. Confirm the written address before booking.");
    } catch {
      setMessage("Location is unavailable right now. Enter pickup manually.");
    } finally {
      setLocating(false);
    }
  }

  function applyManualRoute() {
    if (pickupText.trim()) setPickup({ label: "Pickup", address: pickupText.trim(), source: "manual" });
    if (destinationText.trim()) setDestination({ label: "Destination", address: destinationText.trim(), source: "manual" });
    setEstimate(null);
    setStep("PREVIEW");
  }

  function swapRoute() {
    const nextPickup = destination;
    const nextDestination = pickup;
    setPickup(nextPickup);
    setDestination(nextDestination);
    setPickupText(nextPickup?.address ?? "");
    setDestinationText(nextDestination?.address ?? "");
    setEstimate(null);
  }

  async function estimateFare(categoryId = selectedCategory) {
    if (!pickup || !destination) return;
    setLoading(true);
    setError("");
    try {
      const nextEstimate = await taxiApi.fareEstimate({
        pickupAddress: pickup.address,
        pickupLatitude: pickup.latitude ?? undefined,
        pickupLongitude: pickup.longitude ?? undefined,
        destinationAddress: destination.address,
        destinationLatitude: destination.latitude ?? undefined,
        destinationLongitude: destination.longitude ?? undefined,
        estimatedDistanceKm: routeDistanceKm,
        estimatedDurationMin,
        rideCategory: categoryId
      });
      setSelectedCategory(categoryId);
      setEstimate(nextEstimate);
      setStep("CONFIRM");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function createTrip() {
    if (!pickup || !destination) return;
    setLoading(true);
    setError("");
    try {
      const trip = await taxiApi.createTrip({
        pickupAddress: pickup.address,
        pickupLatitude: pickup.latitude ?? undefined,
        pickupLongitude: pickup.longitude ?? undefined,
        destinationAddress: destination.address,
        destinationLatitude: destination.latitude ?? undefined,
        destinationLongitude: destination.longitude ?? undefined,
        estimatedDistanceKm: estimate?.estimatedDistanceKm ?? routeDistanceKm,
        estimatedDurationMin: estimate?.estimatedDurationMin ?? estimatedDurationMin,
        rideCategory: selectedCategory,
        paymentMethod,
        scheduledPickupAt: scheduleForLater ? scheduledPickupAt : undefined,
        pickupInstruction: pickupInstruction || undefined,
        customerNote: [
          tripNote,
          stopText.trim() ? `Additional stop: ${stopText.trim()}` : ""
        ].filter(Boolean).join("\n") || undefined
      });
      setCreated(trip);
      setStep("TRACKING");
      setEstimate(null);
      await load();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function cancelTrip(tripId: string) {
    setLoading(true);
    setError("");
    try {
      await taxiApi.cancelTrip(tripId, "Customer cancelled controlled pilot ride before pickup");
      setCreated(null);
      await load();
      setStep("HOME");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  if (!taxiEnabled) {
    return <Protected><Screen title="KariGO Rides">
      <Card>
        <Text style={ui.cardTitle}>KariGO Rides is preparing launch in your area</Text>
        <Text style={ui.pageIntro}>Join the waitlist while KariGO completes Ride Captain, fare and safety checks.</Text>
      </Card>
      <Button title="Join Ride Waitlist" onPress={() => router.push("/taxi/waitlist")} />
    </Screen></Protected>;
  }

  return <Protected><Screen title={step === "HOME" ? undefined : "KariGO Rides"}>
    {step !== "HOME" ? <View style={ui.spaceBetween}>
      <Button title="Back" tone="muted" onPress={() => setStep(step === "ROUTE" ? "HOME" : step === "PREVIEW" ? "ROUTE" : "PREVIEW")} />
      <Button title="Close ride booking" tone="muted" onPress={() => router.replace("/tabs/home")} />
    </View> : null}
    <Message error>{error}</Message>
    <Message>{message}</Message>

    {step === "HOME" ? <>
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>KariGO Rides</Text>
        <Text style={styles.heroTitle}>Ready, set, ride.</Text>
        <Text style={styles.heroCopy}>{ridePilotNotice}</Text>
      </View>
      <View style={styles.serviceGrid}>
        <ServiceCard title="Rides" body="Request a vehicle" active />
        <ServiceCard title="Schedule" body="Book for later" />
        <ServiceCard title="Send" body="Send a parcel with a Captain" />
      </View>
      <Pressable accessibilityRole="button" onPress={() => setStep("ROUTE")} style={styles.destinationControl}>
        <Text style={styles.destinationLabel}>Where are you going?</Text>
        <Text style={styles.destinationHint}>Enter destination, choose saved places or use your current pickup.</Text>
      </Pressable>
      <Button title={locating ? "Detecting pickup..." : "Use current location as pickup"} tone="muted" disabled={locating} onPress={() => void useCurrentLocation()} />
      <PlaceSection title="Saved places" places={savedPlaces} onSelect={(place) => { setDestination(place); setDestinationText(place.address); setStep("ROUTE"); }} />
      <PlaceSection title="Recent destinations" places={recentPlaces} onSelect={(place) => { setDestination(place); setDestinationText(place.address); setStep("ROUTE"); }} />
    </> : null}

    {step === "ROUTE" ? <>
      <Card>
        <Text style={ui.cardTitle}>Route selection</Text>
        <Field placeholder="Pickup address" value={pickupText} onChangeText={(value) => { setPickupText(value); setPickup(value.trim() ? { label: "Pickup", address: value.trim(), source: "manual" } : null); }} />
        <Field placeholder="Destination address" value={destinationText} onChangeText={(value) => { setDestinationText(value); setDestination(value.trim() ? { label: "Destination", address: value.trim(), source: "manual" } : null); }} />
        <View style={styles.inlineActions}>
          <Button title="Swap" tone="muted" onPress={swapRoute} disabled={!pickup && !destination} />
          <Button title="Add stop" tone="muted" onPress={() => setStopText(stopText ? "" : " ")} />
        </View>
        {stopText ? <Field placeholder="Additional stop optional" value={stopText} onChangeText={setStopText} /> : null}
        <Button title={locating ? "Detecting..." : "Choose pickup by current location"} tone="muted" disabled={locating} onPress={() => void useCurrentLocation()} />
        <Button title="Choose on map" tone="muted" onPress={() => setMessage("Map selection will appear when KariGO map provider is available. Use manual search or saved places for now.")} />
        <Button title="Preview route" disabled={!pickupText.trim() || !destinationText.trim()} onPress={applyManualRoute} />
      </Card>
      <PlaceSection title="Saved places" places={savedPlaces} onSelect={(place) => { setDestination(place); setDestinationText(place.address); }} />
      <PlaceSection title="Recent places" places={recentPlaces} onSelect={(place) => { setDestination(place); setDestinationText(place.address); }} />
    </> : null}

    {step === "PREVIEW" ? <>
      <RoutePreview pickup={pickup} destination={destination} stopText={stopText} distanceKm={routeDistanceKm} durationMin={estimatedDurationMin} />
      <Card>
        <Text style={ui.cardTitle}>Before confirmation</Text>
        <Text style={ui.muted}>KariGO will show available ride categories, Captain arrival estimate and fare estimate before you request a ride.</Text>
        <Button title={loading ? "Estimating..." : "Show ride categories and fare"} disabled={loading || !pickup || !destination} onPress={() => void estimateFare()} />
      </Card>
    </> : null}

    {step === "CONFIRM" ? <>
      <RoutePreview pickup={pickup} destination={destination} stopText={stopText} distanceKm={estimate?.estimatedDistanceKm ?? routeDistanceKm} durationMin={estimate?.estimatedDurationMin ?? estimatedDurationMin} />
      <Card>
        <Text style={ui.cardTitle}>Choose ride category</Text>
        {categoryOptions.length === 0 ? <Empty message="No ride category is available in this area yet." /> : categoryOptions.map((category) => (
          <Pressable key={category.id} accessibilityRole="button" onPress={() => void estimateFare(category.id)} style={[styles.categoryCard, selectedCategory === category.id && styles.categoryCardActive]}>
            <View style={styles.categoryIcon}><Text style={styles.categoryIconText}>{category.name.replace("KariGO ", "").slice(0, 2).toUpperCase()}</Text></View>
            <View style={styles.categoryBody}>
              <Text style={styles.categoryTitle}>{category.name}</Text>
              <Text style={ui.muted}>Captain arrives in {category.arrivalEstimateMinutes} minutes - up to {category.passengerCapacity} passengers</Text>
              <Text style={ui.muted}>{category.description}</Text>
            </View>
            <Text style={styles.categoryFare}>{category.fareRangeKobo ? `${money(category.fareRangeKobo.min)}-${money(category.fareRangeKobo.max)}` : "Estimate pending"}</Text>
          </Pressable>
        ))}
      </Card>
      <Card>
        <Text style={ui.cardTitle}>Payment and schedule</Text>
        <View style={styles.inlineActions}>
          {["Cash", "Wallet", "Card"].map((option) => <Button key={option} title={option === paymentMethod ? `${option} selected` : option} tone={option === "Cash" ? "muted" : "muted"} disabled={option !== "Cash"} onPress={() => setPaymentMethod(option)} />)}
        </View>
        <Text style={ui.muted}>{paymentCopy(paymentMethod)}</Text>
        <Button title={scheduleForLater ? "Scheduling enabled" : "Schedule for later"} tone="muted" onPress={() => setScheduleForLater((value) => !value)} />
        {scheduleForLater ? <Field placeholder="Preferred pickup time e.g. Today 6:30 PM" value={scheduledPickupAt} onChangeText={setScheduledPickupAt} /> : null}
        <Field placeholder="Pickup instruction optional" value={pickupInstruction} onChangeText={setPickupInstruction} />
        <Field placeholder="Trip note optional" value={tripNote} onChangeText={setTripNote} />
      </Card>
      <Card>
        <Text style={ui.cardTitle}>{selectedCategoryDetail?.name ?? "Selected ride"}</Text>
        <Text style={ui.priceValue}>{money(estimate?.estimatedFareKobo)}</Text>
        <Text style={ui.muted}>{ridePilotNotice} Manual assignment is required; ride payment and payout automation remain disabled.</Text>
        <Button title={loading ? "Requesting..." : scheduleForLater ? `Schedule ${selectedCategoryDetail?.name ?? "ride"}` : `Request ${selectedCategoryDetail?.name ?? "ride"}`} disabled={loading || !estimate} onPress={() => void createTrip()} />
      </Card>
    </> : null}

    {step === "TRACKING" ? <>
      {created ? <Card>
        <Text style={ui.cardTitle}>Finding a nearby Captain</Text>
        <Text>Reference: {created.tripReference}</Text>
        <StatusBadge status={created.status} />
        {created.tripPin ? <Text style={ui.otpCode}>{created.tripPin.slice(0, 3)} {created.tripPin.slice(3)}</Text> : null}
        <Text style={ui.muted}>Only share this ride PIN with the approved Ride Captain after pickup.</Text>
        {created.driver ? <Text style={ui.muted}>Ride Captain: {created.driver.fullName} - {created.driver.vehiclePlateNumber ?? "vehicle pending"}</Text> : <Text style={ui.muted}>KariGO Operations will manually assign an approved Ride Captain.</Text>}
        {cancellableBeforePickup.has(created.status) ? <Button title="Cancel ride request" tone="muted" disabled={loading} onPress={() => void cancelTrip(created.id)} /> : null}
      </Card> : null}
      <Button title="Back to Rides home" tone="muted" onPress={() => setStep("HOME")} />
    </> : null}

    {trips.length > 0 && step !== "HOME" ? <Card>
      <View style={ui.spaceBetween}>
        <Text style={ui.sectionTitle}>Recent ride requests</Text>
        <Button title="Refresh" tone="muted" disabled={loading} onPress={() => void load()} />
      </View>
      {trips.slice(0, 3).map((trip) => <View key={trip.id} style={styles.tripRow}>
        <Text style={styles.tripRef}>{trip.tripReference}</Text>
        <Text style={ui.muted}>{trip.pickupAddress} to {trip.destinationAddress}</Text>
        <StatusBadge status={trip.status} />
      </View>)}
    </Card> : null}
  </Screen></Protected>;
}

function ServiceCard({ title, body, active = false }: { title: string; body: string; active?: boolean }) {
  return <View style={[styles.serviceCard, active && styles.serviceCardActive]}>
    <Text style={styles.serviceTitle}>{title}</Text>
    <Text style={styles.serviceBody}>{body}</Text>
  </View>;
}

function PlaceSection({ title, places, onSelect }: { title: string; places: RidePlace[]; onSelect: (place: RidePlace) => void }) {
  if (!places.length) return null;
  return <Card>
    <Text style={ui.cardTitle}>{title}</Text>
    {places.map((place) => <Pressable key={`${place.source}-${place.address}`} accessibilityRole="button" onPress={() => onSelect(place)} style={styles.placeRow}>
      <View style={styles.placeDot}><Text style={styles.placeDotText}>{place.label.slice(0, 1).toUpperCase()}</Text></View>
      <View style={styles.placeBody}>
        <Text style={styles.placeTitle}>{place.label}</Text>
        <Text style={ui.muted}>{place.address}</Text>
      </View>
    </Pressable>)}
  </Card>;
}

function RoutePreview({ pickup, destination, stopText, distanceKm, durationMin }: { pickup: RidePlace | null; destination: RidePlace | null; stopText?: string; distanceKm?: number; durationMin?: number }) {
  return <Card>
    <Text style={ui.cardTitle}>Route preview</Text>
    <View style={styles.routePanel}>
      <View style={styles.routeLine} />
      <RoutePoint label="Pickup" value={pickup?.address ?? "Pickup pending"} tone="pickup" />
      {stopText?.trim() ? <RoutePoint label="Stop" value={stopText.trim()} tone="stop" /> : null}
      <RoutePoint label="Destination" value={destination?.address ?? "Destination pending"} tone="destination" />
    </View>
    <View style={styles.metrics}>
      <Metric label="Distance" value={distanceKm ? `${distanceKm} km` : "Estimated after route"} />
      <Metric label="Duration" value={durationMin ? `${durationMin} min` : "Traffic estimate pending"} />
    </View>
  </Card>;
}

function RoutePoint({ label, value, tone }: { label: string; value: string; tone: "pickup" | "stop" | "destination" }) {
  return <View style={styles.routePoint}>
    <View style={[styles.routeMarker, tone === "pickup" && styles.pickupMarker, tone === "stop" && styles.stopMarker]} />
    <View>
      <Text style={styles.routeLabel}>{label}</Text>
      <Text style={styles.routeValue}>{value}</Text>
    </View>
  </View>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metricCard}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={styles.metricValue}>{value}</Text>
  </View>;
}

const styles = StyleSheet.create({
  hero: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 28, borderWidth: 1, gap: 8, padding: 20 },
  heroEyebrow: { color: brand.colors.primary, fontSize: 12, fontWeight: "900", letterSpacing: 1.2, textTransform: "uppercase" },
  heroTitle: { color: brand.colors.charcoal, fontSize: 32, fontWeight: "900", letterSpacing: -0.5 },
  heroCopy: { color: brand.colors.muted, fontSize: 15, lineHeight: 22 },
  serviceGrid: { flexDirection: "row", gap: 10 },
  serviceCard: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 18, borderWidth: 1, flex: 1, gap: 4, padding: 12 },
  serviceCardActive: { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" },
  serviceTitle: { color: brand.colors.charcoal, fontSize: 15, fontWeight: "900" },
  serviceBody: { color: brand.colors.muted, fontSize: 12, lineHeight: 17 },
  destinationControl: { backgroundColor: brand.colors.charcoal, borderRadius: 22, gap: 6, padding: 18 },
  destinationLabel: { color: brand.colors.white, fontSize: 20, fontWeight: "900" },
  destinationHint: { color: "#D1D5DB", lineHeight: 20 },
  inlineActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  placeRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  placeDot: { alignItems: "center", backgroundColor: "#FEF2F2", borderRadius: 16, height: 34, justifyContent: "center", width: 34 },
  placeDotText: { color: brand.colors.primaryDark, fontWeight: "900" },
  placeBody: { flex: 1 },
  placeTitle: { color: brand.colors.charcoal, fontWeight: "900" },
  routePanel: { backgroundColor: "#F9FAFB", borderRadius: 18, gap: 14, overflow: "hidden", padding: 14 },
  routeLine: { backgroundColor: "#D1D5DB", bottom: 28, left: 22, position: "absolute", top: 28, width: 2 },
  routePoint: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  routeMarker: { backgroundColor: brand.colors.charcoal, borderColor: brand.colors.white, borderRadius: 999, borderWidth: 3, height: 18, marginTop: 2, width: 18 },
  pickupMarker: { backgroundColor: brand.colors.success },
  stopMarker: { backgroundColor: brand.colors.warning },
  routeLabel: { color: brand.colors.muted, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  routeValue: { color: brand.colors.charcoal, fontSize: 15, fontWeight: "800", lineHeight: 21 },
  metrics: { flexDirection: "row", gap: 10 },
  metricCard: { backgroundColor: "#F9FAFB", borderRadius: 16, flex: 1, padding: 12 },
  metricLabel: { color: brand.colors.muted, fontSize: 12, fontWeight: "800" },
  metricValue: { color: brand.colors.charcoal, fontSize: 15, fontWeight: "900" },
  categoryCard: { alignItems: "center", borderColor: brand.colors.border, borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 12, padding: 12 },
  categoryCardActive: { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" },
  categoryIcon: { alignItems: "center", backgroundColor: brand.colors.charcoal, borderRadius: 16, height: 42, justifyContent: "center", width: 42 },
  categoryIconText: { color: brand.colors.white, fontWeight: "900" },
  categoryBody: { flex: 1 },
  categoryTitle: { color: brand.colors.charcoal, fontWeight: "900" },
  categoryFare: { color: brand.colors.charcoal, fontSize: 12, fontWeight: "900", maxWidth: 84, textAlign: "right" },
  tripRow: { borderTopColor: brand.colors.border, borderTopWidth: 1, gap: 6, paddingTop: 10 },
  tripRef: { color: brand.colors.charcoal, fontWeight: "900" }
});
