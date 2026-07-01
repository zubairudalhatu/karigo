import { useEffect, useState } from "react";
import { Text } from "react-native";
import { earningsApi, EarningsSummary } from "../src/api/earnings.api";
import { Card, Empty, Message, Protected, Screen, StatusBadge, ui } from "../src/components/ui";
import { friendlyError, money } from "../src/lib/errors";
export default function Earnings() {
  const [data, setData] = useState<EarningsSummary | null>(null); const [error, setError] = useState("");
  useEffect(() => { earningsApi.summary().then(setData).catch((e) => setError(friendlyError(e))); }, []);
  return <Protected><Screen title="Earnings"><Message error>{error}</Message>
    <Card><Text style={ui.muted}>Total earnings</Text><Text style={ui.title}>{money(data?.totalEarnings)}</Text></Card>
    <Card><Text style={ui.muted}>Pending</Text><Text style={ui.title}>{money(data?.pendingEarnings)}</Text></Card>
    <Card><Text style={ui.muted}>Paid</Text><Text style={ui.title}>{money(data?.paidEarnings)}</Text></Card>
    {!data?.completedJobs.length ? <Empty message="Completed delivery earnings will appear here." /> : data.completedJobs.map((item) => <Card key={item.id}><Text style={ui.title}>{item.order.orderNumber}</Text><StatusBadge status={item.payoutStatus} /><Text>{money(item.riderPayout)}</Text><Text style={ui.muted}>{new Date(item.order.completedAt ?? item.createdAt).toLocaleString()}</Text></Card>)}
  </Screen></Protected>;
}
