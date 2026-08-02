import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { brand } from "@karigo/config";
import { captainAccessApi } from "../../src/api/captain-access.api";
import { jobsApi, RiderJob } from "../../src/api/jobs.api";
import { riderApi, RiderProfile } from "../../src/api/rider.api";
import { Card, Empty, Message, NavLink, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { friendlyError, money } from "../../src/lib/errors";
import type { CaptainAccess } from "../../src/api/captain-access.api";
import { projectCaptainOperationalState } from "../../src/lib/captain-operational-state";

export default function Jobs() {
  const [jobs, setJobs] = useState<RiderJob[]>([]);
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [access, setAccess] = useState<CaptainAccess | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const access = await captainAccessApi.resolve();
      setAccess(access);
      const projection = projectCaptainOperationalState(access);
      if (!projection.hasActiveDeliveryMode) {
        setJobs([]);
        setProfile(null);
        setError("");
        return;
      }
      const [items, deliveryProfile] = await Promise.all([jobsApi.list(), riderApi.profile().catch(() => null)]);
      setJobs(items);
      setProfile(deliveryProfile);
      setError("");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const projection = projectCaptainOperationalState(access);
  const deliveryAccessReady = projection.hasActiveDeliveryMode;
  const activeJob = useMemo(() => jobs.find((job) => [
    "RIDER_ASSIGNED",
    "RIDER_ARRIVING_PICKUP",
    "PICKED_UP",
    "ON_THE_WAY",
    "ARRIVED_DESTINATION",
    "DELIVERED"
  ].includes(job.orderStatus)), [jobs]);
  const todayJobs = useMemo(() => {
    const today = new Date().toDateString();
    return jobs.filter((job) => new Date(job.updatedAt ?? job.createdAt).toDateString() === today);
  }, [jobs]);
  const completedJobs = jobs.filter((job) => job.orderStatus === "COMPLETED" || job.orderStatus === "DELIVERED");
  const cancelledJobs = jobs.filter((job) => job.orderStatus === "CANCELLED" || job.orderStatus === "FAILED" || job.orderStatus === "REFUNDED");
  const openJobs = jobs.filter((job) => !["COMPLETED", "CANCELLED", "FAILED", "REFUNDED"].includes(job.orderStatus));

  return <Protected><Screen title="Assigned Jobs" subtitle={deliveryAccessReady ? "Review delivery jobs assigned by dispatch." : "Delivery activation pending."} refreshing={loading} onRefresh={load}><Message error>{error}</Message>
    {!deliveryAccessReady ? <Card tone="soft">
      <Text style={ui.sectionTitle}>Delivery activation pending</Text>
      <Text style={ui.pageIntro}>KariGO Operations will notify you when Delivery access is activated.</Text>
      <NavLink href="/application-status" label="View application status" />
      <NavLink href="/tabs/dashboard" label="Return home" />
    </Card> : <>
    <Card tone="soft">
      <View style={ui.spaceBetween}>
        <Text style={ui.sectionTitle}>Mode status</Text>
        <StatusBadge status={projection.activeWorkMode === "RIDE" ? "Paused" : profile?.availabilityStatus ?? "Offline"} />
      </View>
      <Text style={ui.pageIntro}>{projection.activeWorkMode === "RIDE" ? "Delivery is paused while a Ride assignment is active." : "Delivery assignments and history live here."}</Text>
    </Card>
    <View style={styles.summaryGrid}>
      <Card><Text style={ui.muted}>Today assigned</Text><Text style={styles.metric}>{todayJobs.length}</Text></Card>
      <Card><Text style={ui.muted}>Completed</Text><Text style={styles.metric}>{profile?.totalDeliveries ?? completedJobs.length}</Text></Card>
      <Card><Text style={ui.muted}>Cancelled</Text><Text style={styles.metric}>{cancelledJobs.length}</Text></Card>
    </View>
    <Card>
      <Text style={ui.sectionTitle}>Active delivery</Text>
      {activeJob ? <>
        <Text style={ui.title}>{activeJob.orderNumber}</Text>
        <StatusBadge status={activeJob.orderStatus} />
        <NavLink href={`/jobs/${activeJob.id}`} label="Open active delivery" />
      </> : <Text style={ui.muted}>No active delivery.</Text>}
    </Card>
    <Text style={ui.sectionTitle}>Assigned deliveries</Text>
    {openJobs.length === 0 ? <Empty message="No delivery jobs assigned yet. Check again after dispatch assigns a delivery." /> : openJobs.map((job) =>
      <Link key={job.id} href={`/jobs/${job.id}` as never} asChild><Pressable><Card>
        <Text style={ui.title}>{job.orderNumber}</Text><StatusBadge status={job.orderStatus} />
        <Text style={ui.muted}>{job.vendor?.businessName ?? job.serviceCategory} - {money(job.deliveryFee)} delivery fee</Text>
      </Card></Pressable></Link>)}
    <Text style={ui.sectionTitle}>Delivery history</Text>
    {completedJobs.length === 0 && cancelledJobs.length === 0 ? <Empty message="Completed and cancelled Delivery assignments will appear here." /> : [...completedJobs, ...cancelledJobs].map((job) =>
      <Link key={`history-${job.id}`} href={`/jobs/${job.id}` as never} asChild><Pressable><Card>
        <Text style={ui.title}>{job.orderNumber}</Text><StatusBadge status={job.orderStatus} />
        <Text style={ui.muted}>{money(job.deliveryFee)} delivery fee</Text>
      </Card></Pressable></Link>)}
    </>}
  </Screen></Protected>;
}

const styles = StyleSheet.create({
  summaryGrid: { gap: 10 },
  metric: { color: brand.colors.charcoal, fontSize: 22, fontWeight: "900" }
});
