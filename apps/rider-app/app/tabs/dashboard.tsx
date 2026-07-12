import { Image, StyleSheet, Text, View } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { brand } from "@karigo/config";
import { riderApi, RiderProfile } from "../../src/api/rider.api";
import { jobsApi, RiderJob } from "../../src/api/jobs.api";
import { notificationsApi } from "../../src/api/notifications.api";
import { Button, Card, Message, NavLink, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";

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
  if (!name) return "Rider";
  return name.split(/\s+/)[0] || "Rider";
}

function availabilityLabel(profile?: RiderProfile | null) {
  if (!profile) return "Unavailable";
  if (profile.verificationStatus !== "ACTIVE") return "Unavailable";
  if (profile.availabilityStatus === "BUSY") return "On delivery";
  if (profile.availabilityStatus === "ONLINE") return "Available";
  if (profile.availabilityStatus === "OFFLINE") return "Offline";
  return "Unavailable";
}

function availabilityCopy(profile?: RiderProfile | null) {
  if (!profile) return "Loading rider status...";
  if (profile.verificationStatus !== "ACTIVE") return "Only active approved riders can go online for delivery assignments.";
  if (profile.availabilityStatus === "BUSY") return "You are currently assigned to an active delivery. Finish it before changing availability.";
  if (profile.availabilityStatus === "ONLINE") return "You are available for KariGO delivery assignments.";
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
      <Card tone="soft">
        <View style={ui.spaceBetween}>
          <Image source={require("../../assets/karigo-logo.png")} style={styles.logo} resizeMode="contain" />
          <StatusBadge status={availabilityLabel(profile)} />
        </View>
        <Text style={styles.title}>Hi, {firstName(profile?.user?.fullName)}</Text>
        <Text style={ui.pageIntro}>Manage delivery assignments, availability and handoff progress from one place.</Text>
      </Card>
      <Message error>{error}</Message>

      <Card>
        <Text style={ui.title}>Rider availability</Text>
        <Text style={ui.muted}>{availabilityCopy(profile)}</Text>
        <Button title={profile?.availabilityStatus === "ONLINE" ? "Go offline" : "Go online"} disabled={!canToggle} onPress={toggle} />
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
      <Card><Text style={ui.title}>Taxi Driver Readiness</Text><Text style={ui.muted}>Taxi is not live yet. Apply for readiness review while KariGO prepares verified driver onboarding and vehicle checks.</Text><NavLink href="/taxi-readiness" label="Apply for Taxi Readiness" /></Card>
      <Card><Text style={ui.title}>Support and help</Text><Text style={ui.muted}>For staging incidents, contact the KariGO operations or dispatch lead through the approved pilot support channel.</Text></Card>
      <Card><Text style={ui.title}>Staging safety note</Text><Text style={ui.muted}>Mock providers remain active. Live payouts, withdrawals, live taxi booking and live payment collection are disabled.</Text></Card>
      <Card><Text style={ui.title}>Quick links</Text><NavLink href="/earnings" label="Earnings" /><NavLink href="/notifications" label={`Notifications (${unread} unread)`} /><NavLink href="/profile" label="Profile and location" /></Card>
    </Screen></Protected>
  );
}

const styles = StyleSheet.create({
  title: { color: brand.colors.charcoal, fontSize: 25, fontWeight: "800" },
  logo: { height: 34, width: 102 },
  metric: { color: brand.colors.charcoal, fontSize: 28, fontWeight: "800" },
  summaryGrid: { gap: 12 },
  jobRef: { color: brand.colors.charcoal, fontSize: 16, fontWeight: "800" }
});
