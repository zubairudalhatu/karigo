import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import { captainAccessApi } from "../../src/api/captain-access.api";
import { jobsApi, RiderJob } from "../../src/api/jobs.api";
import { Card, Empty, Message, NavLink, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { friendlyError, money } from "../../src/lib/errors";
import type { CaptainAccess } from "../../src/api/captain-access.api";

export default function Jobs() {
  const [jobs, setJobs] = useState<RiderJob[]>([]);
  const [access, setAccess] = useState<CaptainAccess | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const access = await captainAccessApi.resolve();
      setAccess(access);
      if (!access.operationalModes.includes("DELIVERY_CAPTAIN")) {
        setJobs([]);
        setError("");
        return;
      }
      setJobs(await jobsApi.list());
      setError("");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const deliveryAccessReady = access?.operationalModes.includes("DELIVERY_CAPTAIN") === true;

  return <Protected><Screen title="Assigned Jobs" subtitle={deliveryAccessReady ? "Review delivery jobs assigned by dispatch." : "Delivery access is waiting for KariGO approval."} refreshing={loading} onRefresh={load}><Message error>{error}</Message>
    {!deliveryAccessReady ? <Card tone="soft">
      <Text style={ui.sectionTitle}>Delivery access awaiting approval</Text>
      <Text style={ui.pageIntro}>Your Delivery Captain application is under review. Assigned deliveries will be available after KariGO approves and activates your Delivery Captain access.</Text>
      <NavLink href="/application-status" label="View application status" />
      <NavLink href="/tabs/dashboard" label="Return home" />
    </Card> : <>
    <Card tone="soft"><Text style={ui.sectionTitle}>Delivery queue</Text><Text style={ui.pageIntro}>Accept jobs only when you are ready to move through pickup, delivery and customer OTP completion.</Text></Card>
    {jobs.length === 0 ? <Empty message="No delivery jobs assigned yet. Check again after dispatch assigns a delivery." /> : jobs.map((job) =>
      <Link key={job.id} href={`/jobs/${job.id}` as never} asChild><Pressable><Card>
        <Text style={ui.title}>{job.orderNumber}</Text><StatusBadge status={job.orderStatus} />
        <Text style={ui.muted}>{job.vendor?.businessName ?? job.serviceCategory} - {money(job.deliveryFee)} delivery fee</Text>
      </Card></Pressable></Link>)}
    </>}
  </Screen></Protected>;
}
