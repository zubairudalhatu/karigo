import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import { jobsApi, RiderJob } from "../../src/api/jobs.api";
import { Card, Empty, Message, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { friendlyError, money } from "../../src/lib/errors";

export default function Jobs() {
  const [jobs, setJobs] = useState<RiderJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      setJobs(await jobsApi.list());
      setError("");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return <Protected><Screen title="Delivery jobs" refreshing={loading} onRefresh={load}><Message error>{error}</Message>
    {jobs.length === 0 ? <Empty message="No delivery jobs assigned yet. Stay online to receive jobs." /> : jobs.map((job) =>
      <Link key={job.id} href={`/jobs/${job.id}` as never} asChild><Pressable><Card>
        <Text style={ui.title}>{job.orderNumber}</Text><StatusBadge status={job.orderStatus} />
        <Text style={ui.muted}>{job.vendor?.businessName ?? job.serviceCategory} - {money(job.deliveryFee)} delivery fee</Text>
      </Card></Pressable></Link>)}
  </Screen></Protected>;
}
