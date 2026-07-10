import { StyleSheet, Text } from "react-native";
import { useEffect, useState } from "react";
import { brand } from "@karigo/config";
import { riderApi, RiderProfile } from "../../src/api/rider.api";
import { jobsApi, RiderJob } from "../../src/api/jobs.api";
import { notificationsApi } from "../../src/api/notifications.api";
import { BrandHeader, Button, Card, Message, NavLink, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";

export default function RiderDashboard() {
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [jobs, setJobs] = useState<RiderJob[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");
  const load = () => Promise.all([riderApi.profile(), jobsApi.list(), notificationsApi.unreadCount()])
    .then(([p, j, n]) => { setProfile(p); setJobs(j); setUnread(n.count); })
    .catch((e) => setError(friendlyError(e)));
  useEffect(() => { void load(); }, []);

  async function toggle() {
    if (!profile) return;
    try {
      const next = profile.availabilityStatus === "ONLINE" ? "OFFLINE" : "ONLINE";
      setProfile(await riderApi.updateAvailability(next));
      setError("");
    } catch (e) { setError(friendlyError(e)); }
  }

  return (
    <Protected><Screen>
      <BrandHeader />
      <Text style={styles.title}>Ready for delivery jobs?</Text>
      <Message error>{error}</Message>
      <Card>{profile ? <StatusBadge status={profile.availabilityStatus} /> : <Text style={ui.muted}>Loading status...</Text>}<Text style={ui.muted}>Approved riders can go online to receive assignments.</Text><Button title={profile?.availabilityStatus === "ONLINE" ? "Go offline" : "Go online"} disabled={!profile || profile.availabilityStatus === "BUSY"} onPress={toggle} /></Card>
      <Card><Text style={ui.title}>Assigned jobs</Text><Text style={styles.metric}>{jobs.length}</Text><NavLink href="/jobs" label="View delivery jobs" /></Card>
      <Card><Text style={ui.title}>Taxi Driver Readiness</Text><Text style={ui.muted}>Taxi is not live yet. Apply for readiness review while KariGO prepares verified driver onboarding and vehicle checks.</Text><NavLink href="/taxi-readiness" label="Apply for Taxi Readiness" /></Card>
      <Card><Text style={ui.title}>Quick links</Text><NavLink href="/earnings" label="Earnings" /><NavLink href="/notifications" label={`Notifications (${unread} unread)`} /><NavLink href="/profile" label="Profile and location" /></Card>
    </Screen></Protected>
  );
}

const styles = StyleSheet.create({
  title: { color: brand.colors.charcoal, fontSize: 25, fontWeight: "800" },
  metric: { color: brand.colors.charcoal, fontSize: 28, fontWeight: "800" }
});
