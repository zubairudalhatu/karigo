import { Image, StyleSheet, Text, View } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { brand } from "@karigo/config";
import { riderApi, RiderProfile } from "../../src/api/rider.api";
import { jobsApi, RiderJob } from "../../src/api/jobs.api";
import { notificationsApi } from "../../src/api/notifications.api";
import { Button, Card, Message, NavLink, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";
import { captainModes } from "../../src/lib/captain-modes";

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
  if (profile.availabilityStatus === "ONLINE") return "You are online and ready for KariGO delivery assignments.";
  return "Go online when dispatch is ready to assign you a delivery.";
}

export default function RiderDashboard() {
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [jobs, setJobs] = useState<RiderJob[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
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
  const modes = useMemo(() => captainModes(profile), [profile]);

  async function toggle() {
    if (!profile) return;
    try {
      const next = profile.availabilityStatus === "ONLINE" ? "OFFLINE" : "ONLINE";
      setProfile(await riderApi.updateAvailability(next));
      setError("");
    } catch (e) { setError(friendlyError(e)); }
  }

  const canToggle = !!profile && profile.verificationStatus === "ACTIVE" && profile.availabilityStatus !== "BUSY";

  return (
    <Protected><Screen refreshing={loading} onRefresh={load}>
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <Image source={require("../../assets/karigo-logo.png")} style={styles.logo} resizeMode="contain" />
          <View style={styles.statusChip}><Text style={styles.statusChipText}>{availabilityLabel(profile)}</Text></View>
        </View>
        <Text style={styles.kicker}>KariGO Captain</Text>
        <Text style={styles.title}>Hi, {firstName(profile?.user?.fullName)}</Text>
        <Text style={styles.heroCopy}>Manage your delivery assignments and availability.</Text>
        <Text style={styles.heroSubcopy}>Delivery Captain operations are active for approved pilot Captains. Ride Captain readiness stays gated until KariGO Rides is approved.</Text>
      </View>
      <Message error>{error}</Message>

      <Card>
        <View style={ui.spaceBetween}>
          <Text style={ui.title}>Delivery Captain availability</Text>
          <StatusBadge status={availabilityLabel(profile)} />
        </View>
        <Text style={ui.muted}>{availabilityCopy(profile)}</Text>
        <Button title={profile?.availabilityStatus === "ONLINE" ? "Go offline" : "Go online"} disabled={!canToggle} onPress={toggle} />
      </Card>

      <Card>
        <Text style={ui.title}>Captain modes</Text>
        {modes.map((mode) => <View key={mode.key} style={styles.modeCard}>
          <View style={ui.spaceBetween}>
            <Text style={ui.sectionTitle}>{mode.label}</Text>
            <StatusBadge status={mode.badge} />
          </View>
          <Text style={ui.muted}>{mode.description}</Text>
          {mode.href && mode.ctaLabel ? <NavLink href={mode.href} label={mode.ctaLabel} /> : null}
        </View>)}
      </Card>

      <View style={styles.summaryGrid}>
        <Card><Text style={ui.muted}>Today's assigned deliveries</Text><Text style={styles.metric}>{todayJobs.length}</Text></Card>
        <Card><Text style={ui.muted}>Completed deliveries</Text><Text style={styles.metric}>{profile?.totalDeliveries ?? 0}</Text></Card>
      </View>

      <Card>
        <Text style={ui.title}>Active delivery</Text>
        {activeJob ? <>
          <Text style={styles.jobRef}>{activeJob.orderNumber}</Text>
          <StatusBadge status={activeJob.orderStatus} />
          <NavLink href={`/jobs/${activeJob.id}`} label="Open active job" />
        </> : <Text style={ui.muted}>No active delivery right now. Stay available when dispatch is ready.</Text>}
      </Card>

      <Card><Text style={ui.title}>Assigned jobs</Text><Text style={styles.metric}>{jobs.length}</Text><NavLink href="/jobs" label="View assigned jobs" /></Card>
      <Card><Text style={ui.title}>Ride readiness</Text><Text style={ui.muted}>KariGO Rides is not live yet. Apply for readiness review while KariGO prepares approved Ride Captain onboarding and vehicle checks.</Text><NavLink href="/taxi-readiness" label="Apply for Ride readiness" /></Card>
      <Card><Text style={ui.title}>Support and help</Text><Text style={ui.muted}>For staging incidents, contact the KariGO operations or dispatch lead through the approved pilot support channel.</Text></Card>
      <Card><Text style={ui.title}>Staging safety note</Text><Text style={ui.muted}>Mock providers remain active. Live payouts, withdrawals, live ride booking and live payment collection are disabled.</Text></Card>
      <Card>
        <Text style={ui.title}>Captain tools</Text>
        <View style={styles.toolGrid}>
          <View style={styles.toolCard}><Text style={styles.toolTitle}>Delivery availability</Text><Text style={ui.muted}>Switch online or offline when dispatch is ready.</Text></View>
          <View style={styles.toolCard}><Text style={styles.toolTitle}>Assigned deliveries</Text><NavLink href="/jobs" label="Open deliveries" /></View>
          <View style={styles.toolCard}><Text style={styles.toolTitle}>Earnings</Text><NavLink href="/earnings" label="View earnings" /></View>
          <View style={styles.toolCard}><Text style={styles.toolTitle}>Profile and vehicle</Text><NavLink href="/profile" label="Update profile" /></View>
          <View style={styles.toolCard}><Text style={styles.toolTitle}>Support</Text><Text style={ui.muted}>Use approved pilot support channels.</Text></View>
          <View style={styles.toolCard}><Text style={styles.toolTitle}>Ride Captain readiness</Text><NavLink href="/taxi-readiness" label="Readiness only" /></View>
        </View>
        <NavLink href="/notifications" label={`Notifications (${unread} unread)`} />
      </Card>
    </Screen></Protected>
  );
}

const styles = StyleSheet.create({
  heroCard: { backgroundColor: brand.colors.charcoal, borderRadius: 24, gap: 10, overflow: "hidden", padding: 18 },
  heroTopRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  kicker: { color: brand.colors.primary, fontSize: 12, fontWeight: "900", letterSpacing: 1.4, textTransform: "uppercase" },
  title: { color: brand.colors.white, fontSize: 28, fontWeight: "900", letterSpacing: -0.4 },
  heroCopy: { color: brand.colors.white, fontSize: 16, fontWeight: "800", lineHeight: 22 },
  heroSubcopy: { color: "#E5E7EB", lineHeight: 20 },
  logo: { height: 38, width: 128 },
  statusChip: { backgroundColor: brand.colors.white, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  statusChipText: { color: brand.colors.charcoal, fontSize: 12, fontWeight: "900" },
  metric: { color: brand.colors.charcoal, fontSize: 28, fontWeight: "800" },
  summaryGrid: { gap: 12 },
  jobRef: { color: brand.colors.charcoal, fontSize: 16, fontWeight: "800" },
  modeCard: { borderTopColor: brand.colors.border, borderTopWidth: 1, gap: 8, paddingTop: 12 },
  toolGrid: { gap: 10 },
  toolCard: { backgroundColor: "#F9FAFB", borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, gap: 4, padding: 12 },
  toolTitle: { color: brand.colors.charcoal, fontWeight: "900" }
});
