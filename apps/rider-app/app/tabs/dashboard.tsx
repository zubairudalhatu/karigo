import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { AppState, AppStateStatus, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import MapView, { Marker, Region } from "react-native-maps";
import { brand } from "@karigo/config";
import type { CaptainAccess, CaptainWorkState } from "../../src/api/captain-access.api";
import type { LaunchAvailabilityResponse } from "@karigo/shared-types";
import { captainAccessApi } from "../../src/api/captain-access.api";
import { riderApi, RiderProfile } from "../../src/api/rider.api";
import { jobsApi, RiderJob } from "../../src/api/jobs.api";
import { notificationsApi } from "../../src/api/notifications.api";
import { launchApi } from "../../src/api/launch.api";
import { Button, Card, Loading, Message, NavLink, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { useAuth } from "../../src/contexts/auth-context";
import { friendlyError } from "../../src/lib/errors";
import { CaptainLocation, distanceMeters, requestCaptainForegroundLocation, watchCaptainForegroundLocation } from "../../src/lib/location";
import {
  applicantReviewCopy,
  classifyCaptainApplication,
  hasSubmittedCaptainApplication
} from "../../src/lib/captain-application-status";
import { CaptainModeProjection, projectCaptainOperationalState } from "../../src/lib/captain-operational-state";

const ACTIVE_DELIVERY_STATUSES = new Set([
  "RIDER_ASSIGNED",
  "RIDER_ARRIVING_PICKUP",
  "PICKED_UP",
  "ON_THE_WAY",
  "ARRIVED_DESTINATION",
  "DELIVERED"
]);

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
  const candidates = [
    deviceLocation ? {
      coordinate: { latitude: deviceLocation.location.latitude, longitude: deviceLocation.location.longitude },
      lastSeen: deviceLocation.seenAt,
      source: "Device GPS"
    } : null,
    hasValidCoordinate(deliveryLat, deliveryLng) ? {
      coordinate: { latitude: deliveryLat!, longitude: deliveryLng! },
      lastSeen: profile?.currentLocationUpdatedAt ?? null,
      source: "Delivery GPS"
    } : null,
    hasValidCoordinate(rideLat, rideLng) ? {
      coordinate: { latitude: rideLat!, longitude: rideLng! },
      lastSeen: rideProfile?.lastSeenAt ?? null,
      source: "Ride GPS"
    } : null
  ].filter((candidate): candidate is { coordinate: { latitude: number; longitude: number }; lastSeen: string | null; source: string } => Boolean(candidate))
    .sort((a, b) => timestampValue(b.lastSeen) - timestampValue(a.lastSeen));

  return {
    coordinate: candidates[0]?.coordinate ?? null,
    source: candidates[0]?.source ?? null,
    area: currentArea?.label ?? currentArea?.cityName ?? "Unavailable",
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

export default function RiderDashboard() {
  const { user } = useAuth();
  const [captainAccess, setCaptainAccess] = useState<CaptainAccess | null>(null);
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [jobs, setJobs] = useState<RiderJob[]>([]);
  const [workState, setWorkState] = useState<CaptainWorkState | null>(null);
  const [launchAvailability, setLaunchAvailability] = useState<LaunchAvailabilityResponse | null>(null);
  const [unread, setUnread] = useState(0);
  const [onboardingStatus, setOnboardingStatus] = useState<CaptainAccess["deliveryCaptainApplication"] | null>(null);
  const [rideOnboardingStatus, setRideOnboardingStatus] = useState<CaptainAccess["rideCaptainApplication"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deviceLocation, setDeviceLocation] = useState<{ location: CaptainLocation; seenAt: string } | null>(null);
  const [isForeground, setIsForeground] = useState(AppState.currentState === "active");
  const [locationUpdating, setLocationUpdating] = useState(false);
  const [locationAutoBlocked, setLocationAutoBlocked] = useState(false);
  const watcherRef = useRef<{ remove: () => void } | null>(null);
  const watcherStartingRef = useRef(false);
  const mountedRef = useRef(true);
  const uploadInFlightRef = useRef(false);
  const lastUploadedLocationRef = useRef<{ location: CaptainLocation; uploadedAt: number } | null>(null);
  const backoffUntilRef = useRef(0);
  const failureCountRef = useRef(0);
  const lastAutoErrorAtRef = useRef(0);
  const autoRefreshRequestedRef = useRef("");
  const latestWorkStateRef = useRef<CaptainWorkState | null>(null);
  const latestProjectionRef = useRef<ReturnType<typeof projectCaptainOperationalState> | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [access, state] = await Promise.all([
        captainAccessApi.resolve(),
        captainAccessApi.workState().catch(() => null)
      ]);
      const projection = projectCaptainOperationalState(access, state);
      setCaptainAccess(access);
      setWorkState(state);
      setOnboardingStatus(access.deliveryCaptainApplication);
      setRideOnboardingStatus(access.rideCaptainApplication);

      const deliveryApplication = access.deliveryCaptainApplication as { pilotCity?: string | null; currentProfileLocation?: { city?: string | null } | null };
      const rideApplication = access.rideCaptainApplication as { pilotCity?: string | null; currentProfileLocation?: { city?: string | null } | null };
      const captainCity = access.rideCaptainProfile?.city
        ?? deliveryApplication.currentProfileLocation?.city
        ?? deliveryApplication.pilotCity
        ?? rideApplication.currentProfileLocation?.city
        ?? rideApplication.pilotCity;
      setLaunchAvailability(captainCity ? await launchApi.myAvailability(captainCity).catch(() => null) : null);

      const [deliveryProfile, deliveryJobs, notificationCount] = await Promise.all([
        projection.hasActiveDeliveryMode ? riderApi.profile().catch(() => null) : Promise.resolve(null),
        projection.hasActiveDeliveryMode ? jobsApi.list().catch(() => []) : Promise.resolve([]),
        projection.hasAnyActiveMode ? notificationsApi.unreadCount().catch(() => ({ count: 0 })) : Promise.resolve({ count: 0 })
      ]);
      setProfile(deliveryProfile);
      setJobs(deliveryJobs);
      setUnread(notificationCount.count);
      setError("");
    } catch (e) {
      setError(friendlyError(e));
      setProfile(null);
      setJobs([]);
      setUnread(0);
    } finally {
      setLoading(false);
    }
  }

  function stopCaptainWatcher(reason: string) {
    if (watcherRef.current) {
      watcherRef.current.remove();
      watcherRef.current = null;
      console.log(`captain_gps_watcher_stopped reason=${reason}`);
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => {
      mountedRef.current = false;
      stopCaptainWatcher("unmount");
    };
  }, []);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      const active = state === "active";
      setIsForeground(active);
      if (active) void load();
      else stopCaptainWatcher("background");
    });
    return () => subscription.remove();
  }, []);

  const projection = useMemo(() => projectCaptainOperationalState(captainAccess, workState), [captainAccess, workState]);
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
  const watcherShouldRun = operationalLocationRequired && isForeground && !locationAutoBlocked;

  useEffect(() => {
    latestWorkStateRef.current = workState;
    latestProjectionRef.current = projection;
  }, [projection, workState]);

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
      const updated = await captainAccessApi.updateAvailability({ ...location });
      lastUploadedLocationRef.current = { location, uploadedAt: now };
      failureCountRef.current = 0;
      backoffUntilRef.current = 0;
      setDeviceLocation({ location, seenAt: new Date(now).toISOString() });
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
        setError(friendlyError(e));
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
    if (!latestWorkStateRef.current) return;
    try {
      const currentLocation = await requestCaptainForegroundLocation(strongLocationAccuracy);
      setLocationAutoBlocked(false);
      await uploadCaptainLocation(currentLocation, { force: options.force ?? true, manual: !options.silent });
    } catch (e) {
      setLocationAutoBlocked(true);
      if (!options.silent) {
        setError(friendlyError(e));
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
      watchCaptainForegroundLocation((location) => {
        void uploadCaptainLocation(location, { manual: false });
      }, strongLocationAccuracy)
        .then((subscription) => {
          if (cancelled || !mountedRef.current) {
            subscription.remove();
            return;
          }
          watcherRef.current = subscription;
          console.log("captain_gps_watcher_started");
        })
        .catch((e) => {
          setLocationAutoBlocked(true);
          setError(friendlyError(e));
          console.log(`captain_gps_watcher_unavailable reason=${e instanceof Error ? e.message : "unknown"}`);
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
    if (!workState || !projection.delivery.active) return;
    try {
      const next = !workState.desiredDeliveryOnline;
      const currentLocation = next ? await requestCaptainForegroundLocation(strongLocationAccuracy) : null;
      const updated = await captainAccessApi.updateAvailability({
        deliveryOnline: next,
        ...(currentLocation ? currentLocation : {})
      });
      if (currentLocation) {
        lastUploadedLocationRef.current = { location: currentLocation, uploadedAt: Date.now() };
        setDeviceLocation({ location: currentLocation, seenAt: new Date().toISOString() });
        setLocationAutoBlocked(false);
      }
      setWorkState(updated);
      setProfile(projection.delivery.active ? await riderApi.profile().catch(() => null) : null);
      setMessage(next ? "Delivery availability is online." : "Delivery availability is offline.");
      setError("");
    } catch (e) {
      setError(friendlyError(e));
      setMessage("");
    }
  }

  async function toggleRide() {
    if (!workState || !projection.ride.active) return;
    try {
      const next = !workState.desiredRideOnline;
      const currentLocation = next ? await requestCaptainForegroundLocation(strongLocationAccuracy) : null;
      const updated = await captainAccessApi.updateAvailability({
        rideOnline: next,
        ...(currentLocation ? currentLocation : {})
      });
      if (currentLocation) {
        lastUploadedLocationRef.current = { location: currentLocation, uploadedAt: Date.now() };
        setDeviceLocation({ location: currentLocation, seenAt: new Date().toISOString() });
        setLocationAutoBlocked(false);
      }
      setWorkState(updated);
      setMessage(next ? "Ride availability is online." : "Ride availability is offline.");
      setError("");
    } catch (e) {
      setError(friendlyError(e));
      setMessage("");
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
  const canToggleDelivery = !!workState && canToggle && projection.delivery.active && deliveryLaunch?.available !== false && (workState.deliveryEligibility.eligible || deliveryCanRefreshStaleLocation);
  const canToggleRide = !!workState && canToggle && projection.ride.active && rideLaunch?.available !== false && (workState.rideEligibility.eligible || rideCanRefreshStaleLocation);
  const activeWork = activeWorkTitle(workState);

  if (loading && !captainAccess) {
    return <Protected><Loading label="Preparing your KariGO Captain access..." /></Protected>;
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
      {rideLaunch?.available && rideLaunch.launchStage === "OPERATIONS_ONLY" ? <Message>Your Ride Captain access is approved for scheduled controlled production operations. Go online only during the communicated operating window.</Message> : null}
      {deliveryLaunch?.available && deliveryLaunch.launchStage === "OPERATIONS_ONLY" ? <Message>Your Delivery Captain access is approved for scheduled controlled production operations. Go online only during the communicated operating window.</Message> : null}
      {deliveryLaunch && !deliveryLaunch.available && projection.delivery.active ? <Message>{deliveryLaunch.message} Your online preference is preserved; existing assignments remain available.</Message> : null}
      {rideLaunch && !rideLaunch.available && projection.ride.active ? <Message>{rideLaunch.message} Your online preference is preserved; existing assignments remain available.</Message> : null}

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
              <Text style={ui.muted}>Enable location permission and refresh GPS to show your live Captain position.</Text>
              <Text style={ui.muted}>Current operating area: {mapState.area}</Text>
            </View>
          </View>}
          <Button title={locationUpdating ? "Updating GPS..." : "Refresh GPS"} tone="muted" disabled={!workState || locationUpdating} onPress={() => void refreshGps()} />
        </Card>

        <Card>
          <Text style={ui.title}>Availability</Text>
          <Text style={ui.muted}>
            {workState?.activeWorkMode
              ? `Availability is paused while your ${workState.activeWorkMode === "DELIVERY" ? "Delivery assignment" : "Ride assignment"} is active.`
              : "Choose where you want to work today."}
          </Text>
          <View style={styles.modeRow}>
            <View style={styles.modeCopy}>
              <Text style={styles.modeTitle}>Delivery</Text>
              <Text style={[styles.modeBadge, modeStatusStyle(modeStatus(workState, "DELIVERY", projection.delivery))]}>{modeStatus(workState, "DELIVERY", projection.delivery)}</Text>
              {!projection.delivery.eligible ? <Text style={styles.reason}>{projection.delivery.eligibilityReason ?? "Delivery Captain activation is pending."}</Text> : null}
            </View>
            <Button title={workState?.desiredDeliveryOnline ? "Go offline" : "Go online"} disabled={!canToggleDelivery} onPress={toggleDelivery} />
          </View>
          <View style={styles.modeRow}>
            <View style={styles.modeCopy}>
              <Text style={styles.modeTitle}>Ride</Text>
              <Text style={[styles.modeBadge, modeStatusStyle(modeStatus(workState, "RIDE", projection.ride))]}>{modeStatus(workState, "RIDE", projection.ride)}</Text>
              {!projection.ride.eligible ? <Text style={styles.reason}>{projection.ride.eligibilityReason ?? "Ride Captain activation is pending."}</Text> : null}
            </View>
            <Button title={workState?.desiredRideOnline ? "Go offline" : "Go online"} disabled={!canToggleRide} onPress={toggleRide} />
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
  mapShell: { borderColor: brand.colors.border, borderRadius: 18, borderWidth: 1, minHeight: 260, overflow: "hidden" },
  map: { height: 260, width: "100%" },
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
  applicationLine: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }
});
