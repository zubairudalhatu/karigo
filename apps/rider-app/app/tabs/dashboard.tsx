import { Feather } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import { router } from "expo-router";
import { AppState, AppStateStatus, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import MapView, { Marker, Region } from "react-native-maps";
import { brand } from "@karigo/config";
import type { CaptainAccess, CaptainWorkState } from "../../src/api/captain-access.api";
import type { LaunchAvailabilityResponse, TaxiTrip } from "@karigo/shared-types";
import { captainAccessApi } from "../../src/api/captain-access.api";
import { riderApi, RiderProfile } from "../../src/api/rider.api";
import { jobsApi, RiderJob } from "../../src/api/jobs.api";
import type { EarningsSummary } from "../../src/api/earnings.api";
import { earningsApi } from "../../src/api/earnings.api";
import { notificationsApi } from "../../src/api/notifications.api";
import { launchApi } from "../../src/api/launch.api";
import { taxiApi } from "../../src/api/taxi.api";
import { CaptainRideWorkspace } from "../../src/components/captain-ride-workspace";
import { CaptainHomeCockpit, CaptainHomeSkeleton } from "../../src/components/captain-home-cockpit";
import { disableActiveWorkBackgroundLocation, enableActiveWorkBackgroundLocation } from "../../src/lib/background-location";
import { Button, Card, Message, NavLink, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { useAuth } from "../../src/contexts/auth-context";
import { money } from "../../src/lib/errors";
import { CaptainLocation, CaptainLocationError, captainLocationErrorMessage, distanceMeters, requestCaptainForegroundLocation, toOperationalLocationPayload, watchCaptainForegroundLocation } from "../../src/lib/location";
import { captainAvailabilityErrorMessage, captainRequestMessage } from "../../src/lib/network-errors";
import {
  applicantReviewCopy,
  classifyCaptainApplication,
  hasSubmittedCaptainApplication
} from "../../src/lib/captain-application-status";
import { CaptainModeProjection, projectCaptainOperationalState } from "../../src/lib/captain-operational-state";
import { registerCaptainPushNotifications, subscribeToCaptainAssignmentNotifications } from "../../src/lib/captain-notifications";

const ACTIVE_DELIVERY_STATUSES = new Set([
  "RIDER_ASSIGNED",
  "RIDER_ARRIVING_PICKUP",
  "PICKED_UP",
  "ON_THE_WAY",
  "ARRIVED_DESTINATION",
  "DELIVERED"
]);

const LOCAL_MAP_FRESH_MS = 120_000;
const ONLINE_LOCATION_REUSE_MS = 30_000;
const READINESS_HEARTBEAT_INTERVAL_MS = 10 * 60_000;
const READINESS_AREA_CHANGE_METERS = 5_000;

function firstName(fullName?: string | null) {
  const name = fullName?.trim();
  if (!name) return "Captain";
  return name.split(/\s+/)[0] || "Captain";
}

function statusChipStyle(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("online")) return [styles.statusChip, styles.statusChipOnline];
  if (normalized.includes("busy")) return [styles.statusChip, styles.statusChipBusy];
  if (normalized.includes("pending") || normalized.includes("review")) return [styles.statusChip, styles.statusChipPending];
  return [styles.statusChip, styles.statusChipOffline];
}

function hasDeliveryApplication(status: CaptainAccess["deliveryCaptainApplication"] | null): status is Extract<CaptainAccess["deliveryCaptainApplication"], { exists: true }> {
  return status?.exists === true;
}

function hasRideApplication(status: CaptainAccess["rideCaptainApplication"] | null): status is Extract<CaptainAccess["rideCaptainApplication"], { exists: true }> {
  return status?.exists === true;
}

function applicationActionLabel(application: Extract<CaptainAccess["deliveryCaptainApplication"], { exists: true }> | Extract<CaptainAccess["rideCaptainApplication"], { exists: true }>) {
  const category = classifyCaptainApplication(application.status);
  if (category === "REVISION_REQUIRED") return "Review requested changes";
  if (category === "APPROVED" || category === "ACTIVATION_PENDING") return "View activation status";
  return "View application status";
}

function modeStatus(workState: CaptainWorkState | null, mode: "DELIVERY" | "RIDE", projection: CaptainModeProjection) {
  if (!projection.active) return projection.operationsLabel;
  if (!workState) return "Checking";
  if (workState.activeWorkMode === mode) return "Busy";
  if (workState.activeWorkMode && workState.activeWorkMode !== mode) return "Paused";
  if (projection.effectiveOnline) return "Online";
  if (projection.desiredOnline) return "Pending";
  return "Offline";
}

function modeStatusStyle(label: string) {
  const normalized = label.toLowerCase();
  if (normalized === "online" || normalized === "active") return styles.modeOnline;
  if (normalized.includes("pending")) return styles.modePending;
  if (normalized === "busy") return styles.modeBusy;
  return styles.modeOffline;
}

function coordinateNumber(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function hasValidCoordinate(latitude: number | null, longitude: number | null) {
  return latitude !== null &&
    longitude !== null &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;
}

function timestampValue(value?: string | null) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function locationSummary(access: CaptainAccess | null, profile: RiderProfile | null, workState: CaptainWorkState | null, deviceLocation: { location: CaptainLocation; seenAt: string } | null) {
  const deliveryLat = coordinateNumber(profile?.currentLatitude);
  const deliveryLng = coordinateNumber(profile?.currentLongitude);
  const rideProfile = access?.rideCaptainProfile;
  const rideLat = coordinateNumber(rideProfile?.lastKnownLatitude);
  const rideLng = coordinateNumber(rideProfile?.lastKnownLongitude);
  const currentArea = workState?.currentGpsArea ?? access?.deliveryCaptainProfile?.currentGpsArea ?? rideProfile?.currentGpsArea;
  const localFixIsFresh = Boolean(deviceLocation && Date.now() - timestampValue(deviceLocation.seenAt) <= LOCAL_MAP_FRESH_MS);
  const candidates = [
    deviceLocation && localFixIsFresh ? {
      coordinate: { latitude: deviceLocation.location.latitude, longitude: deviceLocation.location.longitude },
      lastSeen: deviceLocation.seenAt,
      source: "Current location",
      priority: 0
    } : null,
    hasValidCoordinate(deliveryLat, deliveryLng) ? {
      coordinate: { latitude: deliveryLat!, longitude: deliveryLng! },
      lastSeen: profile?.currentLocationUpdatedAt ?? null,
      source: "Last known location",
      priority: 1
    } : null,
    hasValidCoordinate(rideLat, rideLng) ? {
      coordinate: { latitude: rideLat!, longitude: rideLng! },
      lastSeen: rideProfile?.lastSeenAt ?? null,
      source: "Last known location",
      priority: 1
    } : null,
    deviceLocation && !localFixIsFresh ? {
      coordinate: { latitude: deviceLocation.location.latitude, longitude: deviceLocation.location.longitude },
      lastSeen: deviceLocation.seenAt,
      source: "Last known location",
      priority: 2
    } : null
  ].filter((candidate): candidate is { coordinate: { latitude: number; longitude: number }; lastSeen: string | null; source: string; priority: number } => Boolean(candidate))
    .sort((a, b) => a.priority - b.priority || timestampValue(b.lastSeen) - timestampValue(a.lastSeen));

  return {
    coordinate: candidates[0]?.coordinate ?? null,
    source: candidates[0]?.source ?? null,
    area: currentArea?.label ?? currentArea?.cityName ?? "Locating",
    lastSeen: candidates[0]?.lastSeen ?? profile?.currentLocationUpdatedAt ?? access?.rideCaptainProfile?.lastSeenAt ?? null
  };
}

function mapRegion(coordinate: { latitude: number; longitude: number } | null): Region | null {
  if (!coordinate) return null;
  return {
    ...coordinate,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015
  };
}

function activeWorkTitle(workState: CaptainWorkState | null) {
  if (!workState?.activeWorkMode) return null;
  return workState.activeWorkMode === "DELIVERY" ? "Delivery assignment in progress" : "Ride assignment in progress";
}

function captainAvailabilityCity(access: CaptainAccess | null, workState: CaptainWorkState | null) {
  const deliveryApplication = access?.deliveryCaptainApplication as { pilotCity?: string | null; currentProfileLocation?: { city?: string | null } | null } | undefined;
  const rideApplication = access?.rideCaptainApplication as { pilotCity?: string | null; currentProfileLocation?: { city?: string | null } | null } | undefined;
  return workState?.currentGpsArea?.cityName
    ?? access?.rideCaptainProfile?.city
    ?? access?.deliveryCaptainProfile?.currentGpsArea?.cityName
    ?? deliveryApplication?.currentProfileLocation?.city
    ?? deliveryApplication?.pilotCity
    ?? rideApplication?.currentProfileLocation?.city
    ?? rideApplication?.pilotCity
    ?? null;
}

export default function RiderDashboard() {
  const { user } = useAuth();
  const [captainAccess, setCaptainAccess] = useState<CaptainAccess | null>(null);
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [jobs, setJobs] = useState<RiderJob[]>([]);
  const [rideTrips, setRideTrips] = useState<TaxiTrip[]>([]);
  const [workState, setWorkState] = useState<CaptainWorkState | null>(null);
  const [launchAvailability, setLaunchAvailability] = useState<LaunchAvailabilityResponse | null>(null);
  const [launchAvailabilityLoading, setLaunchAvailabilityLoading] = useState(true);
  const [unread, setUnread] = useState(0);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<CaptainAccess["deliveryCaptainApplication"] | null>(null);
  const [rideOnboardingStatus, setRideOnboardingStatus] = useState<CaptainAccess["rideCaptainApplication"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [refreshNotice, setRefreshNotice] = useState("");
  const [availabilityUpdating, setAvailabilityUpdating] = useState(false);
  const [deviceLocation, setDeviceLocation] = useState<{ location: CaptainLocation; seenAt: string } | null>(null);
  const [isForeground, setIsForeground] = useState(AppState.currentState === "active");
  const [locationUpdating, setLocationUpdating] = useState(false);
  const [localLocationLoading, setLocalLocationLoading] = useState(false);
  const [locationIssue, setLocationIssue] = useState("");
  const [locationAutoBlocked, setLocationAutoBlocked] = useState(false);
  const deviceLocationRef = useRef<{ location: CaptainLocation; seenAt: string } | null>(null);
  const localLocationRequestRef = useRef<Promise<CaptainLocation> | null>(null);
  const operationalLocationRequiredRef = useRef(false);
  const readinessHeartbeatRef = useRef<{ location: CaptainLocation; sentAt: number } | null>(null);
  const readinessHeartbeatInFlightRef = useRef<Promise<void> | null>(null);
  const watcherRef = useRef<{ remove: () => void } | null>(null);
  const watcherStartingRef = useRef(false);
  const mountedRef = useRef(true);
  const uploadInFlightRef = useRef(false);
  const lastUploadedLocationRef = useRef<{ location: CaptainLocation; uploadedAt: number } | null>(null);
  const loadInFlightRef = useRef<Promise<void> | null>(null);
  const loadAbortRef = useRef<AbortController | null>(null);
  const captainAccessRef = useRef<CaptainAccess | null>(null);
  const lastLocationSuccessAtRef = useRef(0);
  const backoffUntilRef = useRef(0);
  const failureCountRef = useRef(0);
  const lastAutoErrorAtRef = useRef(0);
  const autoRefreshRequestedRef = useRef("");
  const latestWorkStateRef = useRef<CaptainWorkState | null>(null);
  const latestProjectionRef = useRef<ReturnType<typeof projectCaptainOperationalState> | null>(null);
  const rideTripsRef = useRef<TaxiTrip[]>([]);
  const assignmentSyncInFlightRef = useRef<Promise<void> | null>(null);

  function load() {
    if (loadInFlightRef.current) return loadInFlightRef.current;
    const controller = new AbortController();
    loadAbortRef.current = controller;
    setLoading(true);
    setLaunchAvailabilityLoading(true);
    const request = (async () => {
      let secondaryRefreshFailed = false;
      const secondary = async <T,>(promise: Promise<T>, fallback: T) => promise.catch(() => {
        secondaryRefreshFailed = true;
        return fallback;
      });
      try {
        const [access, state] = await Promise.all([
          captainAccessApi.resolve({ signal: controller.signal }),
          secondary(captainAccessApi.workState({ signal: controller.signal }), null)
        ]);
        if (controller.signal.aborted || !mountedRef.current) return;
        const projection = projectCaptainOperationalState(access, state);
        captainAccessRef.current = access;
        setCaptainAccess(access);
        setWorkState(state);
        setOnboardingStatus(access.deliveryCaptainApplication);
        setRideOnboardingStatus(access.rideCaptainApplication);

        const captainCity = captainAvailabilityCity(access, state);
        const [launchState, deliveryProfile, deliveryJobs, notificationCount, earningsSummary, assignedRides] = await Promise.all([
          captainCity ? secondary(launchApi.myAvailability(captainCity, { signal: controller.signal }), null) : Promise.resolve(null),
          projection.hasActiveDeliveryMode ? secondary(riderApi.profile({ signal: controller.signal }), null) : Promise.resolve(null),
          projection.hasActiveDeliveryMode ? secondary(jobsApi.list({ signal: controller.signal }), []) : Promise.resolve([]),
          projection.hasAnyActiveMode ? secondary(notificationsApi.unreadCount({ signal: controller.signal }), { count: 0 }) : Promise.resolve({ count: 0 }),
          projection.hasAnyActiveMode ? secondary(earningsApi.summary({ signal: controller.signal }), null) : Promise.resolve(null),
          projection.hasActiveRideMode ? secondary(taxiApi.availableTrips(), rideTripsRef.current) : Promise.resolve([])
        ]);
        if (controller.signal.aborted || !mountedRef.current) return;
        setLaunchAvailability(launchState);
        setLaunchAvailabilityLoading(false);
        setProfile(deliveryProfile);
        setJobs(deliveryJobs);
        setUnread(notificationCount.count);
        setEarnings(earningsSummary);
        setError("");
        rideTripsRef.current = assignedRides;
        setRideTrips(assignedRides);
        setRefreshNotice(secondaryRefreshFailed && Date.now() - lastLocationSuccessAtRef.current > 5_000
          ? "Some information could not be refreshed. Tap to retry."
          : "");
      } catch (e) {
        if (controller.signal.aborted || !mountedRef.current) return;
        if (captainAccessRef.current) {
          setRefreshNotice(Date.now() - lastLocationSuccessAtRef.current > 5_000
            ? captainRequestMessage(e, "secondary")
            : "");
        }
        else setError(captainRequestMessage(e, "critical"));
      } finally {
        if (!controller.signal.aborted && mountedRef.current) {
          setLoading(false);
          setLaunchAvailabilityLoading(false);
        }
      }
    })();
    loadInFlightRef.current = request;
    void request.finally(() => {
      if (loadInFlightRef.current === request) loadInFlightRef.current = null;
      if (loadAbortRef.current === controller) loadAbortRef.current = null;
    });
    return request;
  }

  function syncActiveWork(reason: string) {
    if (assignmentSyncInFlightRef.current) return assignmentSyncInFlightRef.current;
    const request = (async () => {
      if (mountedRef.current) setLaunchAvailabilityLoading(true);
      try {
        const state = await captainAccessApi.workState();
        const access = captainAccessRef.current;
        const captainCity = captainAvailabilityCity(access, state);
        const [assignedRides, deliveryJobs, launchState] = await Promise.all([
          access?.rideCaptainProfile ? taxiApi.availableTrips() : Promise.resolve([]),
          access?.deliveryCaptainProfile ? jobsApi.list() : Promise.resolve([]),
          captainCity ? launchApi.myAvailability(captainCity).catch(() => null) : Promise.resolve(null)
        ]);
        if (!mountedRef.current) return;
        latestWorkStateRef.current = state;
        rideTripsRef.current = assignedRides;
        setWorkState(state);
        setLaunchAvailability(launchState);
        setLaunchAvailabilityLoading(false);
        setRideTrips(assignedRides);
        setJobs(deliveryJobs);
        setRefreshNotice("");
        console.log(`captain_assignment_sync reason=${reason} activeMode=${state.activeWorkMode ?? "none"}`);
      } catch {
        if (mountedRef.current) {
          setLaunchAvailability(null);
          setLaunchAvailabilityLoading(false);
        }
        if (mountedRef.current && (latestWorkStateRef.current?.activeWorkMode || rideTripsRef.current.length)) {
          setRefreshNotice("Live updates are reconnecting. Your last confirmed assignment remains visible.");
        }
      }
    })();
    assignmentSyncInFlightRef.current = request;
    void request.finally(() => {
      if (assignmentSyncInFlightRef.current === request) assignmentSyncInFlightRef.current = null;
    });
    return request;
  }

  function stopCaptainWatcher(reason: string) {
    if (watcherRef.current) {
      watcherRef.current.remove();
      watcherRef.current = null;
      console.log(`captain_gps_watcher_stopped reason=${reason}`);
    }
  }

  function recordLocalMapLocation(location: CaptainLocation) {
    if (!mountedRef.current) return;
    const record = { location, seenAt: new Date().toISOString() };
    deviceLocationRef.current = record;
    setDeviceLocation(record);
    setLocationIssue(location.isApproximate ? "Allow precise location to go online for Ride and Delivery work." : "");
  }

  function localFixIsAcceptable(maxAgeMs: number, requirePrecise: boolean) {
    const record = deviceLocationRef.current;
    if (!record) return null;
    const ageMs = Date.now() - timestampValue(record.seenAt);
    if (ageMs > maxAgeMs || requirePrecise && record.location.isApproximate) return null;
    return record.location;
  }

  async function acquireLocalMapLocation(options: { strong?: boolean; allowCached?: boolean; manual?: boolean } = {}) {
    const strong = options.strong ?? false;
    if (options.allowCached) {
      const cached = localFixIsAcceptable(strong ? ONLINE_LOCATION_REUSE_MS : LOCAL_MAP_FRESH_MS, strong);
      if (cached) return cached;
    }
    if (localLocationRequestRef.current) {
      const pending = await localLocationRequestRef.current;
      if (!strong || !pending.isApproximate) return pending;
    }

    setLocalLocationLoading(true);
    const request = requestCaptainForegroundLocation(strong);
    localLocationRequestRef.current = request;
    try {
      const location = await request;
      recordLocalMapLocation(location);
      setLocationAutoBlocked(false);
      return location;
    } catch (cause) {
      const message = captainLocationErrorMessage(cause);
      if (mountedRef.current) {
        setLocationIssue(message);
        if (cause instanceof CaptainLocationError && (cause.code === "PERMISSION_DENIED" || cause.code === "SERVICES_DISABLED")) setLocationAutoBlocked(true);
      }
      throw cause;
    } finally {
      if (localLocationRequestRef.current === request) localLocationRequestRef.current = null;
      if (mountedRef.current) setLocalLocationLoading(false);
    }
  }

  async function localLocationForOnlineTransition() {
    return localFixIsAcceptable(ONLINE_LOCATION_REUSE_MS, true)
      ?? acquireLocalMapLocation({ strong: true, allowCached: true, manual: true });
  }

  async function recenterLocalMap() {
    try {
      return await acquireLocalMapLocation({ allowCached: true, manual: true });
    } catch {
      return null;
    }
  }

  function promoteReadinessLocation(location: CaptainLocation) {
    if (location.isApproximate || operationalLocationRequiredRef.current || !latestProjectionRef.current?.hasAnyActiveMode) return;
    if (readinessHeartbeatInFlightRef.current) return;
    const now = Date.now();
    const previous = readinessHeartbeatRef.current;
    const movedArea = Boolean(previous && distanceMeters(previous.location, location) >= READINESS_AREA_CHANGE_METERS);
    const previousIsRecent = Boolean(previous && now - previous.sentAt < READINESS_HEARTBEAT_INTERVAL_MS);
    const backendLocationAt = timestampValue(latestWorkStateRef.current?.lastLocationAt);
    const backendLocationIsStale = !backendLocationAt || now - backendLocationAt >= READINESS_HEARTBEAT_INTERVAL_MS;
    if ((!backendLocationIsStale || previousIsRecent) && !movedArea) return;

    const request = (async () => {
      try {
        const updated = await captainAccessApi.updateAvailability(toOperationalLocationPayload(location));
        if (!mountedRef.current) return;
        readinessHeartbeatRef.current = { location, sentAt: Date.now() };
        latestWorkStateRef.current = updated;
        setWorkState(updated);
        console.log("captain_readiness_location_updated");
      } catch (cause) {
        console.warn("captain_readiness_location_failed", {
          kind: cause instanceof Error ? cause.name : "unknown"
        });
      }
    })();
    readinessHeartbeatInFlightRef.current = request;
    void request.finally(() => {
      if (readinessHeartbeatInFlightRef.current === request) readinessHeartbeatInFlightRef.current = null;
    });
  }

  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => {
      mountedRef.current = false;
      stopCaptainWatcher("unmount");
      deviceLocationRef.current = null;
    };
  }, []);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      const active = state === "active";
      setIsForeground(active);
      if (active) void syncActiveWork("foreground");
      else {
        stopCaptainWatcher("background");
        loadAbortRef.current?.abort();
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    void registerCaptainPushNotifications().catch(() => undefined);
    return subscribeToCaptainAssignmentNotifications(() => {
      void syncActiveWork("notification");
    });
  }, []);
  useEffect(() => NetInfo.addEventListener((state) => {
    if (state.isConnected) void syncActiveWork("connectivity_restored");
  }), []);

  const projection = useMemo(() => projectCaptainOperationalState(captainAccess, workState), [captainAccess, workState]);
  useEffect(() => {
    const masterSuccessIsStale = message === "You're online and ready for requests." &&
      !projection.effectiveDeliveryOnline && !projection.effectiveRideOnline;
    const deliverySuccessIsStale = message === "Delivery availability is online." && !projection.effectiveDeliveryOnline;
    const rideSuccessIsStale = message === "Ride availability is online." && !projection.effectiveRideOnline;
    if (masterSuccessIsStale || deliverySuccessIsStale || rideSuccessIsStale) {
      setMessage("");
    }
  }, [message, projection.effectiveDeliveryOnline, projection.effectiveRideOnline]);
  const activeJob = useMemo(() => jobs.find((job) => ACTIVE_DELIVERY_STATUSES.has(job.orderStatus)), [jobs]);
  const mapState = locationSummary(captainAccess, profile, workState, deviceLocation);
  const hasMapCoordinate = Boolean(mapState.coordinate);
  const currentMapRegion = mapRegion(mapState.coordinate);
  const operationalLocationRequired = Boolean(
    projection.effectiveDeliveryOnline ||
    projection.effectiveRideOnline ||
    workState?.activeWorkMode
  );
  const strongLocationAccuracy = Boolean(workState?.activeWorkMode);
  const watcherShouldRun = projection.hasAnyActiveMode && isForeground && !locationAutoBlocked;

  useEffect(() => {
    latestWorkStateRef.current = workState;
    latestProjectionRef.current = projection;
    operationalLocationRequiredRef.current = operationalLocationRequired;
  }, [operationalLocationRequired, projection, workState]);

  useEffect(() => {
    if (!projection.hasAnyActiveMode || !isForeground) return;
    void acquireLocalMapLocation()
      .then(promoteReadinessLocation)
      .catch(() => undefined);
  }, [isForeground, projection.hasAnyActiveMode]);

  useEffect(() => {
    const online = Boolean(workState?.desiredDeliveryOnline || workState?.desiredRideOnline);
    if (!online && !workState?.activeWorkMode) return;
    const intervalMs = workState?.activeWorkMode ? 8_000 : 12_000;
    const timer = setInterval(() => {
      if (isForeground) void syncActiveWork(workState?.activeWorkMode ? "active_work_fallback" : "online_idle_fallback");
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isForeground, workState?.activeWorkMode, workState?.desiredDeliveryOnline, workState?.desiredRideOnline]);

  useEffect(() => {
    if (workState?.activeWorkMode) {
      void enableActiveWorkBackgroundLocation().catch(() => undefined);
    } else {
      void disableActiveWorkBackgroundLocation().catch(() => undefined);
    }
  }, [workState?.activeWorkMode]);

  function backendLocationAgeMs() {
    const timestamp = latestWorkStateRef.current?.lastLocationAt ?? mapState.lastSeen;
    if (!timestamp) return Number.POSITIVE_INFINITY;
    const parsed = new Date(timestamp).getTime();
    return Number.isFinite(parsed) ? Date.now() - parsed : Number.POSITIVE_INFINITY;
  }

  function storedLocationIsStale() {
    return backendLocationAgeMs() > 55_000 || !mapState.coordinate;
  }

  async function uploadCaptainLocation(location: CaptainLocation, options: { force?: boolean; manual?: boolean } = {}) {
    const currentWorkState = latestWorkStateRef.current;
    if (!currentWorkState || uploadInFlightRef.current) return;
    if (!operationalLocationRequiredRef.current) {
      recordLocalMapLocation(location);
      return;
    }
    const now = Date.now();
    if (!options.manual && now < backoffUntilRef.current) {
      setDeviceLocation({ location, seenAt: new Date(now).toISOString() });
      return;
    }
    const previous = lastUploadedLocationRef.current;
    const movedMeters = previous ? distanceMeters(previous.location, location) : Number.POSITIVE_INFINITY;
    const uploadAgeMs = previous ? now - previous.uploadedAt : Number.POSITIVE_INFINITY;
    if (!options.force && movedMeters < 20 && uploadAgeMs < 30_000 && !storedLocationIsStale()) {
      setDeviceLocation({ location, seenAt: new Date(now).toISOString() });
      return;
    }

    uploadInFlightRef.current = true;
    setLocationUpdating(true);
    try {
      const updated = await captainAccessApi.updateAvailability(toOperationalLocationPayload(location));
      lastUploadedLocationRef.current = { location, uploadedAt: now };
      failureCountRef.current = 0;
      backoffUntilRef.current = 0;
      recordLocalMapLocation(location);
      setWorkState(updated);
      if (latestProjectionRef.current?.delivery.active) {
        setProfile(await riderApi.profile().catch(() => null));
      }
      if (options.manual) {
        setMessage("Location refreshed.");
        setError("");
      }
    } catch (e) {
      failureCountRef.current += 1;
      const backoffMs = Math.min(300_000, 30_000 * (2 ** Math.min(4, failureCountRef.current - 1)));
      backoffUntilRef.current = Date.now() + backoffMs;
      if (options.manual) {
        setError(captainAvailabilityErrorMessage(e, { area: latestWorkStateRef.current?.currentGpsArea?.cityName ?? undefined, service: "work" }));
        lastLocationSuccessAtRef.current = Date.now();
        setRefreshNotice("");
        setMessage("");
      } else if (Date.now() - lastAutoErrorAtRef.current > 60_000) {
        lastAutoErrorAtRef.current = Date.now();
        setError("Captain location update is taking longer than expected. Your session is still active.");
      }
    } finally {
      uploadInFlightRef.current = false;
      setLocationUpdating(false);
    }
  }

  async function refreshGps(options: { silent?: boolean; force?: boolean } = {}) {
    if (!latestWorkStateRef.current || !operationalLocationRequiredRef.current) return;
    try {
      const currentLocation = await acquireLocalMapLocation({ strong: true, manual: !options.silent });
      setLocationAutoBlocked(false);
      await uploadCaptainLocation(currentLocation, { force: options.force ?? true, manual: !options.silent });
    } catch (cause) {
      if (!options.silent) {
        setError(captainLocationErrorMessage(cause));
        setMessage("");
      }
    }
  }

  useEffect(() => {
    if (!operationalLocationRequired || !isForeground || locationAutoBlocked) return;
    const refreshKey = `${workState?.lastLocationAt ?? "none"}:${hasMapCoordinate}`;
    if (autoRefreshRequestedRef.current === refreshKey) return;
    if (storedLocationIsStale()) {
      autoRefreshRequestedRef.current = refreshKey;
      void refreshGps({ silent: true, force: true });
    }
  }, [hasMapCoordinate, isForeground, locationAutoBlocked, operationalLocationRequired, workState?.lastLocationAt]);

  useEffect(() => {
    if (!watcherShouldRun) {
      stopCaptainWatcher("not_required");
      return;
    }

    let cancelled = false;
    if (!watcherRef.current && !watcherStartingRef.current) {
      watcherStartingRef.current = true;
      console.log("captain_gps_watcher_starting");
      void acquireLocalMapLocation().catch(() => undefined).then(() => watchCaptainForegroundLocation((location) => {
        recordLocalMapLocation(location);
        if (!operationalLocationRequiredRef.current) promoteReadinessLocation(location);
        else if (!location.isApproximate) void uploadCaptainLocation(location, { manual: false });
        else {
          setLocationIssue("Allow precise location to go online for Ride and Delivery work.");
        }
      }, strongLocationAccuracy))
        .then((subscription) => {
          if (cancelled || !mountedRef.current) {
            subscription.remove();
            return;
          }
          watcherRef.current = subscription;
          console.log("captain_gps_watcher_started");
        })
        .catch((cause) => {
          setLocationIssue(captainLocationErrorMessage(cause));
          if (cause instanceof CaptainLocationError && (cause.code === "PERMISSION_DENIED" || cause.code === "SERVICES_DISABLED")) setLocationAutoBlocked(true);
          console.log(`captain_gps_watcher_unavailable reason=${cause instanceof CaptainLocationError ? cause.code : "unknown"}`);
        })
        .finally(() => {
          watcherStartingRef.current = false;
        });
    }

    return () => {
      cancelled = true;
      stopCaptainWatcher("effect_cleanup");
    };
  }, [strongLocationAccuracy, watcherShouldRun]);

  async function toggleDelivery() {
    if (!workState || !projection.delivery.active || availabilityUpdating) return;
    setAvailabilityUpdating(true);
    try {
      const next = !workState.desiredDeliveryOnline;
      const currentLocation = next ? await localLocationForOnlineTransition() : null;
      const updated = await captainAccessApi.updateAvailability({
        deliveryOnline: next,
        ...(currentLocation ? toOperationalLocationPayload(currentLocation) : {})
      });
      if (currentLocation) {
        lastUploadedLocationRef.current = { location: currentLocation, uploadedAt: Date.now() };
        recordLocalMapLocation(currentLocation);
        setLocationAutoBlocked(false);
      }
      setWorkState(updated);
      setProfile(projection.delivery.active ? await riderApi.profile().catch(() => null) : null);
      if (updated.effectiveDeliveryOnline) {
        setMessage("Delivery availability is online.");
        setError("");
      } else if (next) {
        setMessage("");
        setError("Delivery isn't available for requests yet.");
      } else {
        setMessage("Delivery availability is offline.");
        setError("");
      }
    } catch (e) {
      setError(captainAvailabilityErrorMessage(e, { area: mapState.area, service: "Delivery" }));
      setMessage("");
    } finally {
      setAvailabilityUpdating(false);
      void syncActiveWork("availability_changed");
    }
  }

  async function toggleRide() {
    if (!workState || !projection.ride.active || availabilityUpdating) return;
    setAvailabilityUpdating(true);
    try {
      const next = !workState.desiredRideOnline;
      const currentLocation = next ? await localLocationForOnlineTransition() : null;
      const updated = await captainAccessApi.updateAvailability({
        rideOnline: next,
        ...(currentLocation ? toOperationalLocationPayload(currentLocation) : {})
      });
      if (currentLocation) {
        lastUploadedLocationRef.current = { location: currentLocation, uploadedAt: Date.now() };
        recordLocalMapLocation(currentLocation);
        setLocationAutoBlocked(false);
      }
      setWorkState(updated);
      if (updated.effectiveRideOnline) {
        setMessage("Ride availability is online.");
        setError("");
      } else if (next) {
        setMessage("");
        setError(`Rides aren't open in ${mapState.area} yet.`);
      } else {
        setMessage("Ride availability is offline.");
        setError("");
      }
    } catch (e) {
      setError(captainAvailabilityErrorMessage(e, { area: mapState.area, service: "Ride" }));
      setMessage("");
    } finally {
      setAvailabilityUpdating(false);
      void syncActiveWork("availability_changed");
    }
  }

  async function toggleOverallAvailability() {
    if (!workState || availabilityUpdating || workState.activeWorkMode) return;
    const currentlyOnline = Boolean(workState.effectiveDeliveryOnline || workState.effectiveRideOnline);
    const goOnline = !currentlyOnline;
    setAvailabilityUpdating(true);
    try {
      const currentLocation = goOnline ? await localLocationForOnlineTransition() : null;
      const updated = await captainAccessApi.updateAvailability({
        ...(projection.delivery.active && (!goOnline || canStartDelivery) ? { deliveryOnline: goOnline } : {}),
        ...(projection.ride.active && (!goOnline || canStartRide) ? { rideOnline: goOnline } : {}),
        ...(currentLocation ? toOperationalLocationPayload(currentLocation) : {})
      });
      if (currentLocation) {
        lastUploadedLocationRef.current = { location: currentLocation, uploadedAt: Date.now() };
        recordLocalMapLocation(currentLocation);
        setLocationAutoBlocked(false);
      }
      setWorkState(updated);
      const effectiveOnline = updated.effectiveDeliveryOnline || updated.effectiveRideOnline;
      if (goOnline && effectiveOnline) {
        setMessage("You're online and ready for requests.");
        setError("");
      } else if (!goOnline && !effectiveOnline) {
        setMessage("You're offline.");
        setError("");
      } else {
        setMessage("");
        setError(goOnline
          ? rideLaunch?.available === false && projection.ride.active && deliveryLaunch?.available !== true
            ? `Rides aren't open in ${mapState.area} yet.`
            : deliveryLaunch?.available === false && projection.delivery.active && rideLaunch?.available !== true
              ? `Deliveries aren't open in ${mapState.area} yet.`
              : "We couldn't take you online. Please try again."
          : "We couldn't take you offline. Please try again.");
      }
    } catch (e) {
      setError(captainAvailabilityErrorMessage(e, { area: mapState.area, service: "work" }));
      setMessage("");
    } finally {
      setAvailabilityUpdating(false);
      void syncActiveWork("availability_changed");
    }
  }

  const deliveryApplicationExists = hasDeliveryApplication(onboardingStatus);
  const rideApplicationExists = hasRideApplication(rideOnboardingStatus);
  const hasAnyApplication = deliveryApplicationExists || rideApplicationExists;
  const canToggle = !!workState && !workState.activeWorkMode;
  const deliveryLaunch = launchAvailability?.services.find((item) => item.serviceType === "PARCEL_DELIVERY");
  const rideLaunch = launchAvailability?.services.find((item) => item.serviceType === "RIDES");
  const deliveryCanRefreshStaleLocation = workState?.deliveryEligibility.reasonCode === "LOCATION_STALE";
  const rideCanRefreshStaleLocation = workState?.rideEligibility.reasonCode === "LOCATION_STALE";
  const canStartDelivery = !!workState && canToggle && !availabilityUpdating && projection.delivery.active &&
    !launchAvailabilityLoading && deliveryLaunch?.available === true &&
    (workState.deliveryEligibility.eligible || deliveryCanRefreshStaleLocation);
  const canStartRide = !!workState && canToggle && !availabilityUpdating && projection.ride.active &&
    !launchAvailabilityLoading && rideLaunch?.available === true &&
    (workState.rideEligibility.eligible || rideCanRefreshStaleLocation);
  const canToggleDelivery = !!workState && canToggle && !availabilityUpdating && projection.delivery.active && (
    workState.desiredDeliveryOnline || canStartDelivery
  );
  const canToggleRide = !!workState && canToggle && !availabilityUpdating && projection.ride.active && (
    workState.desiredRideOnline || canStartRide
  );
  const canToggleBoth = canToggleDelivery && canToggleRide;
  const bothModesOnline = Boolean(workState?.effectiveDeliveryOnline && workState?.effectiveRideOnline);
  const overallModeLabel = workState?.effectiveDeliveryOnline && workState?.effectiveRideOnline ? "Online for both"
    : workState?.effectiveRideOnline ? "Ride only"
      : workState?.effectiveDeliveryOnline ? "Delivery only"
        : "Offline";
  const launchMessages = [...new Set([
    rideLaunch?.available && rideLaunch.launchStage === "OPERATIONS_ONLY" ? "Your Ride Captain access is approved for scheduled controlled production operations. Go online only during the communicated operating window." : null,
    deliveryLaunch?.available && deliveryLaunch.launchStage === "OPERATIONS_ONLY" ? "Your Delivery Captain access is approved for scheduled controlled production operations. Go online only during the communicated operating window." : null,
    deliveryLaunch && !deliveryLaunch.available && projection.delivery.active ? `${deliveryLaunch.message} Your online preference is preserved; existing assignments remain available.` : null,
    rideLaunch && !rideLaunch.available && projection.ride.active ? `${rideLaunch.message} Your online preference is preserved; existing assignments remain available.` : null
  ].filter((value): value is string => Boolean(value)))];
  const isOnline = Boolean(workState?.effectiveDeliveryOnline || workState?.effectiveRideOnline);
  const canToggleMaster = isOnline
    ? canToggle && !availabilityUpdating
    : canStartRide || canStartDelivery;
  const masterStatusLabel = activeJob ? "BUSY • DELIVERY"
    : workState?.effectiveDeliveryOnline && workState?.effectiveRideOnline ? "ONLINE • RIDE + DELIVERY"
      : workState?.effectiveRideOnline ? "ONLINE • RIDES"
        : workState?.effectiveDeliveryOnline ? "ONLINE • DELIVERY"
          : "OFFLINE";
  const serviceNotice = rideLaunch?.available && rideLaunch.launchStage === "OPERATIONS_ONLY" || deliveryLaunch?.available && deliveryLaunch.launchStage === "OPERATIONS_ONLY"
    ? "Go online only during your scheduled operating window."
    : rideLaunch && !rideLaunch.available && projection.ride.active ? `Rides aren't open in ${mapState.area} yet.`
      : deliveryLaunch && !deliveryLaunch.available && projection.delivery.active ? `Deliveries aren't open in ${mapState.area} yet.` : null;
  const deliveryOperationsStatus = deliveryLaunch?.available === false ? "Unavailable" : projection.delivery.active ? "Available" : projection.delivery.operationsLabel;
  const rideOperationsStatus = rideLaunch?.available === false ? "Unavailable" : projection.ride.active ? "Available" : projection.ride.operationsLabel;
  const activeWork = activeWorkTitle(workState);
  const activeRide = rideTrips.find((trip) => !["COMPLETED", "CANCELLED_BY_CUSTOMER", "CANCELLED_BY_DRIVER", "CANCELLED_BY_ADMIN", "EXPIRED"].includes(trip.status)) ?? null;

  async function onRideUpdated(updated: TaxiTrip) {
    const next = rideTripsRef.current.map((trip) => trip.id === updated.id ? updated : trip);
    if (!next.some((trip) => trip.id === updated.id)) next.unshift(updated);
    rideTripsRef.current = next;
    setRideTrips(next);
    await syncActiveWork("assignment_mutation");
  }


  if (loading && !captainAccess) {
    return <Protected><CaptainHomeSkeleton captainName={firstName(user?.fullName)} /></Protected>;
  }


  if (activeRide) {
    return <Protected><Screen refreshing={loading} onRefresh={() => void syncActiveWork("manual_refresh")}>
      <View style={styles.cockpitHeader}>
        <Image source={require("../../assets/karigo-logo.png")} style={styles.logo} resizeMode="contain" />
        <View style={styles.headerActions}>
          <View style={[styles.statusChip, styles.statusChipBusy]}><Text style={styles.statusChipText}>Busy — Ride</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => router.push("/notifications")} style={styles.notificationBell}>
            <Feather name="bell" size={20} color={brand.colors.charcoal} />
            {unread > 0 ? <View style={styles.unreadBadge}><Text style={styles.unreadText}>{unread > 99 ? "99+" : unread}</Text></View> : null}
          </Pressable>
        </View>
      </View>
      <Message>{message}</Message>
      <Message error>{error}</Message>
      {refreshNotice ? <Text style={styles.resyncNotice}>{refreshNotice}</Text> : null}
      <CaptainRideWorkspace trip={activeRide} captainCoordinate={mapState.coordinate} operatingArea={mapState.area} onUpdated={onRideUpdated} />
    </Screen></Protected>;
  }

  if (projection.hasAnyActiveMode) {
    return <Protected><CaptainHomeCockpit
      captainName={firstName(profile?.user?.fullName ?? captainAccess?.account.fullName ?? user?.fullName)}
      coordinate={mapState.coordinate}
      region={currentMapRegion}
      area={mapState.area}
      approvedAreas={[...new Set([
        ...(captainAccess?.rideCaptainProfile?.approvedOperatingAreas ?? []),
        ...(captainAccess?.deliveryCaptainProfile?.approvedOperatingAreas ?? [])
      ].map((area) => area.cityName).filter((value): value is string => Boolean(value)))]}
      statusLabel={masterStatusLabel}
      online={isOnline}
      rideActive={projection.ride.active}
      deliveryActive={projection.delivery.active}
      rideDesiredOnline={Boolean(workState?.desiredRideOnline)}
      deliveryDesiredOnline={Boolean(workState?.desiredDeliveryOnline)}
      rideEffectiveOnline={Boolean(workState?.effectiveRideOnline)}
      deliveryEffectiveOnline={Boolean(workState?.effectiveDeliveryOnline)}
      canToggleMaster={Boolean(canToggleMaster)}
      canToggleRide={canToggleRide}
      canToggleDelivery={canToggleDelivery}
      availabilityUpdating={availabilityUpdating}
      availabilityChecking={launchAvailabilityLoading}
      todayEarnings={earnings?.todayEarnings ?? 0}
      unread={unread}
      activeDelivery={activeJob}
      serviceNotice={serviceNotice}
      refreshNotice={refreshNotice}
      message={message}
      error={error}
      loading={loading}
      locationLabel={localLocationLoading ? "Locating..." : mapState.source ?? "Location unavailable"}
      locationMessage={locationIssue}
      onToggleMaster={() => void toggleOverallAvailability()}
      onToggleRide={() => void toggleRide()}
      onToggleDelivery={() => void toggleDelivery()}
      onRecenter={recenterLocalMap}
      onRetrySync={() => void syncActiveWork("manual_refresh")}
    /></Protected>;
  }
  return (
    <Protected><Screen refreshing={loading} onRefresh={load}>
      <View style={styles.heroCard}>

        <View style={styles.heroTopRow}>
          <Image source={require("../../assets/karigo-logo.png")} style={styles.logo} resizeMode="contain" />
          <View style={styles.headerActions}>
            <View style={statusChipStyle(projection.overallStatus)}><Text style={styles.statusChipText}>{projection.overallStatus}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => router.push("/notifications")} style={styles.notificationBell}>
              <Feather name="bell" size={20} color={brand.colors.charcoal} />
              {unread > 0 ? <View style={styles.unreadBadge}><Text style={styles.unreadText}>{unread > 99 ? "99+" : unread}</Text></View> : null}
            </Pressable>
          </View>
        </View>
        <Text style={styles.kicker}>KariGO Captain</Text>
        <Text style={styles.title}>Hi, {firstName(profile?.user?.fullName ?? captainAccess?.account.fullName ?? user?.fullName)}</Text>
        <Text style={styles.heroCopy}>{projection.hasAnyActiveMode ? "Ready when you are." : "Check your Captain access and next step."}</Text>
      </View>
      <Message>{message}</Message>
      <Message error>{error}</Message>
      {refreshNotice ? <Pressable accessibilityRole="button" accessibilityLabel="Retry Home refresh" onPress={() => void load()} style={styles.refreshNotice}><Text style={styles.refreshNoticeText}>{refreshNotice}</Text></Pressable> : null}


      {projection.hasAnyActiveMode ? <>

        <Card>
          <View style={ui.spaceBetween}>
            <Text style={ui.title}>Live map</Text>
          </View>
          {currentMapRegion ? <View style={styles.mapShell}>
            <MapView
              accessibilityLabel="Captain live location map"
              initialRegion={currentMapRegion}
              region={currentMapRegion}
              scrollEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              style={styles.map}
            >
              <Marker coordinate={mapState.coordinate!} title="KariGO Captain" description={mapState.source ?? "Captain position"}>
                <View style={styles.vehicleMarker}>
                  <Feather name="navigation" size={18} color={brand.colors.white} />
                </View>
              </Marker>
            </MapView>
            <View style={styles.mapFooter}>
              <Text style={styles.mapFooterTitle}>{workState?.activeWorkMode ? activeWork : projection.overallStatus === "Offline" ? "Offline location view" : "Live location ready"}</Text>
              <Text style={styles.mapFooterText}>Current operating area: {mapState.area}</Text>
              <Text style={styles.mapFooterText}>{mapState.lastSeen ? `Last update: ${new Date(mapState.lastSeen).toLocaleString()}` : "Location updates when you go online."}</Text>
            </View>
          </View> : <View style={styles.mapUnavailable}>
            <View style={styles.mapPin}><Feather name="map-pin" size={24} color={brand.colors.primary} /></View>
            <View style={styles.mapCopy}>
              <Text style={styles.mapTitle}>Location unavailable</Text>
              <Text style={ui.muted}>Location updates automatically while you are online. Use Profile diagnostics if it remains unavailable.</Text>
              <Text style={ui.muted}>Current operating area: {mapState.area}</Text>
            </View>
          </View>}
          {locationAutoBlocked ? <Button title={locationUpdating ? "Retrying location..." : "Retry location"} tone="muted" disabled={!workState || locationUpdating} onPress={() => void refreshGps()} /> : null}
        </Card>

        <Card>
          <Text style={ui.title}>Operations status</Text>
          {projection.delivery.active ? <View style={styles.operationsRow}>
            <Text style={styles.modeTitle}>Delivery</Text>
            <Text style={[styles.modeBadge, modeStatusStyle(deliveryOperationsStatus)]}>{deliveryOperationsStatus}</Text>
          </View> : null}
          {projection.ride.active ? <View style={styles.operationsRow}>
            <Text style={styles.modeTitle}>Ride</Text>
            <Text style={[styles.modeBadge, modeStatusStyle(rideOperationsStatus)]}>{rideOperationsStatus}</Text>
          </View> : null}
          {launchMessages.map((notice) => <Text key={notice} style={ui.muted}>{notice}</Text>)}
        </Card>
        <Card>
          <Text style={ui.title}>Availability</Text>
          <Text style={ui.muted}>
            {workState?.activeWorkMode
              ? `Availability is paused while your ${workState.activeWorkMode === "DELIVERY" ? "Delivery assignment" : "Ride assignment"} is active.`
              : "Choose where you want to work today."}
          </Text>
          {projection.delivery.active && projection.ride.active ? <View style={styles.overallControl}>
            <View style={styles.modeCopy}>
              <Text style={styles.modeTitle}>Overall status</Text>
              <Text style={ui.muted}>{overallModeLabel}</Text>
            </View>
            <Button title={availabilityUpdating ? "Updating..." : bothModesOnline ? "Go offline" : "Go online"} disabled={!canToggleBoth} onPress={toggleOverallAvailability} />
          </View> : null}
          <View style={styles.modeRow}>
            <View style={styles.modeCopy}>
              <Text style={styles.modeTitle}>Delivery</Text>
              <Text style={[styles.modeBadge, modeStatusStyle(modeStatus(workState, "DELIVERY", projection.delivery))]}>{modeStatus(workState, "DELIVERY", projection.delivery)}</Text>
              {!projection.delivery.eligible ? <Text style={styles.reason}>{projection.delivery.eligibilityReason ?? "Delivery Captain activation is pending."}</Text> : null}
            </View>

            <Button title={availabilityUpdating ? "Updating..." : workState?.desiredDeliveryOnline ? "Go offline" : "Go online"} disabled={!canToggleDelivery} onPress={toggleDelivery} />
          </View>
          <View style={styles.modeRow}>
            <View style={styles.modeCopy}>
              <Text style={styles.modeTitle}>Ride</Text>
              <Text style={[styles.modeBadge, modeStatusStyle(modeStatus(workState, "RIDE", projection.ride))]}>{modeStatus(workState, "RIDE", projection.ride)}</Text>
              {!projection.ride.eligible ? <Text style={styles.reason}>{projection.ride.eligibilityReason ?? "Ride Captain activation is pending."}</Text> : null}
            </View>
            <Button title={availabilityUpdating ? "Updating..." : workState?.desiredRideOnline ? "Go offline" : "Go online"} disabled={!canToggleRide} onPress={toggleRide} />
          </View>
        </Card>

        <Card>
          <Text style={ui.title}>Current work</Text>
          {activeJob ? <>
            <Text style={styles.jobRef}>{activeJob.orderNumber}</Text>
            <StatusBadge status={activeJob.orderStatus} />
            <NavLink href={`/jobs/${activeJob.id}`} label="Open delivery assignment" />
          </> : workState?.activeRideTripId ? <>
            <Text style={styles.jobRef}>{workState.activeWorkReference ?? workState.activeRideTripId}</Text>
            <StatusBadge status="Busy with Ride" />
            <NavLink href="/taxi-readiness" label="Open active Ride" />
          </> : <>
            <Text style={styles.emptyTitle}>{projection.effectiveDeliveryOnline || projection.effectiveRideOnline ? "Waiting for assignment" : "No active assignment"}</Text>
            <Text style={ui.muted}>You will see a new Ride or Delivery assignment here when KariGO Operations assigns one.</Text>
          </>}
        </Card>

        <Card>
          <View style={ui.spaceBetween}>
            <Text style={ui.title}>Earnings</Text>
            <NavLink href="/earnings" label="View earnings" />
          </View>
          <View style={styles.earningsRow}>
            <View style={styles.earningMetric}><Text style={ui.muted}>Today</Text><Text style={styles.earningValue}>{money(earnings?.todayEarnings ?? 0)}</Text></View>
            <View style={styles.earningMetric}><Text style={ui.muted}>This week</Text><Text style={styles.earningValue}>{money(earnings?.thisWeekEarnings ?? 0)}</Text></View>
          </View>
        </Card>
      </> : <>
        {hasAnyApplication ? <Card tone="soft">
          <Text style={ui.title}>{projection.hasApprovedPendingActivation ? "Activation pending" : projection.hasRevisionRequired ? "Changes requested" : "Application status"}</Text>
          <Text style={ui.pageIntro}>{projection.overallMessage}</Text>
          {deliveryApplicationExists ? <>
            <View style={styles.applicationLine}>
              <Text style={styles.modeTitle}>Delivery Captain</Text>
              <StatusBadge status={projection.delivery.operationsLabel} />
            </View>
            <Text style={ui.muted}>{applicantReviewCopy(onboardingStatus, "DELIVERY_CAPTAIN")}</Text>
          </> : null}
          {rideApplicationExists ? <>
            <View style={styles.applicationLine}>
              <Text style={styles.modeTitle}>Ride Captain</Text>
              <StatusBadge status={projection.ride.operationsLabel} />
            </View>
            <Text style={ui.muted}>{applicantReviewCopy(rideOnboardingStatus, "RIDE_CAPTAIN")}</Text>
          </> : null}
          <NavLink href="/application-status" label={deliveryApplicationExists ? applicationActionLabel(onboardingStatus) : rideApplicationExists ? applicationActionLabel(rideOnboardingStatus) : "View application status"} />
        </Card> : <Card>
          <Text style={ui.title}>Apply to become a Captain</Text>
          <Text style={ui.muted}>Use your existing KariGO account to apply as a Delivery Captain, Ride Captain, or both.</Text>
          <NavLink href="/auth/apply" label="Start Captain application" />
        </Card>}
      </>}
    </Screen></Protected>
  );
}

const styles = StyleSheet.create({
  heroCard: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 24, borderWidth: 1, gap: 10, overflow: "hidden", padding: 18 },
  heroTopRow: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  headerActions: { alignItems: "center", flexDirection: "row", gap: 8 },
  notificationBell: { alignItems: "center", backgroundColor: "#F9FAFB", borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, height: 44, justifyContent: "center", minWidth: 44 },
  unreadBadge: { alignItems: "center", backgroundColor: brand.colors.primary, borderRadius: 999, minWidth: 20, paddingHorizontal: 5, paddingVertical: 2, position: "absolute", right: -4, top: -4 },
  unreadText: { color: brand.colors.white, fontSize: 10, fontWeight: "900" },
  kicker: { color: brand.colors.primary, fontSize: 12, fontWeight: "900", letterSpacing: 1.4, textTransform: "uppercase" },
  title: { color: brand.colors.charcoal, fontSize: 28, fontWeight: "900", letterSpacing: -0.4 },
  heroCopy: { color: brand.colors.charcoal, fontSize: 16, fontWeight: "800", lineHeight: 22 },
  logo: { flexShrink: 1, height: 38, maxWidth: 150, width: 128 },
  statusChip: { borderRadius: 999, flexShrink: 1, paddingHorizontal: 12, paddingVertical: 7 },
  statusChipBusy: { backgroundColor: "#FEF3C7" },
  statusChipOffline: { backgroundColor: "#F3F4F6" },
  statusChipOnline: { backgroundColor: "#DCFCE7" },
  statusChipPending: { backgroundColor: "#FFF7ED" },
  statusChipText: { color: brand.colors.charcoal, fontSize: 12, fontWeight: "900" },
  modeCopy: { flex: 1, gap: 5 },
  modeRow: { alignItems: "center", borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 12, justifyContent: "space-between", padding: 12 },
  modeTitle: { color: brand.colors.charcoal, fontSize: 16, fontWeight: "900" },
  modeBadge: { alignSelf: "flex-start", borderRadius: 999, fontSize: 12, fontWeight: "900", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 5 },
  modeOnline: { backgroundColor: "#DCFCE7", color: "#166534" },
  modeOffline: { backgroundColor: "#F3F4F6", color: brand.colors.muted },
  modePending: { backgroundColor: "#FEF3C7", color: "#92400E" },
  modeBusy: { backgroundColor: "#DBEAFE", color: "#1E40AF" },
  reason: { color: brand.colors.muted, fontSize: 12, fontWeight: "700" },
  mapShell: { borderColor: brand.colors.border, borderRadius: 18, borderWidth: 1, minHeight: 300, overflow: "hidden" },
  map: { height: 300, width: "100%" },
  mapFooter: { backgroundColor: "rgba(17, 17, 17, 0.82)", bottom: 0, left: 0, padding: 12, position: "absolute", right: 0 },
  mapFooterTitle: { color: brand.colors.white, fontSize: 14, fontWeight: "900" },
  mapFooterText: { color: "#F3F4F6", fontSize: 12, fontWeight: "700", lineHeight: 17 },
  mapUnavailable: { backgroundColor: "#F9FAFB", borderColor: brand.colors.border, borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 12, padding: 14 },
  mapPin: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: brand.colors.border, borderRadius: 18, borderWidth: 1, height: 36, justifyContent: "center", width: 36 },
  mapCopy: { flex: 1, gap: 4 },
  mapTitle: { color: brand.colors.charcoal, fontSize: 16, fontWeight: "900" },
  vehicleMarker: { alignItems: "center", backgroundColor: brand.colors.primary, borderColor: brand.colors.white, borderRadius: 999, borderWidth: 3, height: 38, justifyContent: "center", shadowColor: "#111827", shadowOpacity: 0.22, shadowRadius: 8, width: 38 },
  jobRef: { color: brand.colors.charcoal, fontSize: 16, fontWeight: "800" },
  emptyTitle: { color: brand.colors.charcoal, fontSize: 18, fontWeight: "900" },
  applicationLine: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  refreshNotice: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA", borderRadius: 12, borderWidth: 1, padding: 12 },
  refreshNoticeText: { color: "#9A3412", fontWeight: "800", lineHeight: 20 },
  operationsRow: { alignItems: "center", borderBottomColor: brand.colors.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  overallControl: { alignItems: "center", backgroundColor: "#F9FAFB", borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 12, justifyContent: "space-between", padding: 14 },
  earningsRow: { flexDirection: "row", gap: 10 },
  earningMetric: { backgroundColor: "#F9FAFB", borderRadius: 14, flex: 1, gap: 3, padding: 12 },
  earningValue: { color: brand.colors.charcoal, fontSize: 17, fontWeight: "900" },
  cockpitHeader: { alignItems: "center", backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 20, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: 14 },
  resyncNotice: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA", borderRadius: 12, borderWidth: 1, color: "#9A3412", fontWeight: "800", lineHeight: 20, padding: 12 }
});
