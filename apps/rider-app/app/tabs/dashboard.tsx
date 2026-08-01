import { Image, StyleSheet, Text, View } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { brand } from "@karigo/config";
import { CaptainAccess, CaptainWorkState, captainAccessApi } from "../../src/api/captain-access.api";
import { riderApi, RiderProfile } from "../../src/api/rider.api";
import { jobsApi, RiderJob } from "../../src/api/jobs.api";
import { notificationsApi } from "../../src/api/notifications.api";
import { Button, Card, Loading, Message, NavLink, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { useAuth } from "../../src/contexts/auth-context";
import { friendlyError } from "../../src/lib/errors";
import { requestCaptainForegroundLocation } from "../../src/lib/location";
import {
  applicantReviewCopy,
  captainHeroStatus,
  classifyCaptainApplication,
  hasSubmittedCaptainApplication
} from "../../src/lib/captain-application-status";

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

function availabilityLabel(access?: CaptainAccess | null, profile?: RiderProfile | null) {
  if (!profile) return captainHeroStatus(access, null);
  if (profile.verificationStatus !== "ACTIVE") return "Unavailable";
  if (profile.availabilityStatus === "BUSY") return "On delivery";
  if (profile.availabilityStatus === "ONLINE") return "Online";
  if (profile.availabilityStatus === "OFFLINE") return "Offline";
  return "Unavailable";
}

function availabilityCopy(profile?: RiderProfile | null) {
  if (!profile) return "Loading Captain status...";
  if (profile.verificationStatus !== "ACTIVE") return "Only active approved Delivery Captains can go online for delivery assignments.";
  if (profile.availabilityStatus === "BUSY") return "You are currently assigned to an active delivery. Finish it before changing availability.";
  if (profile.availabilityStatus === "ONLINE") return "You are ready for KariGO delivery assignments.";
  return "Go online when dispatch is ready to assign you a delivery.";
}

function statusChipStyle(profile?: RiderProfile | null, access?: CaptainAccess | null) {
  if (profile?.availabilityStatus === "ONLINE") return [styles.statusChip, styles.statusChipOnline];
  if (profile?.availabilityStatus === "BUSY") return [styles.statusChip, styles.statusChipBusy];
  if (!profile && (hasSubmittedCaptainApplication(access?.deliveryCaptainApplication) || hasSubmittedCaptainApplication(access?.rideCaptainApplication))) return [styles.statusChip, styles.statusChipReview];
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
  if (category === "PROVISIONALLY_APPROVED") return "View approval progress";
  if (category === "APPROVED" || category === "ACTIVATION_PENDING") return "View activation status";
  return "View application status";
}

function modeStatus(workState: CaptainWorkState | null, mode: "DELIVERY" | "RIDE") {
  if (!workState) return "Checking";
  if (workState.activeWorkMode === mode) return "Busy";
  if (workState.activeWorkMode && workState.activeWorkMode !== mode) return "Paused";
  const effective = mode === "DELIVERY" ? workState.effectiveDeliveryOnline : workState.effectiveRideOnline;
  const desired = mode === "DELIVERY" ? workState.desiredDeliveryOnline : workState.desiredRideOnline;
  if (effective) return "Online";
  if (desired) return "Pending";
  return "Offline";
}

function overallAvailability(workState: CaptainWorkState | null) {
  if (!workState) return "Checking availability";
  if (workState.activeWorkMode === "DELIVERY") return "Busy with Delivery";
  if (workState.activeWorkMode === "RIDE") return "Busy with Ride";
  if (workState.effectiveDeliveryOnline && workState.effectiveRideOnline) return "Online for Delivery and Ride";
  if (workState.effectiveDeliveryOnline) return "Online for Delivery";
  if (workState.effectiveRideOnline) return "Online for Ride";
  return "Offline";
}

export default function RiderDashboard() {
  const { user } = useAuth();
  const [captainAccess, setCaptainAccess] = useState<CaptainAccess | null>(null);
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [jobs, setJobs] = useState<RiderJob[]>([]);
  const [workState, setWorkState] = useState<CaptainWorkState | null>(null);
  const [unread, setUnread] = useState(0);
  const [onboardingStatus, setOnboardingStatus] = useState<CaptainAccess["deliveryCaptainApplication"] | null>(null);
  const [rideOnboardingStatus, setRideOnboardingStatus] = useState<CaptainAccess["rideCaptainApplication"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [access, state] = await Promise.all([
        captainAccessApi.resolve(),
        captainAccessApi.workState().catch(() => null)
      ]);
      setCaptainAccess(access);
      setWorkState(state);
      setOnboardingStatus(access.deliveryCaptainApplication);
      setRideOnboardingStatus(access.rideCaptainApplication);

      if (!access.operationalModes.includes("DELIVERY_CAPTAIN")) {
        setProfile(null);
        setJobs([]);
        setUnread(0);
        setError("");
        return;
      }

      const [p, j, n] = await Promise.all([riderApi.profile(), jobsApi.list(), notificationsApi.unreadCount()]);
      setProfile(p);
      setJobs(j);
      setUnread(n.count);
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

  useEffect(() => { void load(); }, []);

  const todayJobs = useMemo(() => {
    const today = new Date().toDateString();
    return jobs.filter((job) => new Date(job.updatedAt ?? job.createdAt).toDateString() === today);
  }, [jobs]);
  const activeJob = useMemo(() => jobs.find((job) => ACTIVE_DELIVERY_STATUSES.has(job.orderStatus)), [jobs]);

  async function toggle() {
    if (!profile || !workState) return;
    try {
      const next = !workState.desiredDeliveryOnline;
      let currentLocation: Awaited<ReturnType<typeof requestCaptainForegroundLocation>> | null = null;
      if (next) {
        currentLocation = await requestCaptainForegroundLocation();
      }
      const updated = await captainAccessApi.updateAvailability({
        deliveryOnline: next,
        ...(currentLocation ? currentLocation : {})
      });
      setWorkState(updated);
      setProfile(await riderApi.profile());
      setMessage(next
        ? "Delivery availability is online. KariGO Dispatch can offer delivery assignments."
        : "Delivery availability is offline.");
      setError("");
    } catch (e) {
      setError(friendlyError(e));
      setMessage("");
    }
  }

  async function toggleRide() {
    if (!workState) return;
    try {
      const next = !workState.desiredRideOnline;
      const currentLocation = next ? await requestCaptainForegroundLocation() : null;
      const updated = await captainAccessApi.updateAvailability({
        rideOnline: next,
        ...(currentLocation ? currentLocation : {})
      });
      setWorkState(updated);
      setMessage(next
        ? "Ride availability is online. KariGO Operations can assign Ride requests."
        : "Ride availability is offline.");
      setError("");
    } catch (e) {
      setError(friendlyError(e));
      setMessage("");
    }
  }

  const deliveryApplicationExists = hasDeliveryApplication(onboardingStatus);
  const rideApplicationExists = hasRideApplication(rideOnboardingStatus);
  const onboardingCopy = deliveryApplicationExists
    ? applicantReviewCopy(onboardingStatus, "DELIVERY_CAPTAIN")
    : onboardingStatus?.message;
  const rideOnboardingCopy = rideApplicationExists
    ? applicantReviewCopy(rideOnboardingStatus, "RIDE_CAPTAIN")
    : rideOnboardingStatus?.message;
  const hasAnyApplication = deliveryApplicationExists || rideApplicationExists;
  const hasDeliveryAccess = captainAccess?.operationalModes.includes("DELIVERY_CAPTAIN");
  const hasRideAccess = captainAccess?.operationalModes.includes("RIDE_CAPTAIN");
  const canToggle = !!workState && !workState.activeWorkMode;
  const canToggleDelivery = !!workState && canToggle && !!profile && workState.deliveryEligibility.eligible;
  const canToggleRide = !!workState && canToggle && !!hasRideAccess && workState.rideEligibility.eligible;

  if (loading && !captainAccess) {
    return <Protected><Loading label="Preparing your KariGO Captain access..." /></Protected>;
  }

  return (
    <Protected><Screen refreshing={loading} onRefresh={load}>
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <Image source={require("../../assets/karigo-logo.png")} style={styles.logo} resizeMode="contain" />
          <View style={statusChipStyle(profile, captainAccess)}><Text style={styles.statusChipText}>{workState ? overallAvailability(workState) : availabilityLabel(captainAccess, profile)}</Text></View>
        </View>
        <Text style={styles.kicker}>KariGO Captain</Text>
        <Text style={styles.title}>Hi, {firstName(profile?.user?.fullName ?? captainAccess?.account.fullName ?? user?.fullName)}</Text>
        <Text style={styles.heroCopy}>{hasDeliveryAccess ? "Manage your delivery assignments and availability." : "Track your Captain onboarding and approved access."}</Text>
      </View>
      <Message>{message}</Message>
      <Message error>{error}</Message>

      {!hasDeliveryAccess && deliveryApplicationExists ? <Card>
        <Text style={ui.title}>Captain onboarding</Text>
        <StatusBadge status={onboardingStatus.status} />
        <Text style={ui.muted}>{onboardingCopy}</Text>
        <Text style={ui.muted}>Captain operations will be available after KariGO approves your application.</Text>
        <NavLink href="/application-status" label={applicationActionLabel(onboardingStatus)} />
      </Card> : null}

      {!hasRideAccess && rideApplicationExists ? <Card>
        <Text style={ui.title}>Ride Captain onboarding</Text>
        <StatusBadge status={rideOnboardingStatus.status} />
        <Text style={ui.muted}>{rideOnboardingCopy}</Text>
        <Text style={ui.muted}>Ride operations are activated by KariGO Operations after approval.</Text>
        <NavLink href="/application-status" label={applicationActionLabel(rideOnboardingStatus)} />
      </Card> : null}

      {hasRideAccess ? <Card>
        <Text style={ui.title}>Ride operations</Text>
        <Text style={ui.muted}>Your KariGO Ride Captain access is active.</Text>
        <NavLink href="/taxi-readiness" label="Open Ride operations" />
      </Card> : null}

      {workState ? <Card>
        <Text style={ui.title}>Availability</Text>
        <Text style={ui.muted}>
          {workState.activeWorkMode
            ? `${workState.activeWorkMode === "DELIVERY" ? "Ride" : "Delivery"} assignments are paused while your active ${workState.activeWorkMode === "DELIVERY" ? "Delivery assignment" : "Ride"} is open.`
            : "Choose Delivery, Ride, or both. KariGO pauses the other service automatically when one assignment is active."}
        </Text>
        <View style={styles.modeRow}>
          <View style={styles.modeCopy}>
            <Text style={styles.modeTitle}>Delivery</Text>
            <Text style={ui.muted}>{modeStatus(workState, "DELIVERY")}</Text>
            {!workState.deliveryEligibility.eligible ? <Text style={styles.reason}>{workState.deliveryEligibility.reason}</Text> : null}
          </View>
          <Button title={workState.desiredDeliveryOnline ? "Go offline" : "Go online"} disabled={!canToggleDelivery} onPress={toggle} />
        </View>
        <View style={styles.modeRow}>
          <View style={styles.modeCopy}>
            <Text style={styles.modeTitle}>Ride</Text>
            <Text style={ui.muted}>{modeStatus(workState, "RIDE")}</Text>
            {!workState.rideEligibility.eligible ? <Text style={styles.reason}>{workState.rideEligibility.reason}</Text> : null}
          </View>
          <Button title={workState.desiredRideOnline ? "Go offline" : "Go online"} disabled={!canToggleRide} onPress={toggleRide} />
        </View>
        {workState.lastLocationAt ? <Text style={ui.muted}>Last location update: {new Date(workState.lastLocationAt).toLocaleString()}</Text> : <Text style={ui.muted}>Location is requested when you go online.</Text>}
      </Card> : null}

      {!profile && !hasAnyApplication ? <Card>
        <Text style={ui.title}>Start Captain onboarding</Text>
        <Text style={ui.muted}>Use your existing KariGO account to apply as a Delivery Captain, Ride Captain, or both.</Text>
        <NavLink href="/auth/apply" label="Start Captain application" />
      </Card> : null}

      {profile ? <>
      <View style={styles.summaryGrid}>
        <Card><Text style={ui.muted}>Today</Text><Text style={styles.metric}>{todayJobs.length}</Text><Text style={ui.muted}>assigned deliveries</Text></Card>
        <Card><Text style={ui.muted}>Completed</Text><Text style={styles.metric}>{profile?.totalDeliveries ?? 0}</Text><Text style={ui.muted}>deliveries</Text></Card>
      </View>

      <Card>
        <Text style={ui.title}>Active delivery</Text>
        {activeJob ? <>
          <Text style={styles.jobRef}>{activeJob.orderNumber}</Text>
          <StatusBadge status={activeJob.orderStatus} />
          <NavLink href={`/jobs/${activeJob.id}`} label="Open active delivery" />
        </> : <Text style={ui.muted}>No active delivery right now. Stay available when dispatch is ready.</Text>}
      </Card>

      <Card>
        <Text style={ui.title}>Assigned deliveries</Text>
        <Text style={styles.metric}>{jobs.length}</Text>
        <NavLink href="/jobs" label="View assigned deliveries" />
      </Card>

      <Card>
        <Text style={ui.title}>Notifications</Text>
        <Text style={ui.muted}>{unread ? `${unread} unread update${unread === 1 ? "" : "s"}.` : "No unread updates."}</Text>
        <NavLink href="/notifications" label="Open notifications" />
      </Card>
      </> : null}
    </Screen></Protected>
  );
}

const styles = StyleSheet.create({
  heroCard: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 24, borderWidth: 1, gap: 10, overflow: "hidden", padding: 18 },
  heroTopRow: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  kicker: { color: brand.colors.primary, fontSize: 12, fontWeight: "900", letterSpacing: 1.4, textTransform: "uppercase" },
  title: { color: brand.colors.charcoal, fontSize: 28, fontWeight: "900", letterSpacing: -0.4 },
  heroCopy: { color: brand.colors.charcoal, fontSize: 16, fontWeight: "800", lineHeight: 22 },
  logo: { flexShrink: 1, height: 38, maxWidth: 150, width: 128 },
  statusChip: { borderRadius: 999, flexShrink: 1, paddingHorizontal: 12, paddingVertical: 7 },
  statusChipBusy: { backgroundColor: "#FFF7ED" },
  statusChipOffline: { backgroundColor: "#F3F4F6" },
  statusChipOnline: { backgroundColor: "#DCFCE7" },
  statusChipReview: { backgroundColor: "#DBEAFE" },
  statusChipText: { color: brand.colors.charcoal, fontSize: 12, fontWeight: "900" },
  metric: { color: brand.colors.charcoal, fontSize: 28, fontWeight: "800" },
  modeCopy: { flex: 1, gap: 4 },
  modeRow: { alignItems: "center", borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 12, justifyContent: "space-between", padding: 12 },
  modeTitle: { color: brand.colors.charcoal, fontSize: 16, fontWeight: "900" },
  reason: { color: brand.colors.muted, fontSize: 12, fontWeight: "700" },
  summaryGrid: { flexDirection: "row", gap: 12 },
  jobRef: { color: brand.colors.charcoal, fontSize: 16, fontWeight: "800" }
});
