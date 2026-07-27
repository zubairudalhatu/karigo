import * as Location from "expo-location";
import { router, Stack } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline, Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TaxiFareEstimate, TaxiRideCategory, TaxiTrip } from "@karigo/shared-types";
import { brand } from "@karigo/config";
import { Address, addressesApi } from "../../src/api/addresses.api";
import { taxiApi } from "../../src/api/taxi.api";
import { Button, Card, Empty, Field, Message, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";
import { ridesControlledPilotEnabled } from "../../src/lib/rides-flags";

type BookingStep = "HOME" | "ROUTE" | "PREVIEW" | "CONFIRM" | "TRACKING";
type PlaceField = "pickup" | "destination";

interface RidePlace {
  label: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  providerPlaceId?: string | null;
  distanceKm?: number;
  source: "current" | "saved" | "recent" | "manual" | "search" | "map";
}

const kanoRegion: Region = {
  latitude: 12.0022,
  longitude: 8.592,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08
};
const ridePilotNotice = "Controlled pilot";
const cancellableBeforePickup = new Set(["REQUESTED", "DRIVER_ASSIGNED", "ACCEPTED"]);

const money = (kobo?: number | null) => `\u20A6${Math.round(Number(kobo ?? 0) / 100).toLocaleString()}`;
const fareRange = (range?: { min: number; max: number } | null) => range ? `${money(range.min)}\u2013${money(range.max)}` : "Estimate pending";

function placeFromAddress(address: Address): RidePlace {
  return {
    label: address.label,
    address: `${address.addressLine}, ${address.city}`,
    latitude: address.latitude,
    longitude: address.longitude,
    source: "saved"
  };
}

function distanceKmBetween(a?: Pick<RidePlace, "latitude" | "longitude"> | null, b?: Pick<RidePlace, "latitude" | "longitude"> | null) {
  if (!a?.latitude || !a.longitude || !b?.latitude || !b.longitude) return undefined;
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Number((2 * earthRadiusKm * Math.asin(Math.sqrt(h))).toFixed(2));
}

function regionForPlaces(pickup?: RidePlace | null, destination?: RidePlace | null): Region {
  const points = [pickup, destination].filter((place): place is RidePlace => Boolean(place?.latitude && place.longitude));
  if (!points.length) return kanoRegion;
  if (points.length === 1) {
    return {
      latitude: Number(points[0].latitude),
      longitude: Number(points[0].longitude),
      latitudeDelta: 0.04,
      longitudeDelta: 0.04
    };
  }

  const latitudes = points.map((point) => Number(point.latitude));
  const longitudes = points.map((point) => Number(point.longitude));
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max(0.03, (maxLat - minLat) * 1.8),
    longitudeDelta: Math.max(0.03, (maxLon - minLon) * 1.8)
  };
}

async function reverseAddress(latitude: number, longitude: number) {
  const [place] = await Location.reverseGeocodeAsync({ latitude, longitude }).catch(() => []);
  return [place?.name, place?.street, place?.district, place?.city ?? place?.subregion, place?.region]
    .filter(Boolean)
    .join(", ");
}

async function geocodePlace(text: string, label: string): Promise<RidePlace> {
  const query = text.trim();
  const [result] = await Location.geocodeAsync(`${query}, Nigeria`).catch(() => []);
  if (!result) return { label, address: query, source: "manual" };
  const address = await reverseAddress(result.latitude, result.longitude);
  return {
    label,
    address: address || query,
    latitude: result.latitude,
    longitude: result.longitude,
    providerPlaceId: `${result.latitude.toFixed(6)},${result.longitude.toFixed(6)}`,
    source: "search"
  };
}

function paymentCopy(paymentMethod: string) {
  if (paymentMethod === "Cash") return "Cash is available during the controlled pilot. KariGO Operations coordinates assignment manually.";
  if (paymentMethod === "Wallet") return "Wallet ride payment is coming soon and unavailable during this pilot.";
  return "Card ride payment is coming soon and unavailable during this pilot.";
}

export default function TaxiRequest() {
  const taxiEnabled = ridesControlledPilotEnabled();
  const insets = useSafeAreaInsets();
  const searchToken = useRef(0);
  const [step, setStep] = useState<BookingStep>("HOME");
  const [pickup, setPickup] = useState<RidePlace | null>(null);
  const [destination, setDestination] = useState<RidePlace | null>(null);
  const [pickupText, setPickupText] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const [stopText, setStopText] = useState("");
  const [activeField, setActiveField] = useState<PlaceField>("destination");
  const [suggestions, setSuggestions] = useState<RidePlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [mapPicking, setMapPicking] = useState<PlaceField | null>(null);
  const [mapPoint, setMapPoint] = useState<RidePlace | null>(null);
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
  const canPreview = pickupText.trim().length > 2 && destinationText.trim().length > 2;

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
      // Optional saved/history data should never block manual ride booking.
    }
  }

  useEffect(() => { void load(); }, [taxiEnabled]);

  useEffect(() => {
    if (step !== "ROUTE") return;
    const query = (activeField === "pickup" ? pickupText : destinationText).trim();
    const token = ++searchToken.current;
    if (query.length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const handle = setTimeout(() => {
      void (async () => {
        try {
          const results = await Location.geocodeAsync(`${query}, Nigeria`);
          if (token !== searchToken.current) return;
          const mapped = results.slice(0, 5).map((result, index) => ({
            label: index === 0 ? query : `${query} option ${index + 1}`,
            address: query,
            latitude: result.latitude,
            longitude: result.longitude,
            providerPlaceId: `${result.latitude.toFixed(6)},${result.longitude.toFixed(6)}`,
            distanceKm: activeField === "destination" ? distanceKmBetween(pickup, result) : undefined,
            source: "search" as const
          }));
          setSuggestions(mapped);
        } catch {
          if (token === searchToken.current) setSuggestions([]);
        } finally {
          if (token === searchToken.current) setSearching(false);
        }
      })();
    }, 450);

    return () => clearTimeout(handle);
  }, [activeField, destinationText, pickup, pickupText, step]);

  function setPlace(field: PlaceField, place: RidePlace) {
    if (field === "pickup") {
      setPickup(place);
      setPickupText(place.address);
    } else {
      setDestination(place);
      setDestinationText(place.address);
    }
    setSuggestions([]);
    setEstimate(null);
  }

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
      const address = await reverseAddress(position.coords.latitude, position.coords.longitude);
      const current: RidePlace = {
        label: "Current location",
        address: address || "Current location",
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        providerPlaceId: `${position.coords.latitude.toFixed(6)},${position.coords.longitude.toFixed(6)}`,
        source: "current"
      };
      setPlace("pickup", current);
      setMessage("Current location set as pickup. Confirm the written address before booking.");
    } catch {
      setMessage("Location is unavailable right now. Enter pickup manually.");
    } finally {
      setLocating(false);
    }
  }

  async function applyManualRoute() {
    setLoading(true);
    setError("");
    try {
      const nextPickup = pickup?.latitude && pickup.longitude ? pickup : await geocodePlace(pickupText, "Pickup");
      const nextDestination = destination?.latitude && destination.longitude ? destination : await geocodePlace(destinationText, "Destination");
      setPlace("pickup", nextPickup);
      setPlace("destination", nextDestination);
      setStep("PREVIEW");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
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

  function openMapPicker(field: PlaceField) {
    setMapPicking(field);
    setActiveField(field);
    setMapPoint((field === "pickup" ? pickup : destination) ?? {
      label: field === "pickup" ? "Pickup" : "Destination",
      address: field === "pickup" ? pickupText || "Move pin to pickup" : destinationText || "Move pin to destination",
      latitude: regionForPlaces(pickup, destination).latitude,
      longitude: regionForPlaces(pickup, destination).longitude,
      source: "map"
    });
  }

  async function confirmMapPoint() {
    if (!mapPicking || !mapPoint?.latitude || !mapPoint.longitude) return;
    setLoading(true);
    try {
      const address = await reverseAddress(mapPoint.latitude, mapPoint.longitude);
      setPlace(mapPicking, {
        ...mapPoint,
        label: mapPicking === "pickup" ? "Pickup pin" : "Destination pin",
        address: address || mapPoint.address,
        source: "map"
      });
      setMapPicking(null);
    } finally {
      setLoading(false);
    }
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
        customerNote: [tripNote, stopText.trim() ? `Additional stop: ${stopText.trim()}` : ""].filter(Boolean).join("\n") || undefined
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

  function backOneStep() {
    if (step === "ROUTE") setStep("HOME");
    else if (step === "PREVIEW") setStep("ROUTE");
    else if (step === "CONFIRM") setStep("PREVIEW");
    else setStep("HOME");
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

  if (mapPicking) {
    const region = mapPoint?.latitude && mapPoint.longitude
      ? { latitude: mapPoint.latitude, longitude: mapPoint.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }
      : regionForPlaces(pickup, destination);

    return <Protected><>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.fullScreenMap}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          showsUserLocation
          onPress={(event) => {
            const { latitude, longitude } = event.nativeEvent.coordinate;
            setMapPoint({
              label: mapPicking === "pickup" ? "Pickup pin" : "Destination pin",
              address: "Selected map location",
              latitude,
              longitude,
              providerPlaceId: `${latitude.toFixed(6)},${longitude.toFixed(6)}`,
              source: "map"
            });
          }}
        >
          {mapPoint?.latitude && mapPoint.longitude ? <Marker coordinate={{ latitude: mapPoint.latitude, longitude: mapPoint.longitude }} title={mapPoint.label} /> : null}
        </MapView>
        <View style={[styles.mapPickerPanel, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Text style={styles.mapTitle}>{mapPicking === "pickup" ? "Choose pickup on map" : "Choose destination on map"}</Text>
          <Text style={ui.muted}>{mapPoint?.address ?? "Tap the map to move the pin."}</Text>
          <View style={styles.inlineActions}>
            <Button title="Cancel" tone="muted" onPress={() => setMapPicking(null)} />
            <Button title={loading ? "Confirming..." : "Confirm location"} disabled={loading || !mapPoint} onPress={() => void confirmMapPoint()} />
          </View>
        </View>
      </View>
    </></Protected>;
  }

  return <Protected><>
    <Stack.Screen options={{ headerShown: false }} />
    <Screen title={undefined}>
      <BookingHeader step={step} onBack={backOneStep} onClose={() => router.replace("/tabs/home")} />
      <Message error>{error}</Message>
      <Message>{message}</Message>

      {step === "HOME" ? <>
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>KariGO Rides</Text>
          <Text style={styles.heroTitle}>Ready, set, ride.</Text>
          <Text style={styles.pilotBadge}>{ridePilotNotice}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => setStep("ROUTE")} style={styles.destinationControl}>
          <Text style={styles.destinationLabel}>Where are you going?</Text>
          <Text style={styles.destinationHint}>Search, use saved places, or choose a point on the map.</Text>
        </Pressable>
        <Button title={locating ? "Detecting pickup..." : "Use current location as pickup"} tone="muted" disabled={locating} onPress={() => void useCurrentLocation()} />
        <PlaceSection title="Saved places" places={savedPlaces} onSelect={(place) => { setPlace("destination", place); setStep("ROUTE"); }} />
        <PlaceSection title="Recent destinations" places={recentPlaces} onSelect={(place) => { setPlace("destination", place); setStep("ROUTE"); }} />
      </> : null}

      {step === "ROUTE" ? <>
        <Card>
          <Text style={ui.cardTitle}>Pickup and destination</Text>
          <Text style={ui.muted}>Search suggestions are based on your typed address and prioritised for Nigeria.</Text>
          <Field
            placeholder="Pickup address"
            value={pickupText}
            onFocus={() => setActiveField("pickup")}
            onChangeText={(value) => {
              setActiveField("pickup");
              setPickupText(value);
              setPickup(value.trim() ? { label: "Pickup", address: value.trim(), source: "manual" } : null);
            }}
            style={styles.addressInput}
          />
          <Field
            placeholder="Destination address"
            value={destinationText}
            onFocus={() => setActiveField("destination")}
            onChangeText={(value) => {
              setActiveField("destination");
              setDestinationText(value);
              setDestination(value.trim() ? { label: "Destination", address: value.trim(), source: "manual" } : null);
            }}
            style={styles.addressInput}
          />
          <SuggestionList
            activeField={activeField}
            places={suggestions}
            searching={searching}
            onSelect={(place) => setPlace(activeField, place)}
          />
          <View style={styles.inlineActions}>
            <Button title="Swap" tone="muted" onPress={swapRoute} disabled={!pickup && !destination} />
            <Button title="Add stop" tone="muted" onPress={() => setStopText(stopText ? "" : " ")} />
          </View>
          {stopText ? <Field placeholder="Additional stop optional" value={stopText} onChangeText={setStopText} /> : null}
          <View style={styles.inlineActions}>
            <Button title={locating ? "Detecting..." : "Use current pickup"} tone="muted" disabled={locating} onPress={() => void useCurrentLocation()} />
            <Button title="Pickup on map" tone="muted" onPress={() => openMapPicker("pickup")} />
            <Button title="Destination on map" tone="muted" onPress={() => openMapPicker("destination")} />
          </View>
          <Button title={loading ? "Resolving route..." : "Preview route"} disabled={loading || !canPreview} onPress={() => void applyManualRoute()} />
        </Card>
        <PlaceSection title="Saved places" places={savedPlaces} onSelect={(place) => setPlace("destination", place)} />
        <PlaceSection title="Recent places" places={recentPlaces} onSelect={(place) => setPlace("destination", place)} />
      </> : null}

      {step === "PREVIEW" ? <>
        <RoutePreview pickup={pickup} destination={destination} stopText={stopText} distanceKm={routeDistanceKm} durationMin={estimatedDurationMin} />
        <Card>
          <Text style={ui.cardTitle}>Confirm route</Text>
          <Text style={ui.muted}>KariGO will calculate category fares from the selected route before creating a controlled-pilot request.</Text>
          <Button title={loading ? "Estimating..." : "Show ride categories and fare"} disabled={loading || !pickup || !destination} onPress={() => void estimateFare()} />
        </Card>
      </> : null}

      {step === "CONFIRM" ? <>
        <RoutePreview pickup={pickup} destination={destination} stopText={stopText} distanceKm={estimate?.estimatedDistanceKm ?? routeDistanceKm} durationMin={estimate?.estimatedDurationMin ?? estimatedDurationMin} compact />
        <Card>
          <Text style={ui.cardTitle}>Choose ride category</Text>
          {categoryOptions.length === 0 ? <Empty message="No ride category is available in this area yet." /> : categoryOptions.map((category) => (
            <Pressable key={category.id} accessibilityRole="button" onPress={() => void estimateFare(category.id)} style={[styles.categoryCard, selectedCategory === category.id && styles.categoryCardActive]}>
              <View style={styles.categoryIcon}><Text style={styles.categoryIconText}>{category.name.replace("KariGO ", "").slice(0, 2).toUpperCase()}</Text></View>
              <View style={styles.categoryBody}>
                <Text style={styles.categoryTitle}>{category.name}</Text>
                <Text style={styles.categoryMeta}>{category.arrivalEstimateMinutes} min {"\u2022"} Up to {category.passengerCapacity} passengers</Text>
                <Text style={styles.categoryDescription} numberOfLines={1}>{category.description}</Text>
              </View>
              <Text style={styles.categoryFare} numberOfLines={1}>{fareRange(category.fareRangeKobo)}</Text>
            </Pressable>
          ))}
        </Card>
        <Card>
          <Text style={ui.cardTitle}>Payment and schedule</Text>
          <View style={styles.paymentGrid}>
            {["Cash", "Wallet", "Card"].map((option) => (
              <Pressable key={option} accessibilityRole="button" disabled={option !== "Cash"} onPress={() => setPaymentMethod(option)} style={[styles.paymentOption, paymentMethod === option && styles.paymentOptionActive, option !== "Cash" && styles.paymentOptionDisabled]}>
                <Text style={styles.paymentTitle}>{option}</Text>
                <Text style={styles.paymentSubtitle}>{option === "Cash" ? "Available" : "Coming soon"}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={ui.muted}>{paymentCopy(paymentMethod)}</Text>
          <Button title={scheduleForLater ? "Use immediate ride" : "Schedule for later"} tone="muted" onPress={() => setScheduleForLater((value) => !value)} />
          {scheduleForLater ? <Field placeholder="Preferred pickup time e.g. Today 6:30 PM" value={scheduledPickupAt} onChangeText={setScheduledPickupAt} /> : null}
          <Field placeholder="Pickup instruction optional" value={pickupInstruction} onChangeText={setPickupInstruction} />
          <Field placeholder="Trip note optional" value={tripNote} onChangeText={setTripNote} />
        </Card>
        <Card>
          <Text style={ui.cardTitle}>{selectedCategoryDetail?.name ?? "Selected ride"}</Text>
          <Text style={ui.priceValue}>{money(estimate?.estimatedFareKobo)}</Text>
          <Text style={ui.muted}>KariGO Operations assigns an approved Ride Captain manually. Ride payment and payout automation remain disabled.</Text>
          <Button title={loading ? "Requesting..." : scheduleForLater ? `Schedule ${selectedCategoryDetail?.name ?? "ride"}` : `Request ${selectedCategoryDetail?.name ?? "ride"}`} disabled={loading || !estimate} onPress={() => void createTrip()} />
        </Card>
      </> : null}

      {step === "TRACKING" ? <>
        {created ? <Card>
          <Text style={ui.cardTitle}>Ride request received</Text>
          <Text>Reference: {created.tripReference}</Text>
          <StatusBadge status={created.status} />
          {created.tripPin ? <Text style={ui.otpCode}>{created.tripPin.slice(0, 3)} {created.tripPin.slice(3)}</Text> : null}
          <Text style={ui.muted}>Only share this ride PIN with the approved Ride Captain after pickup.</Text>
          {created.driver ? <Text style={ui.muted}>Ride Captain: {created.driver.fullName} - {created.driver.vehiclePlateNumber ?? "vehicle pending"}</Text> : <Text style={ui.muted}>KariGO Operations is assigning an approved Ride Captain.</Text>}
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

      <View style={{ height: Math.max(insets.bottom, 18) }} />
    </Screen>
  </></Protected>;
}

function BookingHeader({ step, onBack, onClose }: { step: BookingStep; onBack: () => void; onClose: () => void }) {
  if (step === "HOME") return null;
  return <View style={styles.bookingHeader}>
    <Pressable accessibilityRole="button" onPress={onBack} style={styles.headerButton}><Text style={styles.headerButtonText}>Back</Text></Pressable>
    <Text style={styles.headerTitle}>{step === "ROUTE" ? "Route" : step === "PREVIEW" ? "Preview" : step === "CONFIRM" ? "Confirm" : "Ride status"}</Text>
    <Pressable accessibilityRole="button" onPress={onClose} style={styles.headerButton}><Text style={styles.headerButtonText}>Close</Text></Pressable>
  </View>;
}

function SuggestionList({ activeField, places, searching, onSelect }: { activeField: PlaceField; places: RidePlace[]; searching: boolean; onSelect: (place: RidePlace) => void }) {
  if (searching) return <Text style={ui.muted}>Searching {activeField} suggestions...</Text>;
  if (!places.length) return null;
  return <View style={styles.suggestionBox}>
    {places.map((place) => <Pressable key={`${place.providerPlaceId}-${place.label}`} accessibilityRole="button" onPress={() => onSelect(place)} style={styles.suggestionRow}>
      <View style={styles.placeDot}><Text style={styles.placeDotText}>{activeField === "pickup" ? "P" : "D"}</Text></View>
      <View style={styles.placeBody}>
        <Text style={styles.placeTitle}>{place.label}</Text>
        <Text style={ui.muted}>{place.address}{place.distanceKm ? ` \u2022 ${place.distanceKm} km away` : ""}</Text>
      </View>
    </Pressable>)}
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

function RoutePreview({ pickup, destination, stopText, distanceKm, durationMin, compact = false }: { pickup: RidePlace | null; destination: RidePlace | null; stopText?: string; distanceKm?: number; durationMin?: number; compact?: boolean }) {
  const routePoints = [pickup, destination]
    .filter((place): place is RidePlace => Boolean(place?.latitude && place.longitude))
    .map((place) => ({ latitude: Number(place.latitude), longitude: Number(place.longitude) }));
  const region = regionForPlaces(pickup, destination);

  return <Card>
    <Text style={ui.cardTitle}>Route preview</Text>
    <View style={[styles.mapPreview, compact && styles.mapPreviewCompact]}>
      <MapView style={StyleSheet.absoluteFill} initialRegion={region} region={region} scrollEnabled={!compact} zoomEnabled={!compact} pitchEnabled={false} rotateEnabled={false}>
        {pickup?.latitude && pickup.longitude ? <Marker coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }} title="Pickup" /> : null}
        {destination?.latitude && destination.longitude ? <Marker coordinate={{ latitude: destination.latitude, longitude: destination.longitude }} title="Destination" pinColor={brand.colors.primary} /> : null}
        {routePoints.length >= 2 ? <Polyline coordinates={routePoints} strokeColor={brand.colors.primary} strokeWidth={4} /> : null}
      </MapView>
    </View>
    <View style={styles.routePanel}>
      <RoutePoint label="Pickup" value={pickup?.address ?? "Pickup pending"} tone="pickup" />
      {stopText?.trim() ? <RoutePoint label="Stop" value={stopText.trim()} tone="stop" /> : null}
      <RoutePoint label="Destination" value={destination?.address ?? "Destination pending"} tone="destination" />
    </View>
    <View style={styles.metrics}>
      <Metric label="Distance" value={distanceKm ? `${distanceKm} km` : "Route distance pending"} />
      <Metric label="Duration" value={durationMin ? `${durationMin} min` : "Route duration pending"} />
    </View>
  </Card>;
}

function RoutePoint({ label, value, tone }: { label: string; value: string; tone: "pickup" | "stop" | "destination" }) {
  return <View style={styles.routePoint}>
    <View style={[styles.routeMarker, tone === "pickup" && styles.pickupMarker, tone === "stop" && styles.stopMarker]} />
    <View style={styles.routeText}>
      <Text style={styles.routeLabel}>{label}</Text>
      <Text style={styles.routeValue} numberOfLines={2}>{value}</Text>
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
  hero: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 24, borderWidth: 1, gap: 8, padding: 18 },
  heroEyebrow: { color: brand.colors.primary, fontSize: 12, fontWeight: "900", letterSpacing: 1.2, textTransform: "uppercase" },
  heroTitle: { color: brand.colors.charcoal, fontSize: 30, fontWeight: "900", letterSpacing: -0.5 },
  pilotBadge: { alignSelf: "flex-start", backgroundColor: "#FEF2F2", borderRadius: 999, color: brand.colors.primaryDark, fontSize: 12, fontWeight: "900", paddingHorizontal: 10, paddingVertical: 5 },
  destinationControl: { backgroundColor: brand.colors.charcoal, borderRadius: 22, gap: 6, padding: 18 },
  destinationLabel: { color: brand.colors.white, fontSize: 20, fontWeight: "900" },
  destinationHint: { color: "#D1D5DB", lineHeight: 20 },
  bookingHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  headerButton: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
  headerButtonText: { color: brand.colors.charcoal, fontWeight: "900" },
  headerTitle: { color: brand.colors.charcoal, fontSize: 16, fontWeight: "900" },
  addressInput: { textAlign: "left", writingDirection: "ltr" },
  inlineActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  suggestionBox: { backgroundColor: "#F9FAFB", borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, gap: 10, padding: 10 },
  suggestionRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  placeRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  placeDot: { alignItems: "center", backgroundColor: "#FEF2F2", borderRadius: 16, height: 34, justifyContent: "center", width: 34 },
  placeDotText: { color: brand.colors.primaryDark, fontWeight: "900" },
  placeBody: { flex: 1 },
  placeTitle: { color: brand.colors.charcoal, fontWeight: "900" },
  fullScreenMap: { backgroundColor: brand.colors.background, flex: 1 },
  mapPickerPanel: { backgroundColor: brand.colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, bottom: 0, gap: 12, left: 0, padding: 18, position: "absolute", right: 0 },
  mapTitle: { color: brand.colors.charcoal, fontSize: 18, fontWeight: "900" },
  mapPreview: { borderRadius: 20, height: 250, overflow: "hidden" },
  mapPreviewCompact: { height: 180 },
  routePanel: { backgroundColor: "#F9FAFB", borderRadius: 18, gap: 10, padding: 12 },
  routePoint: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  routeText: { flex: 1 },
  routeMarker: { backgroundColor: brand.colors.charcoal, borderColor: brand.colors.white, borderRadius: 999, borderWidth: 3, height: 18, marginTop: 2, width: 18 },
  pickupMarker: { backgroundColor: brand.colors.success },
  stopMarker: { backgroundColor: brand.colors.warning },
  routeLabel: { color: brand.colors.muted, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  routeValue: { color: brand.colors.charcoal, fontSize: 14, fontWeight: "800", lineHeight: 20 },
  metrics: { flexDirection: "row", gap: 10 },
  metricCard: { backgroundColor: "#F9FAFB", borderRadius: 16, flex: 1, padding: 12 },
  metricLabel: { color: brand.colors.muted, fontSize: 12, fontWeight: "800" },
  metricValue: { color: brand.colors.charcoal, fontSize: 15, fontWeight: "900" },
  categoryCard: { alignItems: "center", borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 10, minHeight: 74, padding: 10 },
  categoryCardActive: { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" },
  categoryIcon: { alignItems: "center", backgroundColor: brand.colors.charcoal, borderRadius: 16, height: 38, justifyContent: "center", width: 38 },
  categoryIconText: { color: brand.colors.white, fontWeight: "900" },
  categoryBody: { flex: 1, gap: 2 },
  categoryTitle: { color: brand.colors.charcoal, fontWeight: "900" },
  categoryMeta: { color: brand.colors.muted, fontSize: 12, fontWeight: "700" },
  categoryDescription: { color: brand.colors.muted, fontSize: 12 },
  categoryFare: { color: brand.colors.charcoal, fontSize: 13, fontWeight: "900", minWidth: 96, textAlign: "right" },
  paymentGrid: { flexDirection: "row", gap: 8 },
  paymentOption: { borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, flex: 1, gap: 2, padding: 10 },
  paymentOptionActive: { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" },
  paymentOptionDisabled: { opacity: 0.55 },
  paymentTitle: { color: brand.colors.charcoal, fontWeight: "900" },
  paymentSubtitle: { color: brand.colors.muted, fontSize: 11, fontWeight: "800" },
  tripRow: { borderTopColor: brand.colors.border, borderTopWidth: 1, gap: 6, paddingTop: 10 },
  tripRef: { color: brand.colors.charcoal, fontWeight: "900" }
});
