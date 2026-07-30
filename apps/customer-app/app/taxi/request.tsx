import * as Location from "expo-location";
import { router, Stack } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline, Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TaxiFareEstimate, TaxiRideCategory, TaxiRoutePreview, TaxiTrip } from "@karigo/shared-types";
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
  mainText?: string;
  secondaryText?: string;
  latitude?: number | null;
  longitude?: number | null;
  providerPlaceId?: string | null;
  distanceKm?: number;
  source: "current" | "saved" | "recent" | "manual" | "search" | "map";
}

const rideServiceAreaLabel = process.env.EXPO_PUBLIC_RIDES_SERVICE_AREA_LABEL || "Abuja";
const defaultRideRegion: Region = {
  latitude: rideServiceAreaLabel.toLowerCase().includes("kano") ? 12.0022 : 9.0765,
  longitude: rideServiceAreaLabel.toLowerCase().includes("kano") ? 8.592 : 7.3986,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08
};
const rideAvailabilityCopy = `Live rides in ${rideServiceAreaLabel}`;
const rideAvailabilityNote = "Service availability may vary by area and time.";
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

function regionForPlaces(pickup?: RidePlace | null, destination?: RidePlace | null): Region {
  const points = [pickup, destination].filter((place): place is RidePlace => Boolean(place?.latitude && place.longitude));
  if (!points.length) return defaultRideRegion;
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

function paymentCopy(paymentMethod: string) {
  if (paymentMethod === "Cash") return "Cash payment is available for supported KariGO Rides.";
  if (paymentMethod === "Wallet") return "Wallet ride payment is coming soon.";
  return "Card ride payment is coming soon.";
}

function newPlaceSessionToken() {
  return `kg-rides-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function hasCoordinate(place?: RidePlace | null): place is RidePlace & { latitude: number; longitude: number } {
  return Number.isFinite(place?.latitude) && Number.isFinite(place?.longitude);
}

function decodePolyline(encoded?: string | null) {
  if (!encoded) return [];
  const coordinates: Array<{ latitude: number; longitude: number }> = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    latitude += (result & 1) ? ~(result >> 1) : (result >> 1);

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    longitude += (result & 1) ? ~(result >> 1) : (result >> 1);

    coordinates.push({ latitude: latitude / 1e5, longitude: longitude / 1e5 });
  }
  return coordinates;
}

function rideStatusCopy(trip?: TaxiTrip | null) {
  if (!trip) return "Ride request status unavailable.";
  if (trip.status === "REQUESTED") return "Finding an available Ride Captain.";
  if (trip.status === "DRIVER_ASSIGNED") return trip.driver ? "Ride Captain assigned." : "Finding an available Ride Captain.";
  if (trip.status === "ACCEPTED") return trip.driver ? "Your Ride Captain is on the way." : "Finding an available Ride Captain.";
  if (trip.status === "ARRIVED_PICKUP") return "Your Ride Captain has arrived at pickup.";
  if (trip.status === "STARTED" || trip.status === "ARRIVED_DESTINATION") return "Ride in progress.";
  if (trip.status === "COMPLETED") return "Ride completed.";
  if (trip.status === "EXPIRED") return "Ride request expired.";
  if (trip.status.startsWith("CANCELLED")) return "Ride request cancelled.";
  return "Ride status updated.";
}

export default function TaxiRequest() {
  const taxiEnabled = ridesControlledPilotEnabled();
  const insets = useSafeAreaInsets();
  const searchToken = useRef(0);
  const placeSessionToken = useRef(newPlaceSessionToken());
  const mapIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapPickerRef = useRef<MapView | null>(null);
  const [step, setStep] = useState<BookingStep>("HOME");
  const [pickup, setPickup] = useState<RidePlace | null>(null);
  const [destination, setDestination] = useState<RidePlace | null>(null);
  const [pickupText, setPickupText] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const [stopText, setStopText] = useState("");
  const [activeField, setActiveField] = useState<PlaceField>("destination");
  const [suggestions, setSuggestions] = useState<RidePlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [googleAttributionRequired, setGoogleAttributionRequired] = useState(false);
  const [mapPicking, setMapPicking] = useState<PlaceField | null>(null);
  const [mapPoint, setMapPoint] = useState<RidePlace | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [mapMoving, setMapMoving] = useState(false);
  const [pickupInstruction, setPickupInstruction] = useState("");
  const [tripNote, setTripNote] = useState("");
  const [scheduleForLater, setScheduleForLater] = useState(false);
  const [scheduledPickupAt, setScheduledPickupAt] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [selectedCategory, setSelectedCategory] = useState("ECONOMY");
  const [categories, setCategories] = useState<TaxiRideCategory[]>([]);
  const [estimate, setEstimate] = useState<TaxiFareEstimate | null>(null);
  const [routePreview, setRoutePreview] = useState<TaxiRoutePreview | null>(null);
  const [routeError, setRouteError] = useState("");
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
    } catch {
      // Optional saved/history data should never block manual ride booking.
    }
  }

  useEffect(() => { void load(); }, [taxiEnabled]);

  useEffect(() => () => {
    if (mapIdleTimer.current) clearTimeout(mapIdleTimer.current);
  }, []);

  useEffect(() => {
    if (step !== "ROUTE") return;
    const query = (activeField === "pickup" ? pickupText : destinationText).trim();
    const token = ++searchToken.current;
    if (query.length < 3) {
      setSuggestions([]);
      setGoogleAttributionRequired(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    const handle = setTimeout(() => {
      void (async () => {
        try {
          const result = await taxiApi.placesAutocomplete({
            input: query,
            sessionToken: placeSessionToken.current,
            latitude: activeField === "destination" ? pickup?.latitude ?? undefined : undefined,
            longitude: activeField === "destination" ? pickup?.longitude ?? undefined : undefined,
            serviceArea: rideServiceAreaLabel,
            fieldType: activeField
          });
          if (token !== searchToken.current) return;
          const mapped = result.predictions.map((prediction) => ({
            label: prediction.mainText,
            address: prediction.description,
            mainText: prediction.mainText,
            secondaryText: prediction.secondaryText,
            providerPlaceId: prediction.placeId,
            distanceKm: prediction.distanceMeters ? Number((prediction.distanceMeters / 1000).toFixed(1)) : undefined,
            source: "search" as const
          }));
          setGoogleAttributionRequired(result.googleAttributionRequired);
          setSuggestions(mapped);
        } catch {
          if (token === searchToken.current) {
            setGoogleAttributionRequired(false);
            setSuggestions([]);
          }
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
    setGoogleAttributionRequired(false);
    setEstimate(null);
    setRoutePreview(null);
    setRouteError("");
  }

  async function selectPrediction(field: PlaceField, place: RidePlace) {
    if (!place.providerPlaceId) {
      setPlace(field, place);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const detail = await taxiApi.placeDetails(place.providerPlaceId, placeSessionToken.current);
      setPlace(field, {
        label: detail.name || place.label,
        address: detail.address,
        mainText: detail.name || place.mainText,
        secondaryText: detail.shortAddress || place.secondaryText,
        latitude: detail.latitude,
        longitude: detail.longitude,
        providerPlaceId: detail.placeId,
        distanceKm: place.distanceKm,
        source: "search"
      });
      if (field === "pickup") setActiveField("destination");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  function resetNewBooking() {
    placeSessionToken.current = newPlaceSessionToken();
    setStep("ROUTE");
    setPickup(null);
    setDestination(null);
    setPickupText("");
    setDestinationText("");
    setStopText("");
    setActiveField("destination");
    setSuggestions([]);
    setGoogleAttributionRequired(false);
    setEstimate(null);
    setRoutePreview(null);
    setRouteError("");
    setCreated(null);
    setMessage("");
    setError("");
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
    setRouteError("");
    try {
      if (!hasCoordinate(pickup) || !hasCoordinate(destination)) {
        setRouteError("Select pickup and destination from search results, current location, saved places or the map before preview.");
        return;
      }
      const preview = await taxiApi.routePreview({
        pickupLatitude: pickup.latitude,
        pickupLongitude: pickup.longitude,
        destinationLatitude: destination.latitude,
        destinationLongitude: destination.longitude,
        pickupAddress: pickup.address,
        destinationAddress: destination.address,
        serviceArea: rideServiceAreaLabel
      });
      setRoutePreview(preview);
      setStep("PREVIEW");
    } catch (err) {
      const safeMessage = friendlyError(err) || "Route estimate temporarily unavailable. Please retry.";
      setRouteError(safeMessage);
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
    setRoutePreview(null);
    setRouteError("");
  }

  function openMapPicker(field: PlaceField) {
    const initial = regionForPlaces(
      field === "pickup" ? pickup : null,
      field === "destination" ? destination : null
    );
    setMapPicking(field);
    setActiveField(field);
    setMapRegion(initial);
    setMapPoint((field === "pickup" ? pickup : destination) ?? {
      label: field === "pickup" ? "Pickup" : "Destination",
      address: field === "pickup" ? pickupText || "Move pin to pickup" : destinationText || "Move pin to destination",
      latitude: initial.latitude,
      longitude: initial.longitude,
      source: "map"
    });
  }

  function handleMapRegionChangeComplete(region: Region) {
    if (!mapPicking) return;
    setMapMoving(false);
    setMapRegion(region);
    setMapPoint({
      label: mapPicking === "pickup" ? "Pickup pin" : "Destination pin",
      address: "Updating selected address...",
      latitude: region.latitude,
      longitude: region.longitude,
      providerPlaceId: `${region.latitude.toFixed(6)},${region.longitude.toFixed(6)}`,
      source: "map"
    });
    if (mapIdleTimer.current) clearTimeout(mapIdleTimer.current);
    mapIdleTimer.current = setTimeout(() => {
      void (async () => {
        const address = await reverseAddress(region.latitude, region.longitude);
        setMapPoint((current) => current && current.latitude === region.latitude && current.longitude === region.longitude
          ? { ...current, address: address || "Selected map location" }
          : current);
      })();
    }, 350);
  }

  async function moveMapToCurrentLocation() {
    setLocating(true);
    setMessage("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setMessage("Location permission was not granted. You can still move the map manually.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const region = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015
      };
      setMapRegion(region);
      mapPickerRef.current?.animateToRegion(region, 250);
      handleMapRegionChangeComplete(region);
    } catch {
      setMessage("Location is unavailable right now. Move the map manually.");
    } finally {
      setLocating(false);
    }
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
    if (!routePreview) {
      setRouteError("Route estimate temporarily unavailable. Please retry.");
      setStep("PREVIEW");
      return;
    }
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
        estimatedDistanceKm: routePreview.distanceKm,
        estimatedDurationMin: routePreview.durationMin,
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
    if (!routePreview) {
      setRouteError("Route estimate temporarily unavailable. Please retry.");
      setStep("PREVIEW");
      return;
    }
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
        estimatedDistanceKm: estimate?.estimatedDistanceKm ?? routePreview.distanceKm,
        estimatedDurationMin: estimate?.estimatedDurationMin ?? routePreview.durationMin,
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
      await taxiApi.cancelTrip(tripId, "Customer cancelled ride before pickup");
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
    const region = mapRegion ?? (mapPoint?.latitude && mapPoint.longitude
      ? { latitude: mapPoint.latitude, longitude: mapPoint.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }
      : regionForPlaces(pickup, destination));

    return <Protected><>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.fullScreenMap}>
        <MapView
          ref={mapPickerRef}
          style={StyleSheet.absoluteFill}
          region={region}
          showsUserLocation
          onRegionChange={() => setMapMoving(true)}
          onRegionChangeComplete={handleMapRegionChangeComplete}
        />
        <View pointerEvents="none" style={styles.centerPin}>
          <View style={styles.centerPinHead} />
          <View style={styles.centerPinTail} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Use current location on map" onPress={() => void moveMapToCurrentLocation()} style={[styles.currentLocationFab, { bottom: Math.max(insets.bottom, 16) + 182 }]}>
          <Text style={styles.currentLocationFabText}>{locating ? "..." : "GPS"}</Text>
        </Pressable>
        <View style={[styles.mapPickerPanel, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Text style={styles.mapTitle}>{mapPicking === "pickup" ? "Choose pickup on map" : "Choose destination on map"}</Text>
          <Text style={ui.muted}>{mapMoving ? "Move the map until the pin is on the right spot." : mapPoint?.address ?? "Move the map to place the center pin."}</Text>
          {message ? <Text style={ui.muted}>{message}</Text> : null}
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
          <Text style={styles.pilotBadge}>{rideAvailabilityCopy}</Text>
          <Text style={ui.muted}>{rideAvailabilityNote}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={resetNewBooking} style={styles.destinationControl}>
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
            googleAttributionRequired={googleAttributionRequired}
            onSelect={(place) => void selectPrediction(activeField, place)}
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
          <Message error>{routeError}</Message>
          <Button title={loading ? "Resolving route..." : "Preview route"} disabled={loading || !canPreview} onPress={() => void applyManualRoute()} />
        </Card>
        <PlaceSection title="Saved places" places={savedPlaces} onSelect={(place) => setPlace("destination", place)} />
        <PlaceSection title="Recent places" places={recentPlaces} onSelect={(place) => setPlace("destination", place)} />
      </> : null}

      {step === "PREVIEW" ? <>
        <RoutePreview pickup={pickup} destination={destination} stopText={stopText} routePreview={routePreview} routeError={routeError} />
        <Card>
          <Text style={ui.cardTitle}>Confirm route</Text>
          <Text style={ui.muted}>KariGO will calculate category fares from the selected road route.</Text>
          <Button title={loading ? "Estimating..." : "Show ride categories and fare"} disabled={loading || !pickup || !destination || !routePreview} onPress={() => void estimateFare()} />
        </Card>
      </> : null}

      {step === "CONFIRM" ? <>
        <RoutePreview pickup={pickup} destination={destination} stopText={stopText} routePreview={routePreview} compact />
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
          <Text style={ui.muted}>{rideAvailabilityNote}</Text>
          <Button title={loading ? "Requesting..." : scheduleForLater ? `Schedule ${selectedCategoryDetail?.name ?? "ride"}` : `Request ${selectedCategoryDetail?.name ?? "ride"}`} disabled={loading || !estimate} onPress={() => void createTrip()} />
        </Card>
      </> : null}

      {step === "TRACKING" ? <>
        {created ? <Card>
          <Text style={ui.cardTitle}>Ride request received</Text>
          <Text>Reference: {created.tripReference}</Text>
          <StatusBadge status={created.status} />
          <Text style={ui.muted}>{rideStatusCopy(created)}</Text>
          {created.tripPin ? <Text style={ui.otpCode}>{created.tripPin.slice(0, 3)} {created.tripPin.slice(3)}</Text> : null}
          <Text style={ui.muted}>Only share this ride PIN with the approved Ride Captain after pickup.</Text>
          {created.driver ? <Text style={ui.muted}>Ride Captain: {created.driver.fullName} - {created.driver.vehiclePlateNumber ?? "vehicle pending"}</Text> : <Text style={ui.muted}>Finding an available Ride Captain.</Text>}
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

function SuggestionList({ activeField, places, searching, googleAttributionRequired, onSelect }: { activeField: PlaceField; places: RidePlace[]; searching: boolean; googleAttributionRequired: boolean; onSelect: (place: RidePlace) => void }) {
  if (searching) return <Text style={ui.muted}>Searching {activeField} suggestions...</Text>;
  if (!places.length) return null;
  return <View style={styles.suggestionBox}>
    {places.map((place) => <Pressable key={`${place.providerPlaceId}-${place.label}`} accessibilityRole="button" onPress={() => onSelect(place)} style={styles.suggestionRow}>
      <View style={styles.placeDot}><Text style={styles.placeDotText}>{activeField === "pickup" ? "P" : "D"}</Text></View>
      <View style={styles.placeBody}>
        <Text style={styles.placeTitle}>{place.label}</Text>
        <Text style={ui.muted}>{place.secondaryText || place.address}{place.distanceKm ? ` \u2022 ${place.distanceKm} km away` : ""}</Text>
      </View>
    </Pressable>)}
    {googleAttributionRequired ? <Text style={styles.googleAttribution}>Powered by Google</Text> : null}
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

function RoutePreview({ pickup, destination, stopText, routePreview, routeError, compact = false }: { pickup: RidePlace | null; destination: RidePlace | null; stopText?: string; routePreview?: TaxiRoutePreview | null; routeError?: string; compact?: boolean }) {
  const mapRef = useRef<MapView | null>(null);
  const routePoints = useMemo(() => decodePolyline(routePreview?.encodedPolyline), [routePreview?.encodedPolyline]);
  const region = regionForPlaces(pickup, destination);

  useEffect(() => {
    if (routePoints.length < 2) return;
    const handle = setTimeout(() => {
      mapRef.current?.fitToCoordinates(routePoints, {
        animated: false,
        edgePadding: { top: 48, right: 48, bottom: 48, left: 48 }
      });
    }, 150);
    return () => clearTimeout(handle);
  }, [routePoints]);

  return <Card>
    <Text style={ui.cardTitle}>Route preview</Text>
    <View style={[styles.mapPreview, compact && styles.mapPreviewCompact]}>
      <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={region} region={routePoints.length ? undefined : region} scrollEnabled={!compact} zoomEnabled={!compact} pitchEnabled={false} rotateEnabled={false}>
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
      <Metric label="Distance" value={routePreview?.distanceKm ? `${routePreview.distanceKm} km` : "Route distance pending"} />
      <Metric label="Duration" value={routePreview?.durationMin ? `${routePreview.durationMin} min` : "Route duration pending"} />
    </View>
    {!routePreview ? <Text style={ui.muted}>{routeError || "Route estimate temporarily unavailable. Please retry."}</Text> : null}
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
  googleAttribution: { alignSelf: "flex-end", color: brand.colors.muted, fontSize: 11, fontWeight: "800" },
  placeRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  placeDot: { alignItems: "center", backgroundColor: "#FEF2F2", borderRadius: 16, height: 34, justifyContent: "center", width: 34 },
  placeDotText: { color: brand.colors.primaryDark, fontWeight: "900" },
  placeBody: { flex: 1 },
  placeTitle: { color: brand.colors.charcoal, fontWeight: "900" },
  fullScreenMap: { backgroundColor: brand.colors.background, flex: 1 },
  centerPin: { alignItems: "center", left: "50%", marginLeft: -14, marginTop: -34, position: "absolute", top: "50%" },
  centerPinHead: { backgroundColor: brand.colors.primary, borderColor: brand.colors.white, borderRadius: 18, borderWidth: 4, height: 28, shadowColor: "#111827", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 10, width: 28 },
  centerPinTail: { backgroundColor: brand.colors.primary, height: 14, marginTop: -3, transform: [{ rotate: "45deg" }], width: 14 },
  currentLocationFab: { alignItems: "center", backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 999, borderWidth: 1, height: 50, justifyContent: "center", position: "absolute", right: 18, shadowColor: "#111827", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 10, width: 50 },
  currentLocationFabText: { color: brand.colors.charcoal, fontSize: 12, fontWeight: "900" },
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
