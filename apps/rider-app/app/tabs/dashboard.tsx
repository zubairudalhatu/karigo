import { Image, StyleSheet, Text, View } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { brand } from "@karigo/config";
import { riderApi, RiderProfile } from "../../src/api/rider.api";
import { jobsApi, RiderJob } from "../../src/api/jobs.api";
import { notificationsApi } from "../../src/api/notifications.api";
import { Button, Card, Message, NavLink, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";
import { requestCaptainForegroundLocation } from "../../src/lib/location";

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

function availabilityLabel(profile?: RiderProfile | null) {
  if (!profile) return "Unavailable";
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

function statusChipStyle(profile?: RiderProfile | null) {
  if (profile?.availabilityStatus === "ONLINE") return [styles.statusChip, styles.statusChipOnline];
  if (profile?.availabilityStatus === "BUSY") return [styles.statusChip, styles.statusChipBusy];
  return [styles.statusChip, styles.statusChipOffline];
}

export default function RiderDashboard() {
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [jobs, setJobs] = useState<RiderJob[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [p, j, n] = await Promise.all([riderApi.profile(), jobsApi.list(), notificationsApi.unreadCount()]);
      setProfile(p);
      setJobs(j);
      setUnread(n.count);
      setError("");
    } catch (e) {
      setError(friendlyError(e));
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
    if (!profile) return;
    try {
      const next = profile.availabilityStatus === "ONLINE" ? "OFFLINE" : "ONLINE";
      let currentLocation: Awaited<ReturnType<typeof requestCaptainForegroundLocation>> | null = null;
      if (next === "ONLINE") {
        currentLocation = await requestCaptainForegroundLocation();
      }
      const updated = await riderApi.updateAvailability(next);
      setProfile(updated);
      if (next === "ONLINE" && currentLocation) {
        const located = await riderApi.updateLocation(currentLocation.latitude, currentLocation.longitude);
        setProfile(located);
        setMessage("You are online and your live location has been shared with KariGO Dispatch.");
      } else {
        setMessage("You are offline. KariGO will not update your live location.");
      }
      setError("");
    } catch (e) {
      setError(friendlyError(e));
      setMessage("");
    }
  }

  const canToggle = !!profile && profile.verificationStatus === "ACTIVE" && profile.availabilityStatus !== "BUSY";

  return (
    <Protected><Screen refreshing={loading} onRefresh={load}>
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <Image source={require("../../assets/karigo-logo.png")} style={styles.logo} resizeMode="contain" />
          <View style={statusChipStyle(profile)}><Text style={styles.statusChipText}>{availabilityLabel(profile)}</Text></View>
        </View>
        <Text style={styles.kicker}>KariGO Captain</Text>
        <Text style={styles.title}>Hi, {firstName(profile?.user?.fullName)}</Text>
        <Text style={styles.heroCopy}>Manage your delivery assignments and availability.</Text>
      </View>
      <Message>{message}</Message>
      <Message error>{error}</Message>

      <Card>
        <Text style={ui.title}>Availability</Text>
        <Text style={ui.muted}>{availabilityCopy(profile)}</Text>
        <Text style={ui.muted}>Location is requested only when you go online or while you are on an active delivery.</Text>
        <Button title={profile?.availabilityStatus === "ONLINE" ? "Go offline" : "Go online"} disabled={!canToggle} onPress={toggle} />
      </Card>

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
  statusChipText: { color: brand.colors.charcoal, fontSize: 12, fontWeight: "900" },
  metric: { color: brand.colors.charcoal, fontSize: 28, fontWeight: "800" },
  summaryGrid: { flexDirection: "row", gap: 12 },
  jobRef: { color: brand.colors.charcoal, fontSize: 16, fontWeight: "800" }
});
