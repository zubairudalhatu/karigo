import * as Location from "expo-location";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, AppState, BackHandler, Keyboard, Linking, PanResponder, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import MapView, { Marker, Polyline, Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  KariGoApiError,
  TaxiFareEstimate,
  TaxiRideCategory,
  TaxiRoutePreview,
  TaxiTrip,
  customerCancellableTaxiTripStatuses,
  isActiveTaxiTripStatus,
  isTerminalTaxiTripStatus,
  taxiLifecycleForStatus
} from "@karigo/shared-types";
import { brand } from "@karigo/config";
import { Address, addressesApi } from "../../src/api/addresses.api";
import { taxiApi } from "../../src/api/taxi.api";
import { Button, Card, Empty, Field, Loading, Message, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";
import { formatRideFareKobo, formatRideFareRangeKobo } from "../../src/lib/rides-format";
import { ridesProductionEnabled } from "../../src/lib/rides-flags";

type BookingStep = "HOME" | "ROUTE" | "CONFIRM" | "DETAILS" | "TRACKING";
type PlaceField = "pickup" | "destination" | "stop";
type RidePanelState = "expanded" | "half" | "collapsed";
type SupportedRideCity = "Abuja" | "Kano";
type RideEntryStatus = "checking" | "active" | "clear" | "failed";

interface RidePlace {
  label: string;
  address: string;
  mainText?: string;
  secondaryText?: string;
  latitude?: number | null;
  longitude?: number | null;
  providerPlaceId?: string | null;
  distanceKm?: number;
  source: "current" | "saved" | "recent" | "manual" | "search" | "map" | "stop";
}

const rideServiceAreaLabel = process.env.EXPO_PUBLIC_RIDES_SERVICE_AREA_LABEL || "Abuja";
const serviceAreaCenters = {
  Abuja: { latitude: 9.0765, longitude: 7.3986 },
  Kano: { latitude: 12.0022, longitude: 8.592 }
} as const;
const supportedRideCities: SupportedRideCity[] = ["Abuja", "Kano"];
const rideCityRadiusMeters = 85_000;
const rideAvailabilityNote = "Service availability may vary by area and time.";
const routeUnavailableMessage = "KariGO Rides is not yet available in this pickup or destination area. Choose a pickup and destination in Kano or Abuja.";
const intercityUnavailableMessage = "Intercity KariGO Rides are not available yet. Choose pickup and destination within the same city.";
const staleFareMessage = "Ride fare estimate expired. Please preview and estimate the route again.";
const cancellableBeforePickup = new Set<string>(customerCancellableTaxiTripStatuses);
const duplicateActiveRideMessage = "You already have an active KariGO Ride. View or cancel it before requesting another immediate ride.";
const reverseGeocodeDebounceMs = 550;
const mapMovementThresholdMeters = 14;

const defaultRideRegion: Region = {
  latitude: rideServiceAreaLabel.toLowerCase().includes("kano") ? serviceAreaCenters.Kano.latitude : serviceAreaCenters.Abuja.latitude,
  longitude: rideServiceAreaLabel.toLowerCase().includes("kano") ? serviceAreaCenters.Kano.longitude : serviceAreaCenters.Abuja.longitude,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08
};

const fareRange = formatRideFareRangeKobo;

function placeFromAddress(address: Address): RidePlace {
  return {
    label: address.label,
    address: `${address.addressLine}, ${address.city}`,
    latitude: address.latitude,
    longitude: address.longitude,
    source: "saved"
  };
}

function coordinateFromUnknown(value: unknown) {
  const numeric = typeof value === "object" && value !== null && "toString" in value
    ? Number((value as { toString: () => string }).toString())
    : Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function hasCoordinate(place?: RidePlace | null): place is RidePlace & { latitude: number; longitude: number } {
  return Number.isFinite(place?.latitude) && Number.isFinite(place?.longitude);
}

function distanceMeters(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

function cityForCoordinate(latitude?: number | null, longitude?: number | null): SupportedRideCity | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const point = { latitude: Number(latitude), longitude: Number(longitude) };
  const closest = supportedRideCities
    .map((city) => ({ city, meters: distanceMeters(point, serviceAreaCenters[city]) }))
    .sort((a, b) => a.meters - b.meters)[0];
  return closest && closest.meters <= rideCityRadiusMeters ? closest.city : null;
}

function serviceAreaForPlace(place?: RidePlace | null) {
  return cityForCoordinate(place?.latitude, place?.longitude);
}

function routeCityIssue(pickup?: RidePlace | null, destination?: RidePlace | null, stop?: RidePlace | null) {
  if (!hasCoordinate(pickup) || !hasCoordinate(destination)) return "";
  const pickupCity = serviceAreaForPlace(pickup);
  const destinationCity = serviceAreaForPlace(destination);
  const stopCity = stop && hasCoordinate(stop) ? serviceAreaForPlace(stop) : null;
  if (!pickupCity || !destinationCity || (stop && !stopCity)) return routeUnavailableMessage;
  if (pickupCity !== destinationCity || (stopCity && stopCity !== pickupCity)) return intercityUnavailableMessage;
  return "";
}

function scheduledTimeIsFuture(value: string) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() > Date.now() + 5 * 60_000;
}

function regionForPlaces(pickup?: RidePlace | null, destination?: RidePlace | null, stop?: RidePlace | null): Region {
  const points = [pickup, stop, destination].filter(hasCoordinate);
  if (!points.length) return defaultRideRegion;
  if (points.length === 1) {
    return {
      latitude: points[0].latitude,
      longitude: points[0].longitude,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04
    };
  }
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max(0.03, (maxLat - minLat) * 1.9),
    longitudeDelta: Math.max(0.03, (maxLon - minLon) * 1.9)
  };
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

function estimateMatchesRoute(estimate: TaxiFareEstimate | null, routePreview: TaxiRoutePreview | null, selectedCategory: string) {
  if (!estimate || !routePreview) return false;
  const estimateCategory = estimate.selectedRideCategory?.id ?? selectedCategory;
  return estimateCategory === selectedCategory &&
    Math.abs(estimate.estimatedDistanceKm - routePreview.distanceKm) < 0.01 &&
    estimate.estimatedDurationMin === routePreview.durationMin;
}

function paymentCopy(paymentMethod: string) {
  if (paymentMethod === "Cash") return "Cash payment is available for supported KariGO Rides.";
  if (paymentMethod === "Wallet") return "Wallet ride payment is not available for this ride.";
  return "Card ride payment is not available for this ride.";
}

function lifecycleForTrip(trip: TaxiTrip) {
  return trip.lifecycle ?? taxiLifecycleForStatus(trip.status);
}

function captainForTrip(trip: TaxiTrip) {
  if (trip.captain) return trip.captain;
  if (!trip.driver || trip.status === "REQUESTED") return null;
  return {
    id: trip.driver.id,
    userId: trip.driver.userId,
    displayName: trip.driver.fullName,
    profilePhotoUrl: null,
    verified: trip.driver.status === "ACTIVE",
    publicRating: null,
    completedTripCount: null,
    contactAvailable: Boolean(trip.driver.phoneNumber),
    contactPhoneNumber: trip.driver.phoneNumber ?? null,
    location: trip.driver.lastKnownLatitude && trip.driver.lastKnownLongitude ? {
      latitude: trip.driver.lastKnownLatitude,
      longitude: trip.driver.lastKnownLongitude,
      lastSeenAt: trip.driver.lastSeenAt,
      freshness: trip.driver.lastSeenAt && Date.now() - new Date(trip.driver.lastSeenAt).getTime() <= 120_000 ? "fresh" as const : "stale" as const
    } : null
  };
}

function vehicleForTrip(trip: TaxiTrip) {
  if (trip.vehicle) return trip.vehicle;
  if (!trip.driver || trip.status === "REQUESTED") return null;
  return {
    make: trip.driver.vehicleMake,
    model: trip.driver.vehicleModel,
    colour: trip.driver.vehicleColour,
    registrationNumber: trip.driver.vehiclePlateNumber,
    category: trip.driver.vehicleType,
    seatCapacity: trip.driver.vehicleType === "MINI_BUS" ? 10 : trip.driver.vehicleType === "TRICYCLE" ? 3 : trip.driver.vehicleType ? 4 : null,
    photoUrl: null
  };
}

function humanVehicleValue(value?: string | null) {
  if (!value) return null;
  return value.replaceAll("_", " ").trim().toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function humanVehicleDescription(vehicle: ReturnType<typeof vehicleForTrip>) {
  return vehicle ? [vehicle.colour, vehicle.make, vehicle.model].map(humanVehicleValue).filter(Boolean).join(" ") || null : null;
}

function rideStatusCopy(trip?: TaxiTrip | null) {
  if (!trip) return "Ride request status unavailable.";
  if (trip.assignmentIncomplete) return "KariGO Operations is confirming the Ride Captain assignment.";
  return lifecycleForTrip(trip).customerCopy;
}

function rideTrackingTitle(trip?: TaxiTrip | null) {
  if (!trip) return "Ride status";
  if (trip.assignmentIncomplete) return "Confirming Ride Captain";
  return lifecycleForTrip(trip).customerTitle;
}

function rideStatusActionCopy(trip?: TaxiTrip | null) {
  if (!trip) return "";
  if (trip.status.startsWith("CANCELLED")) return trip.cancellationReason || "This ride request is closed.";
  return rideStatusCopy(trip);
}

function safeShareRideText(trip: TaxiTrip) {
  const captain = captainForTrip(trip);
  const vehicle = vehicleForTrip(trip);
  return [
    `KariGO Ride ${trip.tripReference}`,
    `Status: ${rideTrackingTitle(trip)}`,
    `Pickup: ${trip.pickupAddress}`,
    `Destination: ${trip.destinationAddress}`,
    captain ? `Captain: ${captain.displayName}` : null,
    vehicle ? `Vehicle: ${humanVehicleDescription(vehicle) || "Details pending"}` : null,
    vehicle?.registrationNumber ? `Registration: ${vehicle.registrationNumber}` : null
  ].filter(Boolean).join("\n");
}

function formatDateTime(value?: string | null) {
  if (!value) return "Pending";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Pending" : date.toLocaleString();
}

function shortAddress(value?: string | null) {
  return value?.split(",")[0]?.trim() || "Address pending";
}

function tripDate(trip: TaxiTrip) {
  const value = trip.requestedAt || trip.createdAt;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Time pending" : date.toLocaleString();
}

function activeRideRank(trip: TaxiTrip) {
  const ranks: Record<string, number> = {
    ARRIVED_DESTINATION: 6,
    STARTED: 5,
    ARRIVED_PICKUP: 4,
    ACCEPTED: 3,
    DRIVER_ASSIGNED: 2,
    REQUESTED: 1
  };
  return ranks[trip.status] ?? 0;
}

function sortActiveTrips(trips: TaxiTrip[]) {
  return [...trips].sort((a, b) => {
    const rank = activeRideRank(b) - activeRideRank(a);
    if (rank !== 0) return rank;
    return new Date(b.requestedAt || b.createdAt).getTime() - new Date(a.requestedAt || a.createdAt).getTime();
  });
}

function mergeTrip(trips: TaxiTrip[], updated: TaxiTrip) {
  const exists = trips.some((trip) => trip.id === updated.id);
  const merged = exists ? trips.map((trip) => trip.id === updated.id ? updated : trip) : [updated, ...trips];
  return [...merged].sort((a, b) => new Date(b.requestedAt || b.createdAt).getTime() - new Date(a.requestedAt || a.createdAt).getTime());
}

function placeFromTrip(trip: TaxiTrip, field: "pickup" | "destination"): RidePlace {
  const isPickup = field === "pickup";
  const latitude = coordinateFromUnknown(isPickup ? trip.pickupLatitude : trip.destinationLatitude);
  const longitude = coordinateFromUnknown(isPickup ? trip.pickupLongitude : trip.destinationLongitude);
  const address = isPickup ? trip.pickupAddress : trip.destinationAddress;
  return {
    label: isPickup ? "Pickup" : "Destination",
    address,
    latitude,
    longitude,
    providerPlaceId: latitude !== undefined && longitude !== undefined ? `${latitude.toFixed(6)},${longitude.toFixed(6)}` : null,
    source: "recent"
  };
}

function activeTripFromError(error: unknown): TaxiTrip | null {
  if (!(error instanceof KariGoApiError)) return null;
  const details = error.details as { activeTrip?: TaxiTrip } | undefined;
  return details?.activeTrip?.id ? details.activeTrip : null;
}

function newPlaceSessionToken() {
  return `kg-rides-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function newRideRequestId() {
  return `kg-ride-submit-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export default function TaxiRequest() {
  const taxiEnabled = ridesProductionEnabled();
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const insets = useSafeAreaInsets();
  const searchToken = useRef(0);
  const routeToken = useRef(0);
  const placeSessionToken = useRef(newPlaceSessionToken());
  const mapIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainMapRef = useRef<MapView | null>(null);
  const mapPickerRef = useRef<MapView | null>(null);
  const routeInputRef = useRef<TextInput | null>(null);
  const reverseGeocodeCache = useRef(new Map<string, string>());
  const mapReverseGeocodeRequest = useRef(0);
  const lastReverseGeocodedCoordinate = useRef<{ latitude: number; longitude: number } | null>(null);
  const requestInFlight = useRef(false);
  const requestAttemptId = useRef<string | null>(null);
  const pollingInFlight = useRef(false);
  const trackingRequestToken = useRef(0);
  const keyboardVisible = useRef(false);
  const panelDrag = useRef(new Animated.Value(0)).current;

  const [step, setStep] = useState<BookingStep>("HOME");
  const [panelState, setPanelState] = useState<RidePanelState>("half");
  const [pickup, setPickup] = useState<RidePlace | null>(null);
  const [destination, setDestination] = useState<RidePlace | null>(null);
  const [stop, setStop] = useState<RidePlace | null>(null);
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
  const [mapResolvingAddress, setMapResolvingAddress] = useState(false);
  const [mapAddressError, setMapAddressError] = useState("");
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
  const [autoLocationAttempted, setAutoLocationAttempted] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [entryStatus, setEntryStatus] = useState<RideEntryStatus>("checking");

  const savedPlaces = useMemo(() => addresses.map(placeFromAddress), [addresses]);
  const recentPlaces = useMemo(() => {
    const seen = new Set<string>();
    return trips
      .map((trip) => {
        const latitude = coordinateFromUnknown(trip.destinationLatitude);
        const longitude = coordinateFromUnknown(trip.destinationLongitude);
        return {
          label: trip.destinationAddress.split(",")[0] || "Recent destination",
          address: trip.destinationAddress,
          latitude,
          longitude,
          providerPlaceId: latitude !== undefined && longitude !== undefined
            ? `${latitude.toFixed(6)},${longitude.toFixed(6)}`
            : null,
          source: "recent" as const
        };
      })
      .filter((place) => {
        const key = place.providerPlaceId || place.address.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 3);
  }, [trips]);
  const routePoints = useMemo(() => decodePolyline(routePreview?.encodedPolyline), [routePreview?.encodedPolyline]);
  const categoryOptions = estimate?.rideCategories?.length ? estimate.rideCategories : categories;
  const selectedCategoryDetail = categoryOptions.find((category) => category.id === selectedCategory) ?? categoryOptions[0];
  const canCreateTrip = estimateMatchesRoute(estimate, routePreview, selectedCategory);
  const activeTrips = useMemo(() => sortActiveTrips(trips.filter((trip) => isActiveTaxiTripStatus(trip.status))), [trips]);
  const preferredActiveTrip = activeTrips[0] ?? null;
  const otherActiveTripCount = created ? activeTrips.filter((trip) => trip.id !== created.id).length : Math.max(0, activeTrips.length - 1);
  const activeRideCity = serviceAreaForPlace(pickup) ?? serviceAreaForPlace(destination);
  const rideTitle = activeRideCity ? `KariGO Rides in ${activeRideCity}` : "KariGO Rides";
  const panelHeights = {
    collapsed: 170 + Math.max(insets.bottom, 10),
    half: 390 + Math.max(insets.bottom, 10),
    expanded: 640 + Math.max(insets.bottom, 10)
  };
  const panelHeight = panelHeights[panelState];
  const panelResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dy) > 12 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderMove: Animated.event([null, { dy: panelDrag }], { useNativeDriver: false }),
    onPanResponderRelease: (_event, gesture) => {
      if (gesture.dy > 80) {
        setPanelState((state) => state === "expanded" ? "half" : "collapsed");
      } else if (gesture.dy < -80) {
        setPanelState((state) => state === "collapsed" ? "half" : "expanded");
      }
      Animated.spring(panelDrag, { toValue: 0, useNativeDriver: false }).start();
    }
  })).current;
  const panelTranslateY = panelDrag.interpolate({
    inputRange: [-120, 0, 220],
    outputRange: [-24, 0, 80],
    extrapolate: "clamp"
  });

  async function load() {
    if (!taxiEnabled) return;
    if (step !== "TRACKING") setEntryStatus("checking");
    try {
      const history = await taxiApi.trips();
      const [saved, rideCategories] = await Promise.all([
        addressesApi.list().catch(() => []),
        taxiApi.rideCategories(activeRideCity ?? rideServiceAreaLabel).catch(() => [])
      ]);
      setAddresses(saved);
      setCategories(rideCategories);
      setTrips(history);
      setCreated((current) => current ? history.find((trip) => trip.id === current.id) ?? current : current);
      const preferred = reconcileRideEntry(history);
      setEntryStatus(preferred ? "active" : "clear");
    } catch (err) {
      setEntryStatus("failed");
      setError(friendlyError(err) || "KariGO Rides could not confirm active ride status. Please retry.");
    }
  }

  useEffect(() => { void load(); }, [taxiEnabled, activeRideCity]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [taxiEnabled, activeRideCity, tripId, step]));

  useEffect(() => {
    if (!preferredActiveTrip) return;
    if (step !== "TRACKING" || created?.id !== preferredActiveTrip.id) {
      openTrip(preferredActiveTrip);
    }
  }, [preferredActiveTrip?.id, created?.id, step]);

  useEffect(() => () => {
    if (mapIdleTimer.current) clearTimeout(mapIdleTimer.current);
    mapReverseGeocodeRequest.current += 1;
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => {
      keyboardVisible.current = true;
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      keyboardVisible.current = false;
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (step !== "ROUTE") return;
    const handle = setTimeout(() => routeInputRef.current?.focus(), 120);
    return () => clearTimeout(handle);
  }, [activeField, step]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (step !== "ROUTE") return false;
      if (keyboardVisible.current) {
        Keyboard.dismiss();
        return true;
      }
      backOneStep();
      return true;
    });
    return () => subscription.remove();
  }, [step]);

  useEffect(() => {
    if (step !== "TRACKING" || !created || !isActiveTaxiTripStatus(created.status)) return;
    let appState = AppState.currentState;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    const currentStatus = created.status;
    const pollMs = Math.max(5000, lifecycleForTrip(created).pollingIntervalMs || 25_000);

    async function refreshActiveTrip() {
      if (!created || pollingInFlight.current || appState !== "active") return;
      const requestId = ++trackingRequestToken.current;
      pollingInFlight.current = true;
      try {
        const fresh = await taxiApi.trip(created.id);
        if (cancelled || requestId !== trackingRequestToken.current) return;
        setCreated(fresh);
        setTrips((current) => mergeTrip(current, fresh));
        if (fresh.status !== currentStatus) {
          setMessage(`Ride status updated: ${rideTrackingTitle(fresh)}.`);
        }
        if (isTerminalTaxiTripStatus(fresh.status) && interval) {
          clearInterval(interval);
          interval = null;
        }
      } catch {
        // Keep the current tracking state and allow manual refresh.
      } finally {
        pollingInFlight.current = false;
      }
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      appState = nextState;
      if (nextState === "active") void refreshActiveTrip();
    });
    interval = setInterval(() => void refreshActiveTrip(), pollMs);
    void refreshActiveTrip();

    return () => {
      cancelled = true;
      trackingRequestToken.current += 1;
      subscription.remove();
      if (interval) clearInterval(interval);
    };
  }, [created?.id, created?.status, step]);

  useEffect(() => {
    if (!taxiEnabled || autoLocationAttempted || pickup) return;
    setAutoLocationAttempted(true);
    void (async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          setMessage("Use current location to set pickup quickly, or set pickup manually.");
          return;
        }
        await setCurrentLocationAsPickup(false);
      } catch {
        setMessage("Set pickup manually or use current location when ready.");
      }
    })();
  }, [autoLocationAttempted, pickup, taxiEnabled]);

  useEffect(() => {
    if (step !== "ROUTE") return;
    const query = fieldText(activeField).trim();
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
            latitude: activeField === "destination" || activeField === "stop" ? pickup?.latitude ?? undefined : undefined,
            longitude: activeField === "destination" || activeField === "stop" ? pickup?.longitude ?? undefined : undefined,
            serviceArea: activeRideCity ?? rideServiceAreaLabel,
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
            source: activeField === "stop" ? "stop" as const : "search" as const
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
  }, [activeField, activeRideCity, destinationText, pickup, pickupText, step, stopText]);

  useEffect(() => {
    if (routePoints.length >= 2) {
      const handle = setTimeout(() => {
        mainMapRef.current?.fitToCoordinates(routePoints, {
          animated: true,
          edgePadding: { top: 100, right: 48, bottom: panelHeight + 28, left: 48 }
        });
      }, 150);
      return () => clearTimeout(handle);
    }
    if (pickup || destination) {
      mainMapRef.current?.animateToRegion(regionForPlaces(pickup, destination, stop), 350);
    }
  }, [destination, panelHeight, pickup, routePoints, stop]);

  function fieldText(field: PlaceField) {
    if (field === "pickup") return pickupText;
    if (field === "stop") return stopText;
    return destinationText;
  }

  function clearRouteState() {
    routeToken.current += 1;
    setEstimate(null);
    setRoutePreview(null);
    setRouteError("");
  }

  function enforceActiveRideTracking() {
    if (!preferredActiveTrip) return false;
    openTrip(preferredActiveTrip);
    setEntryStatus("active");
    return true;
  }

  function openDestinationSearch() {
    if (enforceActiveRideTracking()) return;
    setStep("ROUTE");
    setActiveField("destination");
    setPanelState("expanded");
    setMessage("");
  }

  function startScheduledSearch() {
    setScheduleForLater(true);
    openDestinationSearch();
  }

  function handleRouteTextChange(field: PlaceField, value: string) {
    const trimmed = value.trim();
    setActiveField(field);
    if (field === "pickup") {
      setPickupText(value);
      setPickup(trimmed ? { label: "Pickup", address: trimmed, source: "manual" } : null);
    } else if (field === "stop") {
      setStopText(value);
      setStop(trimmed ? { label: "Stop", address: trimmed, source: "manual" } : null);
    } else {
      setDestinationText(value);
      setDestination(trimmed ? { label: "Destination", address: trimmed, source: "manual" } : null);
    }
    clearRouteState();
  }

  function applyPlace(field: PlaceField, place: RidePlace, autoPreview = false) {
    Keyboard.dismiss();
    const resolved = { ...place, address: place.address || place.label };
    const nextPickup = field === "pickup" ? resolved : pickup;
    const nextDestination = field === "destination" ? resolved : destination;
    const nextStop = field === "stop" ? resolved : stop;

    if (field === "pickup") {
      setPickup(resolved);
      setPickupText(resolved.address);
    } else if (field === "stop") {
      setStop(resolved);
      setStopText(resolved.address);
    } else {
      setDestination(resolved);
      setDestinationText(resolved.address);
    }
    setSuggestions([]);
    setGoogleAttributionRequired(false);
    clearRouteState();

    if (field === "pickup" && !destination) {
      setActiveField("destination");
      setStep("ROUTE");
      setPanelState("expanded");
    }

    if (autoPreview && hasCoordinate(nextPickup) && hasCoordinate(nextDestination)) {
      void previewAndEstimateRoute(nextPickup, nextDestination, nextStop);
    } else if (field !== "stop") {
      setStep("ROUTE");
      setPanelState("expanded");
    }
  }

  async function selectPrediction(field: PlaceField, place: RidePlace) {
    if (!place.providerPlaceId) {
      applyPlace(field, place, true);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const detail = await taxiApi.placeDetails(place.providerPlaceId, placeSessionToken.current);
      applyPlace(field, {
        label: detail.name || place.label,
        address: detail.address,
        mainText: detail.name || place.mainText,
        secondaryText: detail.shortAddress || place.secondaryText,
        latitude: detail.latitude,
        longitude: detail.longitude,
        providerPlaceId: detail.placeId,
        distanceKm: place.distanceKm,
        source: field === "stop" ? "stop" : "search"
      }, true);
      if (field === "pickup") setActiveField("destination");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function reverseAddressCached(latitude: number, longitude: number) {
    const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const cached = reverseGeocodeCache.current.get(key);
    if (cached) return cached;
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude }).catch(() => []);
    const address = [place?.name, place?.street, place?.district, place?.city ?? place?.subregion, place?.region]
      .filter(Boolean)
      .join(", ");
    reverseGeocodeCache.current.set(key, address);
    return address;
  }

  async function setCurrentLocationAsPickup(showSuccessMessage = true) {
    setLocating(true);
    setError("");
    if (showSuccessMessage) setMessage("");
    try {
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const address = await reverseAddressCached(position.coords.latitude, position.coords.longitude);
      const current: RidePlace = {
        label: "Current location",
        address: address || "Current location",
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        providerPlaceId: `${position.coords.latitude.toFixed(6)},${position.coords.longitude.toFixed(6)}`,
        source: "current"
      };
      applyPlace("pickup", current, Boolean(destination));
      if (showSuccessMessage) setMessage("Current location set as pickup.");
    } catch {
      setMessage("Location is unavailable right now. Set pickup manually.");
    } finally {
      setLocating(false);
    }
  }

  async function useCurrentLocation() {
    setLocating(true);
    setError("");
    setMessage("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setMessage("Location permission was not granted. You can still set pickup manually.");
        return;
      }
      await setCurrentLocationAsPickup(true);
    } finally {
      setLocating(false);
    }
  }

  function resetNewBooking() {
    if (enforceActiveRideTracking()) return;
    placeSessionToken.current = newPlaceSessionToken();
    routeToken.current += 1;
    setStep("HOME");
    setPanelState("half");
    setDestination(null);
    setDestinationText("");
    setStop(null);
    setStopText("");
    setActiveField("destination");
    setSuggestions([]);
    setGoogleAttributionRequired(false);
    setEstimate(null);
    setRoutePreview(null);
    setRouteError("");
    setCreated(null);
    setDetailsExpanded(false);
    setMessage("");
    setError("");
  }

  function openTrip(trip: TaxiTrip) {
    setCreated(trip);
    setPickup(placeFromTrip(trip, "pickup"));
    setDestination(placeFromTrip(trip, "destination"));
    setStop(null);
    setRoutePreview(null);
    setEstimate(null);
    setMessage("");
    setError("");
    setStep("TRACKING");
    setPanelState("expanded");
  }

  function reconcileRideEntry(history: TaxiTrip[]) {
    const requestedTrip = tripId ? history.find((trip) => trip.id === tripId) : null;
    const active = sortActiveTrips(history.filter((trip) => isActiveTaxiTripStatus(trip.status)));
    const preferred = requestedTrip && isActiveTaxiTripStatus(requestedTrip.status)
      ? requestedTrip
      : active[0] ?? null;
    if (!preferred) return null;
    if (step !== "TRACKING" || created?.id !== preferred.id) {
      openTrip(preferred);
    }
    return preferred;
  }

  function swapRoute() {
    if (!pickup && !destination) return;
    const nextPickup = destination;
    const nextDestination = pickup;
    setPickup(nextPickup);
    setDestination(nextDestination);
    setPickupText(nextPickup?.address ?? "");
    setDestinationText(nextDestination?.address ?? "");
    clearRouteState();
    if (hasCoordinate(nextPickup) && hasCoordinate(nextDestination)) {
      void previewAndEstimateRoute(nextPickup, nextDestination, stop);
    }
  }

  function removeStop() {
    setStop(null);
    setStopText("");
    clearRouteState();
    if (hasCoordinate(pickup) && hasCoordinate(destination)) {
      void previewAndEstimateRoute(pickup, destination, null);
    }
  }

  function openMapPicker(field: PlaceField) {
    if (enforceActiveRideTracking()) return;
    Keyboard.dismiss();
    const currentPlace = field === "pickup" ? pickup : field === "stop" ? stop : destination;
    const initial = currentPlace && hasCoordinate(currentPlace) ? regionForPlaces(currentPlace) : regionForPlaces(pickup, destination, stop);
    if (mapIdleTimer.current) clearTimeout(mapIdleTimer.current);
    mapReverseGeocodeRequest.current += 1;
    lastReverseGeocodedCoordinate.current = currentPlace && hasCoordinate(currentPlace)
      ? { latitude: currentPlace.latitude, longitude: currentPlace.longitude }
      : null;
    setMapPicking(field);
    setActiveField(field);
    setMapRegion(initial);
    setMapMoving(false);
    setMapResolvingAddress(false);
    setMapAddressError("");
    setMapPoint(currentPlace ?? {
      label: field === "pickup" ? "Pickup" : field === "stop" ? "Stop" : "Destination",
      address: field === "pickup" ? pickupText || "Move pin to pickup" : field === "stop" ? stopText || "Move pin to stop" : destinationText || "Move pin to destination",
      latitude: initial.latitude,
      longitude: initial.longitude,
      source: "map"
    });
  }

  function handleMapRegionChangeComplete(region: Region) {
    if (!mapPicking) return;
    setMapMoving(false);
    setMapRegion(region);
    const nextCoordinate = { latitude: region.latitude, longitude: region.longitude };
    const previousCoordinate = mapPoint && hasCoordinate(mapPoint)
      ? { latitude: mapPoint.latitude, longitude: mapPoint.longitude }
      : lastReverseGeocodedCoordinate.current;
    const movedMeters = previousCoordinate ? distanceMeters(previousCoordinate, nextCoordinate) : Number.POSITIVE_INFINITY;
    setMapPoint((current) => ({
      label: mapPicking === "pickup" ? "Pickup pin" : mapPicking === "stop" ? "Stop pin" : "Destination pin",
      address: current?.address && current.address !== "Updating selected address..." ? current.address : "Selected map location",
      latitude: region.latitude,
      longitude: region.longitude,
      providerPlaceId: `${region.latitude.toFixed(6)},${region.longitude.toFixed(6)}`,
      source: mapPicking === "stop" ? "stop" : "map"
    }));
    if (movedMeters < mapMovementThresholdMeters) return;
    const lastResolved = lastReverseGeocodedCoordinate.current;
    if (lastResolved && distanceMeters(lastResolved, nextCoordinate) < mapMovementThresholdMeters) return;
    if (mapIdleTimer.current) clearTimeout(mapIdleTimer.current);
    const requestId = ++mapReverseGeocodeRequest.current;
    setMapResolvingAddress(true);
    setMapAddressError("");
    mapIdleTimer.current = setTimeout(() => {
      void (async () => {
        const address = await reverseAddressCached(region.latitude, region.longitude);
        if (requestId !== mapReverseGeocodeRequest.current) return;
        lastReverseGeocodedCoordinate.current = nextCoordinate;
        setMapPoint((current) => current && hasCoordinate(current) && distanceMeters(current, nextCoordinate) < mapMovementThresholdMeters
          ? { ...current, address: address || current.address || "Selected map location" }
          : current);
        if (!address) setMapAddressError("Address lookup is temporarily unavailable. You can move the map or confirm this pin.");
        setMapResolvingAddress(false);
      })();
    }, reverseGeocodeDebounceMs);
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
        latitudeDelta: 0.018,
        longitudeDelta: 0.018
      };
      setMapRegion(region);
      mapPickerRef.current?.animateToRegion(region, 350);
    } finally {
      setLocating(false);
    }
  }

  function closeMapPicker() {
    if (mapIdleTimer.current) clearTimeout(mapIdleTimer.current);
    mapReverseGeocodeRequest.current += 1;
    setMapResolvingAddress(false);
    setMapAddressError("");
    setMapMoving(false);
    setMapPicking(null);
  }

  function confirmMapPoint() {
    if (!mapPicking || !mapPoint || !hasCoordinate(mapPoint)) return;
    applyPlace(mapPicking, {
      ...mapPoint,
      address: mapPoint.address || "Selected map location",
      source: mapPicking === "stop" ? "stop" : "map"
    }, true);
    closeMapPicker();
    setPanelState("half");
  }

  async function previewAndEstimateRoute(
    nextPickup = pickup,
    nextDestination = destination,
    nextStop = stop,
    categoryId = selectedCategory
  ) {
    if (enforceActiveRideTracking()) return;
    if (!hasCoordinate(nextPickup) || !hasCoordinate(nextDestination)) {
      setRouteError("Choose pickup and destination from search results, saved places, current location or the map.");
      setStep("ROUTE");
      setPanelState("expanded");
      return;
    }
    const cityIssue = routeCityIssue(nextPickup, nextDestination, nextStop);
    if (cityIssue) {
      setRouteError(cityIssue);
      setEstimate(null);
      setRoutePreview(null);
      setStep("ROUTE");
      setPanelState("expanded");
      return;
    }

    const token = ++routeToken.current;
    setLoading(true);
    setError("");
    setRouteError("");
    setEstimate(null);
    setRoutePreview(null);
    try {
      const preview = await taxiApi.routePreview({
        pickupLatitude: nextPickup.latitude,
        pickupLongitude: nextPickup.longitude,
        destinationLatitude: nextDestination.latitude,
        destinationLongitude: nextDestination.longitude,
        pickupAddress: nextPickup.address,
        destinationAddress: nextDestination.address,
        ...(hasCoordinate(nextStop) ? {
          stopLatitude: nextStop.latitude,
          stopLongitude: nextStop.longitude,
          stopAddress: nextStop.address
        } : {}),
        serviceArea: serviceAreaForPlace(nextPickup) ?? rideServiceAreaLabel
      });
      if (token !== routeToken.current) return;
      setRoutePreview(preview);
      const nextEstimate = await taxiApi.fareEstimate({
        pickupAddress: nextPickup.address,
        destinationAddress: nextDestination.address,
        pickupLatitude: nextPickup.latitude,
        pickupLongitude: nextPickup.longitude,
        destinationLatitude: nextDestination.latitude,
        destinationLongitude: nextDestination.longitude,
        ...(hasCoordinate(nextStop) ? {
          stopAddress: nextStop.address,
          stopLatitude: nextStop.latitude,
          stopLongitude: nextStop.longitude
        } : {}),
        estimatedDistanceKm: preview.distanceKm,
        estimatedDurationMin: preview.durationMin,
        rideCategory: categoryId
      });
      if (token !== routeToken.current) return;
      setSelectedCategory(nextEstimate.selectedRideCategory?.id ?? categoryId);
      setEstimate(nextEstimate);
      setStep("CONFIRM");
      setPanelState("half");
    } catch (err) {
      if (token !== routeToken.current) return;
      setRouteError(friendlyError(err) || "Route estimate temporarily unavailable. Please retry.");
      setStep("ROUTE");
      setPanelState("expanded");
    } finally {
      if (token === routeToken.current) setLoading(false);
    }
  }

  async function estimateFare(categoryId = selectedCategory) {
    if (enforceActiveRideTracking()) return;
    if (!routePreview || !hasCoordinate(pickup) || !hasCoordinate(destination)) {
      setRouteError("Route estimate temporarily unavailable. Please retry.");
      setStep("ROUTE");
      return;
    }
    await previewAndEstimateRoute(pickup, destination, stop, categoryId);
  }

  async function createTrip() {
    if (requestInFlight.current) return;
    if (enforceActiveRideTracking()) {
      setError(duplicateActiveRideMessage);
      return;
    }
    if (!pickup || !destination || !routePreview || !estimate || !canCreateTrip) {
      setError(staleFareMessage);
      setStep("ROUTE");
      setPanelState("expanded");
      return;
    }
    if (scheduleForLater && !scheduledTimeIsFuture(scheduledPickupAt)) {
      setError("Choose a future pickup time before scheduling this ride.");
      setStep("DETAILS");
      setPanelState("expanded");
      return;
    }
    requestInFlight.current = true;
    requestAttemptId.current = requestAttemptId.current ?? newRideRequestId();
    setLoading(true);
    setError("");
    try {
      const trip = await taxiApi.createTrip({
        pickupAddress: pickup.address,
        destinationAddress: destination.address,
        pickupLatitude: pickup.latitude ?? undefined,
        pickupLongitude: pickup.longitude ?? undefined,
        destinationLatitude: destination.latitude ?? undefined,
        destinationLongitude: destination.longitude ?? undefined,
        ...(hasCoordinate(stop) ? {
          stopAddress: stop.address,
          stopLatitude: stop.latitude,
          stopLongitude: stop.longitude
        } : {}),
        estimatedDistanceKm: routePreview.distanceKm,
        estimatedDurationMin: routePreview.durationMin,
        rideCategory: selectedCategory,
        paymentMethod,
        scheduledPickupAt: scheduleForLater ? scheduledPickupAt : undefined,
        pickupInstruction,
        customerNote: tripNote,
        clientRequestId: requestAttemptId.current
      });
      setCreated(trip);
      setTrips((current) => mergeTrip(current, trip));
      setMessage("Ride request received. KariGO will keep this screen updated.");
      setStep("TRACKING");
      setPanelState("expanded");
      requestAttemptId.current = null;
      await load();
    } catch (err) {
      const activeTrip = activeTripFromError(err);
      if (activeTrip) {
        setTrips((current) => mergeTrip(current, activeTrip));
        openTrip(activeTrip);
        setError(duplicateActiveRideMessage);
        requestAttemptId.current = null;
        return;
      }
      setError(friendlyError(err));
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  }

  async function cancelTrip(tripId: string) {
    setLoading(true);
    setError("");
    try {
      const updated = await taxiApi.cancelTrip(tripId, "Customer cancelled ride before pickup");
      setTrips((current) => mergeTrip(current, updated));
      setCreated((current) => current?.id === updated.id ? updated : current);
      setMessage("Ride request cancelled.");
      await load();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  function backOneStep() {
    if (enforceActiveRideTracking()) return;
    if (step === "ROUTE") setStep("HOME");
    else if (step === "DETAILS") setStep("CONFIRM");
    else if (step === "CONFIRM") setStep("ROUTE");
    else setStep("HOME");
    setPanelState(step === "HOME" ? "half" : "expanded");
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

  const activeRidePendingTracking = Boolean(preferredActiveTrip && (step !== "TRACKING" || created?.id !== preferredActiveTrip.id));

  if ((entryStatus === "checking" || activeRidePendingTracking) && step !== "TRACKING") {
    return <Protected><Loading label="Checking active KariGO Rides..." /></Protected>;
  }

  if (entryStatus === "failed" && step !== "TRACKING") {
    return <Protected><Screen title="KariGO Rides">
      <Card>
        <Text style={ui.cardTitle}>KariGO Rides could not confirm active ride status</Text>
        <Text style={ui.pageIntro}>Please retry before opening the booking screen so we do not create a duplicate ride request.</Text>
      </Card>
      <Message error>{error}</Message>
      <Button title="Retry active ride check" onPress={() => void load()} />
      <Button title="Back to KariGO Home" tone="muted" onPress={() => router.replace("/tabs/home")} />
    </Screen></Protected>;
  }

  if (mapPicking) {
    const region = mapRegion ?? (mapPoint && hasCoordinate(mapPoint)
      ? { latitude: mapPoint.latitude, longitude: mapPoint.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }
      : regionForPlaces(pickup, destination, stop));
    const title = mapPicking === "pickup" ? "Choose pickup on map" : mapPicking === "stop" ? "Choose stop on map" : "Choose destination on map";

    return <Protected><>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.fullScreenMap}>
        <MapView
          ref={mapPickerRef}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
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
          <Text style={styles.mapTitle}>{title}</Text>
          <Text style={ui.muted}>{mapMoving ? "Move the map until the pin is on the right spot." : mapResolvingAddress ? "Updating selected address..." : mapPoint?.address ?? "Move the map to place the center pin."}</Text>
          {mapAddressError ? <Text style={ui.muted}>{mapAddressError}</Text> : null}
          {message ? <Text style={ui.muted}>{message}</Text> : null}
          <View style={styles.inlineActions}>
            <Button title="Cancel" tone="muted" onPress={closeMapPicker} />
            <Button title={loading || mapResolvingAddress ? "Confirming..." : "Confirm location"} disabled={loading || mapResolvingAddress || !mapPoint} onPress={confirmMapPoint} />
          </View>
        </View>
      </View>
    </></Protected>;
  }

  if (step === "TRACKING") {
    return <Protected><>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.fullScreenMap}>
        <MapView
          key={created?.id ?? "ride-tracking"}
          style={StyleSheet.absoluteFill}
          initialRegion={regionForPlaces(pickup, destination)}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {hasCoordinate(pickup) ? <Marker coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }} title="Pickup" description={pickup.address} /> : null}
          {hasCoordinate(destination) ? <Marker coordinate={{ latitude: destination.latitude, longitude: destination.longitude }} title="Destination" description={destination.address} pinColor={brand.colors.primary} /> : null}
          {routePoints.length >= 2 ? <Polyline coordinates={routePoints} strokeColor={brand.colors.primary} strokeWidth={5} /> : null}
        </MapView>
        <View style={[styles.mapTopBar, { paddingTop: Math.max(insets.top, 18) }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Return to KariGO home" onPress={() => router.replace("/tabs/home")} style={styles.roundButton}>
            <Text style={styles.roundButtonText}>Home</Text>
          </Pressable>
          <View style={styles.mapTitleCard}>
            <Text style={styles.mapEyebrow}>KariGO Ride</Text>
            <Text style={styles.mapScreenTitle}>{rideTrackingTitle(created)}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close and return to KariGO home" onPress={() => router.replace("/tabs/home")} style={styles.roundButton}>
            <Text style={styles.roundButtonText}>Close</Text>
          </Pressable>
        </View>
        <View style={[styles.trackingSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
            <Message error>{error}</Message>
            <Message>{message}</Message>
            {created ? <RideTracking
              trip={created}
              loading={loading}
              onCancel={() => void cancelTrip(created.id)}
              onRefresh={() => void load()}
              onBookAnother={resetNewBooking}
              onBackHome={() => router.replace("/tabs/home")}
              onViewAllRides={() => router.push("/orders?tab=rides" as never)}
              otherActiveCount={otherActiveTripCount}
            /> : null}
          </ScrollView>
        </View>
      </View>
    </></Protected>;
  }

  return <Protected><>
    <Stack.Screen options={{ headerShown: false }} />
    <View style={styles.fullScreenMap}>
      <MapView
        ref={mainMapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={regionForPlaces(pickup, destination, stop)}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {hasCoordinate(pickup) ? <Marker coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }} title="Pickup" description={pickup.address} /> : null}
        {hasCoordinate(stop) ? <Marker coordinate={{ latitude: stop.latitude, longitude: stop.longitude }} title="Stop" description={stop.address} pinColor={brand.colors.warning} /> : null}
        {hasCoordinate(destination) ? <Marker coordinate={{ latitude: destination.latitude, longitude: destination.longitude }} title="Destination" description={destination.address} pinColor={brand.colors.primary} /> : null}
        {routePoints.length >= 2 ? <Polyline coordinates={routePoints} strokeColor={brand.colors.primary} strokeWidth={5} /> : null}
      </MapView>

      <View style={[styles.mapTopBar, { paddingTop: Math.max(insets.top, 18) }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close KariGO Rides" onPress={() => router.replace("/tabs/home")} style={styles.roundButton}>
          <Text style={styles.roundButtonText}>Close</Text>
        </Pressable>
        <View style={styles.mapTitleCard}>
          <Text style={styles.mapEyebrow}>KariGO</Text>
          <Text style={styles.mapScreenTitle}>{rideTitle}</Text>
        </View>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Use current location as pickup" onPress={() => void useCurrentLocation()} style={[styles.currentLocationFab, { bottom: panelHeight + 18 }]}>
        <Text style={styles.currentLocationFabText}>{locating ? "..." : "GPS"}</Text>
      </Pressable>

      <Animated.View style={[styles.bottomSheet, { height: panelHeight, transform: [{ translateY: panelTranslateY }] }]}>
        <View {...panelResponder.panHandlers} style={styles.sheetHandleWrap}>
          <View style={styles.sheetHandle} />
        </View>
        {step === "CONFIRM" ? <View style={styles.sheetStatic}>
          <Message error>{error}</Message>
          <Message>{message}</Message>
          {routeError ? <Message error>{routeError}</Message> : null}
          <RideOptionsPanel
            pickup={pickup}
            destination={destination}
            stop={stop}
            routePreview={routePreview}
            categoryOptions={categoryOptions}
            selectedCategory={selectedCategory}
            selectedCategoryDetail={selectedCategoryDetail}
            loading={loading}
            canContinue={canCreateTrip}
            scheduleForLater={scheduleForLater}
            scheduledPickupAt={scheduledPickupAt}
            bottomInset={insets.bottom}
            onBack={() => { setStep("ROUTE"); setPanelState("expanded"); }}
            onCategory={(categoryId) => void estimateFare(categoryId)}
            onContinue={() => { setStep("DETAILS"); setPanelState("expanded"); }}
          />
        </View> : step === "DETAILS" ? <View style={styles.sheetStatic}>
          <Message error>{error}</Message>
          <Message>{message}</Message>
          {routeError ? <Message error>{routeError}</Message> : null}
          <RideBookingDetails
            selectedCategory={selectedCategoryDetail}
            estimate={estimate}
            paymentMethod={paymentMethod}
            scheduleForLater={scheduleForLater}
            scheduledPickupAt={scheduledPickupAt}
            pickupInstruction={pickupInstruction}
            tripNote={tripNote}
            detailsExpanded={detailsExpanded}
            loading={loading}
            canCreateTrip={canCreateTrip}
            activeTripCount={activeTrips.length}
            bottomInset={insets.bottom}
            onPaymentMethod={setPaymentMethod}
            onScheduleToggle={() => setScheduleForLater((value) => !value)}
            onScheduledPickupAt={setScheduledPickupAt}
            onPickupInstruction={setPickupInstruction}
            onTripNote={setTripNote}
            onDetailsExpanded={() => setDetailsExpanded((value) => !value)}
            onRequest={() => void createTrip()}
          />
        </View> : <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.sheetScroll, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Message error>{error}</Message>
          <Message>{message}</Message>
          {routeError ? <Message error>{routeError}</Message> : null}
          {step === "HOME" ? <RideHomePanel
            rideTitle={rideTitle}
            pickup={pickup}
            locating={locating}
            recentPlaces={recentPlaces}
            savedPlaces={savedPlaces}
            onWhereTo={openDestinationSearch}
            onLater={startScheduledSearch}
            onUseCurrentLocation={() => void useCurrentLocation()}
            onEditPickup={() => { if (enforceActiveRideTracking()) return; setStep("ROUTE"); setActiveField("pickup"); setPanelState("expanded"); }}
            onSelectDestination={(place) => applyPlace("destination", place, true)}
            onCollapse={() => setPanelState((state) => state === "collapsed" ? "half" : "collapsed")}
          /> : null}
          {step === "ROUTE" ? <RideRoutePanel
            activeField={activeField}
            pickup={pickup}
            destination={destination}
            stop={stop}
            pickupText={pickupText}
            destinationText={destinationText}
            stopText={stopText}
            searching={searching}
            suggestions={suggestions}
            googleAttributionRequired={googleAttributionRequired}
            loading={loading}
            recentPlaces={recentPlaces}
            savedPlaces={savedPlaces}
            onFieldFocus={setActiveField}
            onFieldChange={handleRouteTextChange}
            onSelectSuggestion={(place) => void selectPrediction(activeField, place)}
            onSelectPlace={(place) => applyPlace(activeField, place, true)}
            onSwap={swapRoute}
            onAddStop={() => { if (enforceActiveRideTracking()) return; setActiveField("stop"); setStep("ROUTE"); setPanelState("expanded"); }}
            onRemoveStop={removeStop}
            onMapPick={openMapPicker}
            onUseCurrentLocation={() => void useCurrentLocation()}
            onRetry={() => void previewAndEstimateRoute()}
            inputRef={routeInputRef}
          /> : null}
        </ScrollView>}
      </Animated.View>
    </View>
  </></Protected>;
}

function BookingHeader({ title, onBack, onClose }: { title: string; onBack: () => void; onClose: () => void }) {
  return <View style={styles.bookingHeader}>
    <Pressable accessibilityRole="button" onPress={onBack} style={styles.headerButton}><Text style={styles.headerButtonText}>Back</Text></Pressable>
    <Text style={styles.headerTitle}>{title}</Text>
    <Pressable accessibilityRole="button" onPress={onClose} style={styles.headerButton}><Text style={styles.headerButtonText}>Close</Text></Pressable>
  </View>;
}

function RideHomePanel({
  rideTitle,
  pickup,
  locating,
  recentPlaces,
  savedPlaces,
  onWhereTo,
  onLater,
  onUseCurrentLocation,
  onEditPickup,
  onSelectDestination,
  onCollapse
}: {
  rideTitle: string;
  pickup: RidePlace | null;
  locating: boolean;
  recentPlaces: RidePlace[];
  savedPlaces: RidePlace[];
  onWhereTo: () => void;
  onLater: () => void;
  onUseCurrentLocation: () => void;
  onEditPickup: () => void;
  onSelectDestination: (place: RidePlace) => void;
  onCollapse: () => void;
}) {
  return <>
    <View style={styles.sheetHeader}>
      <View>
        <Text style={styles.sheetEyebrow}>Ride with KariGO</Text>
        <Text style={styles.sheetTitle}>{rideTitle}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Collapse ride panel" onPress={onCollapse} style={styles.smallPill}>
        <Text style={styles.smallPillText}>Map</Text>
      </Pressable>
    </View>
    <View style={styles.searchRow}>
      <Pressable accessibilityRole="button" accessibilityLabel="Where to?" onPress={onWhereTo} style={styles.whereToControl}>
        <Text style={styles.whereToText}>Where to?</Text>
        <Text style={styles.whereToHint}>Search destination</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Schedule ride for later" onPress={onLater} style={styles.laterButton}>
        <Text style={styles.laterText}>Later</Text>
      </Pressable>
    </View>
    <Pressable accessibilityRole="button" onPress={pickup ? onEditPickup : onUseCurrentLocation} style={styles.currentPickupRow}>
      <View style={[styles.routeMarker, styles.pickupMarker]} />
      <View style={styles.placeBody}>
        <Text style={styles.placeTitle}>{pickup ? "Current location" : locating ? "Detecting pickup..." : "Set pickup"}</Text>
        <Text style={ui.muted} numberOfLines={1}>{pickup?.address ?? "Use current location or choose pickup manually."}</Text>
      </View>
    </Pressable>
    <CompactPlaceSection title="Recent destinations" places={recentPlaces} onSelect={onSelectDestination} />
    <CompactPlaceSection title="Saved places" places={savedPlaces.slice(0, 3)} onSelect={onSelectDestination} />
  </>;
}

function RideRoutePanel({
  activeField,
  pickup,
  destination,
  stop,
  pickupText,
  destinationText,
  stopText,
  searching,
  suggestions,
  googleAttributionRequired,
  loading,
  recentPlaces,
  savedPlaces,
  onFieldFocus,
  onFieldChange,
  onSelectSuggestion,
  onSelectPlace,
  onSwap,
  onAddStop,
  onRemoveStop,
  onMapPick,
  onUseCurrentLocation,
  onRetry,
  inputRef
}: {
  activeField: PlaceField;
  pickup: RidePlace | null;
  destination: RidePlace | null;
  stop: RidePlace | null;
  pickupText: string;
  destinationText: string;
  stopText: string;
  searching: boolean;
  suggestions: RidePlace[];
  googleAttributionRequired: boolean;
  loading: boolean;
  recentPlaces: RidePlace[];
  savedPlaces: RidePlace[];
  onFieldFocus: (field: PlaceField) => void;
  onFieldChange: (field: PlaceField, value: string) => void;
  onSelectSuggestion: (place: RidePlace) => void;
  onSelectPlace: (place: RidePlace) => void;
  onSwap: () => void;
  onAddStop: () => void;
  onRemoveStop: () => void;
  onMapPick: (field: PlaceField) => void;
  onUseCurrentLocation: () => void;
  onRetry: () => void;
  inputRef: RefObject<TextInput | null>;
}) {
  const showRouteTools = Boolean(pickup || destination);
  const mapLabel = activeField === "pickup" ? "Pickup on map" : activeField === "stop" ? "Stop on map" : "Destination on map";

  return <>
    <View style={styles.sheetHeader}>
      <View>
        <Text style={styles.sheetEyebrow}>Plan route</Text>
        <Text style={styles.sheetTitle}>Choose destination</Text>
      </View>
      {showRouteTools ? <Pressable accessibilityRole="button" onPress={onSwap} style={styles.smallPill}>
        <Text style={styles.smallPillText}>Swap</Text>
      </Pressable> : null}
    </View>
    <View style={styles.routeComposer}>
      <RouteComposerRow label="Pickup" active={activeField === "pickup"} value={pickup?.address || pickupText} inputValue={pickupText} placeholder="Current location or pickup address" onPress={() => onFieldFocus("pickup")} onChangeText={(value) => onFieldChange("pickup", value)} inputRef={activeField === "pickup" ? inputRef : undefined} marker="pickup" />
      {stop ? <RouteComposerRow label="Stop" active={activeField === "stop"} value={stop.address || stopText} inputValue={stopText} placeholder="Selected stop" onPress={() => onFieldFocus("stop")} onChangeText={(value) => onFieldChange("stop", value)} inputRef={activeField === "stop" ? inputRef : undefined} marker="stop" onRemove={onRemoveStop} /> : null}
      <RouteComposerRow label="Destination" active={activeField === "destination"} value={destination?.address || destinationText} inputValue={destinationText} placeholder="Where to?" onPress={() => onFieldFocus("destination")} onChangeText={(value) => onFieldChange("destination", value)} inputRef={activeField === "destination" ? inputRef : undefined} marker="destination" />
    </View>
    <SuggestionList
      activeField={activeField}
      places={suggestions}
      searching={searching}
      googleAttributionRequired={googleAttributionRequired}
      onSelect={onSelectSuggestion}
    />
    <View style={styles.inlineActions}>
      {activeField === "pickup" ? <Button title="Use current location as pickup" tone="muted" onPress={onUseCurrentLocation} /> : null}
      <Button title={mapLabel} tone="muted" onPress={() => onMapPick(activeField)} />
      {hasCoordinate(pickup) && hasCoordinate(destination) && !stop ? <Button title="Add stop" tone="muted" onPress={onAddStop} /> : null}
      {hasCoordinate(pickup) && hasCoordinate(destination) ? <Button title={loading ? "Retrying..." : "Retry route"} tone="muted" disabled={loading} onPress={onRetry} /> : null}
    </View>
    <CompactPlaceSection title={activeField === "pickup" ? "Saved places" : "Recent destinations"} places={activeField === "pickup" ? savedPlaces.slice(0, 3) : recentPlaces} onSelect={onSelectPlace} />
    {activeField !== "pickup" ? <CompactPlaceSection title="Saved places" places={savedPlaces.slice(0, 3)} onSelect={onSelectPlace} /> : null}
  </>;
}

function RouteComposerRow({
  label,
  value,
  inputValue,
  placeholder,
  marker,
  active,
  onPress,
  onChangeText,
  inputRef,
  onRemove
}: {
  label: string;
  value?: string;
  inputValue?: string;
  placeholder: string;
  marker: "pickup" | "stop" | "destination";
  active: boolean;
  onPress: () => void;
  onChangeText?: (value: string) => void;
  inputRef?: RefObject<TextInput | null>;
  onRemove?: () => void;
}) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.routeComposerRow, active && styles.routeComposerRowActive]}>
    <View style={[styles.routeMarker, marker === "pickup" && styles.pickupMarker, marker === "stop" && styles.stopMarker]} />
    <View style={styles.routeText}>
      <Text style={styles.routeLabel}>{label}</Text>
      {active && onChangeText ? <TextInput
        ref={inputRef}
        accessibilityLabel={`${label} search input`}
        placeholder={placeholder}
        placeholderTextColor={brand.colors.muted}
        value={inputValue ?? ""}
        onChangeText={onChangeText}
        returnKeyType="search"
        style={styles.routeInput}
      /> : <Text style={[styles.routeValue, !value && styles.routePlaceholder]} numberOfLines={1}>{value || placeholder}</Text>}
    </View>
    {onRemove ? <Pressable accessibilityRole="button" accessibilityLabel="Remove stop" onPress={onRemove} style={styles.removeStopButton}>
      <Text style={styles.removeStopText}>Remove</Text>
    </Pressable> : null}
  </Pressable>;
}

function RideOptionsPanel({
  pickup,
  destination,
  stop,
  routePreview,
  categoryOptions,
  selectedCategory,
  selectedCategoryDetail,
  loading,
  canContinue,
  scheduleForLater,
  scheduledPickupAt,
  bottomInset,
  onBack,
  onCategory,
  onContinue
}: {
  pickup: RidePlace | null;
  destination: RidePlace | null;
  stop: RidePlace | null;
  routePreview: TaxiRoutePreview | null;
  categoryOptions: TaxiRideCategory[];
  selectedCategory: string;
  selectedCategoryDetail?: TaxiRideCategory;
  loading: boolean;
  canContinue: boolean;
  scheduleForLater: boolean;
  scheduledPickupAt: string;
  bottomInset: number;
  onBack: () => void;
  onCategory: (categoryId: string) => void;
  onContinue: () => void;
}) {
  const continueLabel = selectedCategoryDetail
    ? `Continue - ${selectedCategoryDetail.name.replace("KariGO ", "")} ${fareRange(selectedCategoryDetail.fareRangeKobo)}`
    : "Continue";
  return <View style={styles.stickyPanel}>
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.stickyScrollContent, { paddingBottom: 118 + Math.max(bottomInset, 12) }]}>
      <View style={styles.sheetHeader}>
        <View>
          <Text style={styles.sheetEyebrow}>Route ready</Text>
          <Text style={styles.sheetTitle}>Choose your ride</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.smallPill}>
          <Text style={styles.smallPillText}>Edit</Text>
        </Pressable>
      </View>
      <View style={styles.routePanel}>
        <RoutePoint label="Pickup" value={pickup?.address ?? "Pickup pending"} tone="pickup" />
        {stop ? <RoutePoint label="Stop" value={stop.address} tone="stop" /> : null}
        <RoutePoint label="Destination" value={destination?.address ?? "Destination pending"} tone="destination" />
      </View>
      <View style={styles.metrics}>
        <Metric label="Distance" value={routePreview?.distanceKm ? `${routePreview.distanceKm} km` : "Pending"} />
        <Metric label="Duration" value={routePreview?.durationMin ? `${routePreview.durationMin} min` : "Pending"} />
      </View>
      {scheduleForLater ? <Text style={styles.scheduleNote}>Scheduled ride: {scheduledPickupAt || "Set pickup time before request."}</Text> : null}
      {categoryOptions.length === 0 ? <Empty message="No ride category is available in this area yet." /> : categoryOptions.map((category) => (
        <RideCategoryCard key={category.id} category={category} selected={selectedCategory === category.id} onPress={() => onCategory(category.id)} />
      ))}
    </ScrollView>
    <View style={[styles.stickyActionFooter, { paddingBottom: Math.max(bottomInset, 12) }]}>
      {selectedCategoryDetail ? <Text style={styles.stickyActionSummary} numberOfLines={1}>{selectedCategoryDetail.name} - {fareRange(selectedCategoryDetail.fareRangeKobo)}</Text> : null}
      <Button title={loading ? "Updating fare..." : continueLabel} disabled={loading || !canContinue} onPress={onContinue} />
      {!canContinue ? <Text style={styles.stickyActionHint}>Refresh the route and fare if pickup, destination or ride category changed.</Text> : null}
    </View>
  </View>;
}

function RideCategoryCard({ category, selected, onPress }: { category: TaxiRideCategory; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.categoryCard, selected && styles.categoryCardActive]}>
    <View style={styles.categoryIcon}><Text style={styles.categoryIconText}>{category.name.replace("KariGO ", "").slice(0, 2).toUpperCase()}</Text></View>
    <View style={styles.categoryBody}>
      <Text style={styles.categoryTitle}>{category.name}</Text>
      <Text style={styles.categoryMeta}>{category.arrivalEstimateMinutes} min arrival - Up to {category.passengerCapacity} passengers</Text>
      <Text style={styles.categoryDescription} numberOfLines={1}>{category.description}</Text>
    </View>
    <Text style={styles.categoryFare} numberOfLines={1}>{fareRange(category.fareRangeKobo)}</Text>
  </Pressable>;
}

function RideBookingDetails({
  selectedCategory,
  estimate,
  paymentMethod,
  scheduleForLater,
  scheduledPickupAt,
  pickupInstruction,
  tripNote,
  detailsExpanded,
  loading,
  canCreateTrip,
  activeTripCount,
  bottomInset,
  onPaymentMethod,
  onScheduleToggle,
  onScheduledPickupAt,
  onPickupInstruction,
  onTripNote,
  onDetailsExpanded,
  onRequest
}: {
  selectedCategory?: TaxiRideCategory;
  estimate: TaxiFareEstimate | null;
  paymentMethod: string;
  scheduleForLater: boolean;
  scheduledPickupAt: string;
  pickupInstruction: string;
  tripNote: string;
  detailsExpanded: boolean;
  loading: boolean;
  canCreateTrip: boolean;
  activeTripCount: number;
  bottomInset: number;
  onPaymentMethod: (method: string) => void;
  onScheduleToggle: () => void;
  onScheduledPickupAt: (value: string) => void;
  onPickupInstruction: (value: string) => void;
  onTripNote: (value: string) => void;
  onDetailsExpanded: () => void;
  onRequest: () => void;
}) {
  const requestDisabled = loading || !canCreateTrip || activeTripCount > 0;
  return <View style={styles.stickyPanel}>
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.stickyScrollContent, { paddingBottom: 126 + Math.max(bottomInset, 12) }]}>
      <View style={styles.sheetHeader}>
        <View>
          <Text style={styles.sheetEyebrow}>Confirm request</Text>
          <Text style={styles.sheetTitle}>{selectedCategory?.name ?? "Selected ride"}</Text>
        </View>
        <Text style={styles.finalFare}>{formatRideFareKobo(estimate?.estimatedFareKobo)}</Text>
      </View>
      {activeTripCount > 0 ? <View style={styles.activeNotice}>
        <Text style={styles.activeNoticeTitle}>{activeTripCount === 1 ? "Active ride already open" : `${activeTripCount} active ride requests`}</Text>
        <Text style={styles.activeNoticeText}>View or cancel the active request before submitting another immediate KariGO Ride.</Text>
      </View> : null}
      <View style={styles.paymentGrid}>
        {["Cash", "Wallet", "Card"].map((option) => (
          <Pressable key={option} accessibilityRole="button" disabled={option !== "Cash"} onPress={() => onPaymentMethod(option)} style={[styles.paymentOption, paymentMethod === option && styles.paymentOptionActive, option !== "Cash" && styles.paymentOptionDisabled]}>
            <Text style={styles.paymentTitle}>{option}</Text>
            <Text style={styles.paymentSubtitle}>{option === "Cash" ? "Available" : "Unavailable"}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={ui.muted}>{paymentCopy(paymentMethod)}</Text>
      <Button title={scheduleForLater ? "Use immediate ride" : "Schedule for later"} tone="muted" onPress={onScheduleToggle} />
      {scheduleForLater ? <Field placeholder="Pickup time, e.g. 2026-08-01T18:30:00" value={scheduledPickupAt} onChangeText={onScheduledPickupAt} /> : null}
      <Pressable accessibilityRole="button" onPress={onDetailsExpanded} style={styles.detailsToggle}>
        <Text style={styles.detailsToggleText}>{detailsExpanded ? "Hide ride details" : "Add ride details"}</Text>
      </Pressable>
      {detailsExpanded ? <>
        <Field placeholder="Pickup instruction optional" value={pickupInstruction} onChangeText={onPickupInstruction} />
        <Field placeholder="Trip note optional" value={tripNote} onChangeText={onTripNote} multiline />
      </> : null}
    </ScrollView>
    <View style={[styles.stickyActionFooter, { paddingBottom: Math.max(bottomInset, 12) }]}>
      <Text style={styles.stickyActionSummary} numberOfLines={1}>{selectedCategory?.name ?? "KariGO Ride"} - {formatRideFareKobo(estimate?.estimatedFareKobo)}</Text>
      <Button title={loading ? "Requesting..." : scheduleForLater ? `Schedule ${selectedCategory?.name ?? "ride"}` : `Request ${selectedCategory?.name ?? "ride"}`} disabled={requestDisabled} onPress={onRequest} />
      {!canCreateTrip ? <Text style={styles.stickyActionHint}>Refresh the route and fare if pickup, destination or ride category changed.</Text> : null}
      {activeTripCount > 0 ? <Text style={styles.stickyActionHint}>Active request must be completed or cancelled first.</Text> : null}
    </View>
  </View>;
}

function SuggestionList({ activeField, places, searching, googleAttributionRequired, onSelect }: { activeField: PlaceField; places: RidePlace[]; searching: boolean; googleAttributionRequired: boolean; onSelect: (place: RidePlace) => void }) {
  if (searching) return <Text style={ui.muted}>Searching {activeField} suggestions...</Text>;
  if (!places.length) return null;
  return <View style={styles.suggestionBox}>
    {places.map((place) => <Pressable key={`${place.providerPlaceId}-${place.label}`} accessibilityRole="button" onPress={() => onSelect(place)} style={styles.suggestionRow}>
      <View style={styles.placeDot}><Text style={styles.placeDotText}>{activeField === "pickup" ? "P" : activeField === "stop" ? "S" : "D"}</Text></View>
      <View style={styles.placeBody}>
        <Text style={styles.placeTitle}>{place.label}</Text>
        <Text style={ui.muted}>{place.secondaryText || place.address}{place.distanceKm ? ` - ${place.distanceKm} km away` : ""}</Text>
      </View>
    </Pressable>)}
    {googleAttributionRequired ? <Text style={styles.googleAttribution}>Powered by Google</Text> : null}
  </View>;
}

function CompactPlaceSection({ title, places, onSelect }: { title: string; places: RidePlace[]; onSelect: (place: RidePlace) => void }) {
  if (!places.length) return null;
  return <View style={styles.compactSection}>
    <Text style={styles.compactSectionTitle}>{title}</Text>
    {places.map((place) => <Pressable key={`${place.source}-${place.providerPlaceId ?? place.address}`} accessibilityRole="button" onPress={() => onSelect(place)} style={styles.placeRow}>
      <View style={styles.placeDot}><Text style={styles.placeDotText}>{place.label.slice(0, 1).toUpperCase()}</Text></View>
      <View style={styles.placeBody}>
        <Text style={styles.placeTitle} numberOfLines={1}>{place.label}</Text>
        <Text style={ui.muted} numberOfLines={1}>{place.address}</Text>
      </View>
    </Pressable>)}
  </View>;
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

function tripCategoryLabel(trip: TaxiTrip) {
  const match = /Ride category:\s*([A-Z_]+)/i.exec(trip.customerNote ?? "");
  if (!match?.[1]) return "KariGO Ride";
  const label = match[1].toUpperCase().replaceAll("_", " ");
  return `KariGO ${label.charAt(0)}${label.slice(1).toLowerCase()}`;
}

function RideTracking({
  trip,
  loading,
  onCancel,
  onRefresh,
  onBookAnother,
  onBackHome,
  onViewAllRides,
  otherActiveCount
}: {
  trip: TaxiTrip;
  loading: boolean;
  onCancel: () => void;
  onRefresh: () => void;
  onBookAnother: () => void;
  onBackHome: () => void;
  onViewAllRides: () => void;
  otherActiveCount: number;
}) {
  const lifecycle = lifecycleForTrip(trip);
  const terminal = isTerminalTaxiTripStatus(trip.status);
  const captain = lifecycle.captainVisible ? captainForTrip(trip) : null;
  const vehicle = lifecycle.vehicleVisible ? vehicleForTrip(trip) : null;
  const showPin = Boolean(trip.tripPin && lifecycle.pickupPinVisible && captain);
  const canContactCaptain = Boolean(captain && !terminal);
  const canChatCaptain = Boolean(captain);
  const showReceipt = lifecycle.receiptAvailable || terminal;
  const shareRide = () => void Share.share({ message: safeShareRideText(trip) });
  const chatCaptain = () => router.push(`/taxi/chat/${trip.id}` as never);
  const callInKariGO = async () => {
    try {
      const readiness = await taxiApi.callSession(trip.id);
      Alert.alert("Call in KariGO", readiness.reason);
    } catch (cause) {
      Alert.alert("Call unavailable", friendlyError(cause));
    }
  };
  const callByPhone = async () => {
    try {
      const options = await taxiApi.contactOptions(trip.id);
      if (!options.phoneFallbackAvailable || !options.phoneNumber) throw new Error("Phone fallback is not available for this Ride.");
      await Linking.openURL(`tel:${options.phoneNumber}`);
    } catch (cause) {
      Alert.alert("Call unavailable", friendlyError(cause));
    }
  };
  const openContact = () => {
    Alert.alert("Contact Captain", "Choose a Ride-scoped contact option.", [
      { text: "Chat in KariGO", onPress: chatCaptain },
      { text: "Call in KariGO", onPress: () => void callInKariGO() },
      { text: "Call by phone", onPress: () => void callByPhone() },
      { text: "Close", style: "cancel" }
    ]);
  };
  return <Card>
    <Text style={ui.cardTitle}>{rideTrackingTitle(trip)}</Text>
    <Text style={ui.muted}>{rideStatusActionCopy(trip)}</Text>
    <View style={styles.trackingMeta}>
      <Text style={styles.tripRef}>{trip.tripReference}</Text>
      <StatusBadge status={trip.status} />
    </View>
    {trip.assignmentIncomplete ? <View style={styles.activeNotice}>
      <Text style={styles.activeNoticeTitle}>Captain assignment incomplete</Text>
      <Text style={styles.activeNoticeText}>KariGO Operations is confirming the assigned Captain before details are shown.</Text>
    </View> : null}
    <View style={styles.routePanel}>
      <RoutePoint label="Pickup" value={trip.pickupAddress} tone="pickup" />
      <RoutePoint label="Destination" value={trip.destinationAddress} tone="destination" />
    </View>
    <View style={styles.metrics}>
      <Metric label="Ride" value={tripCategoryLabel(trip)} />
      <Metric label={trip.status === "COMPLETED" ? "Fare" : "Estimate"} value={formatRideFareKobo(trip.finalFareKobo ?? trip.estimatedFareKobo)} />
    </View>
    {trip.status === "ARRIVED_PICKUP" && trip.waitingSummary ? <View style={styles.activeNotice}>
      <Text style={styles.activeNoticeTitle}>{trip.waitingSummary.state === "FREE"
        ? `Free pickup wait · ${Math.ceil(trip.waitingSummary.freeWaitingRemainingSeconds / 60)} min remaining`
        : `Paid pickup wait · ${formatRideFareKobo(trip.waitingSummary.waitingChargeKobo)}`}</Text>
      <Text style={styles.activeNoticeText}>The first 5 minutes are free. After that, waiting is billed at ₦5 per minute, proportional to elapsed seconds.</Text>
    </View> : null}
    {captain || vehicle ? <CaptainVehicleCard captain={captain} vehicle={vehicle} status={trip.status} /> : null}
    {captain && ["DRIVER_ASSIGNED", "ACCEPTED"].includes(trip.status) ? <Text style={ui.muted}>
      {captain.location?.freshness === "fresh" ? "Captain location is updating." : "Location updating. Captain movement appears only when verified location is available."}
    </Text> : null}
    {showPin && trip.tripPin ? <>
      <Text style={ui.otpCode}>{trip.tripPin.slice(0, 3)} {trip.tripPin.slice(3)}</Text>
      <Text style={styles.pinWarning}>Share this PIN only with your approved KariGO Ride Captain at pickup.</Text>
    </> : lifecycle.captainVisible && !terminal ? <>
      <Text style={styles.maskedPin}>••• •••</Text>
      <Text style={ui.muted}>Your Ride PIN will appear when your approved Captain reaches pickup.</Text>
    </> : null}
    {trip.status === "REQUESTED" ? <CaptainSearchProgress /> : null}
    <RideTimeline trip={trip} />
    <SafetyPanel trip={trip} onShare={shareRide} />
    {showReceipt ? <RideReceipt trip={trip} /> : null}
    {otherActiveCount > 0 ? <View style={styles.activeNotice}>
      <Text style={styles.activeNoticeTitle}>{otherActiveCount} other active ride {otherActiveCount === 1 ? "request" : "requests"}</Text>
      <Text style={styles.activeNoticeText}>Manage legacy active rides from Orders.</Text>
    </View> : null}
    {lifecycle.customerCancellationAllowed ? <Button title={loading ? "Cancelling..." : "Cancel ride request"} tone="muted" disabled={loading} onPress={onCancel} /> : null}
    <View style={styles.inlineActions}>
      <Button title="Share Ride" tone="muted" onPress={shareRide} />
      {canChatCaptain ? <Button title="Chat with Captain" tone="muted" onPress={chatCaptain} /> : null}
      {canContactCaptain ? <Button title="Contact Captain" tone="muted" onPress={openContact} /> : null}
    </View>
    {terminal ? <View style={styles.inlineActions}>
      <Button title={trip.status === "EXPIRED" ? "Retry ride request" : "Book another ride"} onPress={onBookAnother} />
      <Button title="Back to KariGO Home" tone="muted" onPress={onBackHome} />
      <Button title="View all rides" tone="muted" onPress={onViewAllRides} />
    </View> : <View style={styles.inlineActions}>
      <Button title="Refresh status" tone="muted" disabled={loading} onPress={onRefresh} />
      <Button title="Back to KariGO Home" tone="muted" onPress={onBackHome} />
      <Button title={otherActiveCount > 0 ? "Manage rides" : "View all rides"} tone="muted" onPress={onViewAllRides} />
    </View>}
  </Card>;
}

function CaptainVehicleCard({ captain, vehicle, status }: { captain: ReturnType<typeof captainForTrip> | null; vehicle: ReturnType<typeof vehicleForTrip> | null; status: TaxiTrip["status"] }) {
  return <View style={styles.captainCard}>
    <Text style={styles.captainTitle}>Ride Captain</Text>
    {captain ? <>
      <View style={styles.captainHeader}>
        <View style={styles.captainAvatar}><Text style={styles.captainAvatarText}>{captain.displayName.slice(0, 1).toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.captainText} numberOfLines={1}>{captain.displayName}</Text>
          <Text style={ui.muted}>{captain.verified ? "Verified KariGO Ride Captain" : "Verification pending"}</Text>
        </View>
      </View>
      {captain.location ? <Text style={ui.muted}>{captain.location.freshness === "fresh" ? "Captain location recently updated." : "Captain location may be stale."}</Text> : status === "DRIVER_ASSIGNED" || status === "ACCEPTED" ? <Text style={ui.muted}>Location updating.</Text> : null}
    </> : <Text style={ui.muted}>Captain details will appear after KariGO confirms assignment.</Text>}
    {vehicle ? <View style={styles.vehiclePanel}>
      <Text style={styles.vehicleTitle}>Vehicle</Text>
      <Text style={styles.captainText}>{humanVehicleDescription(vehicle) || "Vehicle details pending"}</Text>
      <Text style={ui.muted}>{vehicle.registrationNumber ? `Registration: ${vehicle.registrationNumber}` : "Registration pending"}</Text>
      <Text style={ui.muted}>{vehicle.category ? `${humanVehicleValue(vehicle.category)}${vehicle.seatCapacity ? ` · ${vehicle.seatCapacity} seats` : ""}` : "Ride category vehicle"}</Text>
    </View> : null}
  </View>;
}

function RideTimeline({ trip }: { trip: TaxiTrip }) {
  const items = trip.timeline?.length ? trip.timeline : [{
    key: trip.status,
    label: rideTrackingTitle(trip),
    status: trip.status,
    timestamp: trip.updatedAt ?? trip.createdAt,
    current: true
  }];
  return <View style={styles.timelineCard}>
    <Text style={styles.timelineTitle}>Ride timeline</Text>
    {items.map((item) => <View key={item.key} style={styles.timelineRow}>
      <View style={[styles.timelineDot, item.current && styles.timelineDotCurrent]} />
      <View style={styles.timelineBody}>
        <Text style={styles.timelineLabel}>{item.label}</Text>
        <Text style={ui.muted}>{item.timestamp ? formatDateTime(item.timestamp) : item.current ? "Current status" : "Pending"}</Text>
      </View>
    </View>)}
  </View>;
}

function SafetyPanel({ trip, onShare }: { trip: TaxiTrip; onShare: () => void }) {
  const captain = captainForTrip(trip);
  const vehicle = vehicleForTrip(trip);
  return <View style={styles.safetyPanel}>
    <Text style={styles.safetyTitle}>Safety reminders</Text>
    <Text style={ui.muted}>Verify the Captain name and vehicle before entering.</Text>
    {captain ? <Text style={ui.muted}>Captain: {captain.displayName}</Text> : null}
    {vehicle?.registrationNumber ? <Text style={ui.muted}>Registration: {vehicle.registrationNumber}</Text> : null}
    <Text style={ui.muted}>{trip.status === "ARRIVED_PICKUP" ? "Share the Ride PIN only at pickup." : "Do not share your Ride PIN before pickup."}</Text>
    <Button title="Share safe ride details" tone="muted" onPress={onShare} />
  </View>;
}

function RideReceipt({ trip }: { trip: TaxiTrip }) {
  const captain = captainForTrip(trip);
  const vehicle = vehicleForTrip(trip);
  const receipt = trip.receipt;
  const fareLabel = trip.status === "COMPLETED" && trip.finalFareKobo ? "Final fare" : "Estimated fare";
  return <View style={styles.receiptCard}>
    <Text style={styles.receiptTitle}>{trip.status === "COMPLETED" ? "Ride receipt" : "Ride record"}</Text>
    <ReceiptRow label="Reference" value={trip.tripReference} />
    {receipt ? <ReceiptRow label="Receipt" value={receipt.receiptNumber} /> : null}
    <ReceiptRow label="Status" value={rideTrackingTitle(trip)} />
    <ReceiptRow label="Ride" value={tripCategoryLabel(trip)} />
    <ReceiptRow label="Pickup" value={trip.pickupAddress} />
    <ReceiptRow label="Destination" value={trip.destinationAddress} />
    <ReceiptRow label="Distance" value={receipt ? [receipt.plannedDistanceKm !== null && receipt.plannedDistanceKm !== undefined ? `Planned ${receipt.plannedDistanceKm} km` : null, receipt.actualDistanceKm !== null && receipt.actualDistanceKm !== undefined ? `Actual ${receipt.actualDistanceKm} km` : null].filter(Boolean).join(" · ") || "Unavailable" : trip.estimatedDistanceKm ? `${Number(trip.estimatedDistanceKm).toLocaleString()} km` : "Pending"} />
    <ReceiptRow label="Duration" value={receipt?.durationSeconds !== null && receipt?.durationSeconds !== undefined ? `${Math.ceil(receipt.durationSeconds / 60)} min` : trip.estimatedDurationMin ? `${trip.estimatedDurationMin} min` : "Pending"} />
    <ReceiptRow label="Captain" value={receipt?.captainName ?? captain?.displayName ?? "Not assigned"} />
    <ReceiptRow label="Vehicle" value={humanVehicleValue(receipt?.vehicleDescription) ?? humanVehicleDescription(vehicle) ?? "Not assigned"} />
    {receipt ? <ReceiptRow label="Ride fare" value={formatRideFareKobo(receipt.rideFareKobo)} /> : <ReceiptRow label={fareLabel} value={formatRideFareKobo(trip.finalFareKobo ?? trip.estimatedFareKobo)} />}
    {receipt?.minimumFareApplied ? <Text style={ui.muted}>Minimum Ride fare applied.</Text> : null}
    {receipt ? <ReceiptRow label="Waiting" value={`${Math.floor(receipt.totalWaitingSeconds / 60)}m ${receipt.totalWaitingSeconds % 60}s · ${formatRideFareKobo(receipt.waitingChargeKobo)}`} /> : null}
    {receipt && receipt.platformFeeKobo ? <ReceiptRow label="Platform fee" value={formatRideFareKobo(receipt.platformFeeKobo)} /> : null}
    {receipt && receipt.discountKobo ? <ReceiptRow label="Discount" value={`−${formatRideFareKobo(receipt.discountKobo)}`} /> : null}
    {receipt ? <ReceiptRow label="Total" value={formatRideFareKobo(receipt.totalFareKobo)} /> : null}
    <ReceiptRow label="Payment" value={receipt?.paymentMethod ?? "Cash"} />
    <ReceiptRow label="Requested" value={formatDateTime(trip.requestedAt)} />
    {trip.acceptedAt ? <ReceiptRow label="Accepted" value={formatDateTime(trip.acceptedAt)} /> : null}
    {trip.arrivedAtPickupAt ? <ReceiptRow label="Pickup arrival" value={formatDateTime(trip.arrivedAtPickupAt)} /> : null}
    {trip.startedAt ? <ReceiptRow label="Started" value={formatDateTime(trip.startedAt)} /> : null}
    {trip.arrivedAtDestinationAt ? <ReceiptRow label="Destination reached" value={formatDateTime(trip.arrivedAtDestinationAt)} /> : null}
    {trip.completedAt ? <ReceiptRow label="Completed" value={formatDateTime(trip.completedAt)} /> : null}
    {trip.cancelledAt ? <ReceiptRow label="Closed" value={formatDateTime(trip.cancelledAt)} /> : null}
    {trip.cancellationReason ? <ReceiptRow label="Reason" value={trip.cancellationReason} /> : null}
  </View>;
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.receiptRow}>
    <Text style={styles.receiptLabel}>{label}</Text>
    <Text style={styles.receiptValue}>{value}</Text>
  </View>;
}

function CaptainSearchProgress() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    function start() {
      progress.setValue(0);
      loop = Animated.loop(Animated.timing(progress, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true
      }));
      loop.start();
    }
    start();
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        start();
      } else {
        loop?.stop();
      }
    });
    return () => {
      loop?.stop();
      subscription.remove();
    };
  }, [progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 220]
  });

  return <View accessibilityLabel="Searching for an available KariGO Ride Captain." style={styles.searchProgressCard}>
    <Text style={styles.searchProgressTitle}>Looking for a Ride Captain</Text>
    <Text style={ui.muted}>Connecting you with available Captains nearby.</Text>
    <View style={styles.searchProgressTrack}>
      <Animated.View style={[styles.searchProgressBar, { transform: [{ translateX }] }]} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  activeNotice: { backgroundColor: "#FFF7ED", borderColor: "#FDBA74", borderRadius: 16, borderWidth: 1, gap: 4, padding: 12 },
  activeNoticeText: { color: "#9A3412", fontSize: 12, fontWeight: "700", lineHeight: 18 },
  activeNoticeTitle: { color: "#7C2D12", fontWeight: "900" },
  bookingHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  bottomSheet: { backgroundColor: brand.colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, bottom: 0, left: 0, paddingHorizontal: 18, position: "absolute", right: 0, shadowColor: "#111827", shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.16, shadowRadius: 18 },
  captainCard: { backgroundColor: "#F9FAFB", borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, gap: 3, padding: 12 },
  captainAvatar: { alignItems: "center", backgroundColor: "#FEF2F2", borderRadius: 999, height: 42, justifyContent: "center", width: 42 },
  captainAvatarText: { color: brand.colors.primaryDark, fontSize: 18, fontWeight: "900" },
  captainHeader: { alignItems: "center", flexDirection: "row", gap: 10 },
  captainText: { color: brand.colors.charcoal, fontWeight: "900" },
  captainTitle: { color: brand.colors.primaryDark, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  categoryBody: { flex: 1, gap: 2 },
  categoryCard: { alignItems: "center", borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 10, minHeight: 74, padding: 10 },
  categoryCardActive: { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" },
  categoryDescription: { color: brand.colors.muted, fontSize: 12 },
  categoryFare: { color: brand.colors.charcoal, fontSize: 13, fontWeight: "900", minWidth: 96, textAlign: "right" },
  categoryIcon: { alignItems: "center", backgroundColor: brand.colors.charcoal, borderRadius: 16, height: 38, justifyContent: "center", width: 38 },
  categoryIconText: { color: brand.colors.white, fontWeight: "900" },
  categoryMeta: { color: brand.colors.muted, fontSize: 12, fontWeight: "700" },
  categoryTitle: { color: brand.colors.charcoal, fontWeight: "900" },
  centerPin: { alignItems: "center", left: "50%", marginLeft: -14, marginTop: -34, position: "absolute", top: "50%" },
  centerPinHead: { backgroundColor: brand.colors.primary, borderColor: brand.colors.white, borderRadius: 18, borderWidth: 4, height: 28, shadowColor: "#111827", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 10, width: 28 },
  centerPinTail: { backgroundColor: brand.colors.primary, height: 14, marginTop: -3, transform: [{ rotate: "45deg" }], width: 14 },
  compactSection: { gap: 10 },
  compactSectionTitle: { color: brand.colors.charcoal, fontSize: 14, fontWeight: "900" },
  currentLocationFab: { alignItems: "center", backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 999, borderWidth: 1, height: 50, justifyContent: "center", position: "absolute", right: 18, shadowColor: "#111827", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 10, width: 50 },
  currentLocationFabText: { color: brand.colors.charcoal, fontSize: 12, fontWeight: "900" },
  currentPickupRow: { alignItems: "center", backgroundColor: "#F9FAFB", borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 12, padding: 12 },
  detailsToggle: { alignItems: "center", borderColor: brand.colors.border, borderRadius: 14, borderWidth: 1, padding: 12 },
  detailsToggleText: { color: brand.colors.charcoal, fontWeight: "900" },
  finalFare: { color: brand.colors.charcoal, fontSize: 22, fontWeight: "900" },
  fullScreenMap: { backgroundColor: brand.colors.background, flex: 1 },
  googleAttribution: { alignSelf: "flex-end", color: brand.colors.muted, fontSize: 11, fontWeight: "800" },
  headerButton: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
  headerButtonText: { color: brand.colors.charcoal, fontWeight: "900" },
  headerTitle: { color: brand.colors.charcoal, fontSize: 16, fontWeight: "900" },
  inlineActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  laterButton: { alignItems: "center", backgroundColor: "#FEF2F2", borderColor: "#FECACA", borderRadius: 18, borderWidth: 1, justifyContent: "center", minWidth: 78, padding: 12 },
  laterText: { color: brand.colors.primaryDark, fontWeight: "900" },
  mapEyebrow: { color: brand.colors.primary, fontSize: 11, fontWeight: "900", letterSpacing: 1.1, textTransform: "uppercase" },
  mapPickerPanel: { backgroundColor: brand.colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, bottom: 0, gap: 12, left: 0, padding: 18, position: "absolute", right: 0 },
  mapScreenTitle: { color: brand.colors.charcoal, fontSize: 17, fontWeight: "900" },
  mapTitle: { color: brand.colors.charcoal, fontSize: 18, fontWeight: "900" },
  mapTitleCard: { backgroundColor: "rgba(255,255,255,0.94)", borderColor: brand.colors.border, borderRadius: 18, borderWidth: 1, flex: 1, paddingHorizontal: 14, paddingVertical: 10 },
  mapTopBar: { alignItems: "center", flexDirection: "row", gap: 10, left: 16, position: "absolute", right: 16, top: 0 },
  maskedPin: { alignSelf: "flex-start", backgroundColor: "#111827", borderRadius: 16, color: brand.colors.white, fontSize: 22, fontWeight: "900", letterSpacing: 4, overflow: "hidden", paddingHorizontal: 16, paddingVertical: 12 },
  metricCard: { backgroundColor: "#F9FAFB", borderRadius: 16, flex: 1, padding: 12 },
  metricLabel: { color: brand.colors.muted, fontSize: 12, fontWeight: "800" },
  metricValue: { color: brand.colors.charcoal, fontSize: 15, fontWeight: "900" },
  metrics: { flexDirection: "row", gap: 10 },
  paymentGrid: { flexDirection: "row", gap: 8 },
  paymentOption: { borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, flex: 1, gap: 2, padding: 10 },
  paymentOptionActive: { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" },
  paymentOptionDisabled: { opacity: 0.55 },
  paymentSubtitle: { color: brand.colors.muted, fontSize: 11, fontWeight: "800" },
  paymentTitle: { color: brand.colors.charcoal, fontWeight: "900" },
  pinWarning: { backgroundColor: "#FEF2F2", borderRadius: 14, color: brand.colors.primaryDark, fontWeight: "900", lineHeight: 19, padding: 10 },
  pickupMarker: { backgroundColor: brand.colors.success },
  placeBody: { flex: 1 },
  placeDot: { alignItems: "center", backgroundColor: "#FEF2F2", borderRadius: 16, height: 34, justifyContent: "center", width: 34 },
  placeDotText: { color: brand.colors.primaryDark, fontWeight: "900" },
  placeRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  placeTitle: { color: brand.colors.charcoal, fontWeight: "900" },
  removeStopButton: { paddingHorizontal: 6, paddingVertical: 4 },
  removeStopText: { color: brand.colors.primaryDark, fontSize: 12, fontWeight: "900" },
  roundButton: { backgroundColor: "rgba(255,255,255,0.94)", borderColor: brand.colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11 },
  roundButtonText: { color: brand.colors.charcoal, fontWeight: "900" },
  routeComposer: { backgroundColor: "#F9FAFB", borderColor: brand.colors.border, borderRadius: 18, borderWidth: 1, gap: 8, padding: 10 },
  routeComposerRow: { alignItems: "center", borderColor: "transparent", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 10, padding: 8 },
  routeComposerRowActive: { backgroundColor: brand.colors.white, borderColor: "#FCA5A5" },
  routeInput: { color: brand.colors.charcoal, fontSize: 15, fontWeight: "800", minHeight: 28, padding: 0, textAlign: "left", writingDirection: "ltr" },
  routeLabel: { color: brand.colors.muted, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  routeMarker: { backgroundColor: brand.colors.charcoal, borderColor: brand.colors.white, borderRadius: 999, borderWidth: 3, height: 18, width: 18 },
  routePanel: { backgroundColor: "#F9FAFB", borderRadius: 18, gap: 10, padding: 12 },
  routePlaceholder: { color: brand.colors.muted },
  routePoint: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  routeText: { flex: 1 },
  routeValue: { color: brand.colors.charcoal, fontSize: 14, fontWeight: "800", lineHeight: 20 },
  scheduleNote: { backgroundColor: "#EFF6FF", borderRadius: 12, color: "#1E40AF", fontWeight: "800", padding: 10 },
  searchRow: { alignItems: "stretch", flexDirection: "row", gap: 10 },
  searchProgressBar: { backgroundColor: brand.colors.primary, borderRadius: 999, height: 6, opacity: 0.9, width: 92 },
  searchProgressCard: { backgroundColor: "#F9FAFB", borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, gap: 8, padding: 12 },
  searchProgressTitle: { color: brand.colors.charcoal, fontWeight: "900" },
  searchProgressTrack: { backgroundColor: "#FEE2E2", borderRadius: 999, height: 6, overflow: "hidden" },
  sheetEyebrow: { color: brand.colors.primary, fontSize: 11, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
  sheetHandle: { backgroundColor: "#D1D5DB", borderRadius: 999, height: 5, width: 46 },
  sheetHandleWrap: { alignItems: "center", paddingBottom: 8, paddingTop: 10 },
  sheetHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sheetScroll: { gap: 12 },
  sheetStatic: { flex: 1, gap: 10 },
  sheetTitle: { color: brand.colors.charcoal, fontSize: 22, fontWeight: "900", letterSpacing: -0.3 },
  receiptCard: { backgroundColor: "#F9FAFB", borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, gap: 8, padding: 12 },
  receiptLabel: { color: brand.colors.muted, flexShrink: 0, fontSize: 12, fontWeight: "800", width: 98 },
  receiptRow: { alignItems: "flex-start", borderTopColor: "#E5E7EB", borderTopWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 8 },
  receiptTitle: { color: brand.colors.charcoal, fontSize: 16, fontWeight: "900" },
  receiptValue: { color: brand.colors.charcoal, flex: 1, fontSize: 13, fontWeight: "800", lineHeight: 18, minWidth: 150 },
  safetyPanel: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A", borderRadius: 16, borderWidth: 1, gap: 8, padding: 12 },
  safetyTitle: { color: "#92400E", fontWeight: "900" },
  smallPill: { backgroundColor: "#F3F4F6", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  smallPillText: { color: brand.colors.charcoal, fontSize: 12, fontWeight: "900" },
  stopMarker: { backgroundColor: brand.colors.warning },
  stickyActionFooter: { backgroundColor: brand.colors.white, borderTopColor: brand.colors.border, borderTopWidth: 1, gap: 8, left: 0, paddingHorizontal: 0, paddingTop: 10, position: "absolute", right: 0, bottom: 0 },
  stickyActionHint: { color: brand.colors.muted, fontSize: 12, fontWeight: "700", textAlign: "center" },
  stickyActionSummary: { color: brand.colors.charcoal, fontSize: 13, fontWeight: "900", textAlign: "center" },
  stickyPanel: { flex: 1, position: "relative" },
  stickyScrollContent: { gap: 12 },
  suggestionBox: { backgroundColor: "#F9FAFB", borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, gap: 10, padding: 10 },
  suggestionRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  timelineBody: { flex: 1, gap: 2 },
  timelineCard: { backgroundColor: "#FFFFFF", borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, gap: 10, padding: 12 },
  timelineDot: { backgroundColor: "#D1D5DB", borderRadius: 999, height: 12, marginTop: 3, width: 12 },
  timelineDotCurrent: { backgroundColor: brand.colors.primary },
  timelineLabel: { color: brand.colors.charcoal, fontWeight: "900" },
  timelineRow: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  timelineTitle: { color: brand.colors.charcoal, fontSize: 15, fontWeight: "900" },
  trackingMeta: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" },
  trackingSheet: { backgroundColor: brand.colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, bottom: 0, left: 0, maxHeight: "58%", paddingHorizontal: 18, paddingTop: 16, position: "absolute", right: 0, shadowColor: "#111827", shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.16, shadowRadius: 18 },
  tripRef: { color: brand.colors.charcoal, fontWeight: "900" },
  tripRow: { borderTopColor: brand.colors.border, borderTopWidth: 1, gap: 6, paddingTop: 10 },
  vehiclePanel: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 14, borderWidth: 1, gap: 3, marginTop: 6, padding: 10 },
  vehicleTitle: { color: brand.colors.charcoal, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  whereToControl: { backgroundColor: brand.colors.charcoal, borderRadius: 18, flex: 1, gap: 4, minHeight: 66, padding: 14 },
  whereToHint: { color: "#D1D5DB", fontWeight: "700" },
  whereToText: { color: brand.colors.white, fontSize: 22, fontWeight: "900" }
});
