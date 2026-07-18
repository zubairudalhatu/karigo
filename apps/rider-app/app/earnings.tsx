import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { brand } from "@karigo/config";
import { earningsApi, EarningsSummary } from "../src/api/earnings.api";
import { Card, Empty, Message, Protected, Screen, StatusBadge, ui } from "../src/components/ui";
import { friendlyError, money } from "../src/lib/errors";

export default function Earnings() {
  const [data, setData] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      setData(await earningsApi.summary());
      setError("");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return <Protected><Screen title="Earnings" subtitle="Track delivery earnings recorded by KariGO operations." refreshing={loading} onRefresh={load}><Message error>{error}</Message>
    <Card tone="soft">
      <Text style={ui.sectionTitle}>Total earnings</Text>
      <Text style={styles.total}>{money(data?.totalEarnings)}</Text>
      <Text style={ui.pageIntro}>Wallet withdrawals and payout requests require KariGO operations approval before activation.</Text>
    </Card>
    <View style={styles.summaryGrid}>
      <Card><Text style={ui.muted}>Pending payout</Text><Text style={styles.metric}>{money(data?.pendingEarnings)}</Text></Card>
      <Card><Text style={ui.muted}>Marked paid</Text><Text style={styles.metric}>{money(data?.paidEarnings)}</Text></Card>
    </View>
    <Text style={ui.sectionTitle}>Completed delivery earnings</Text>
    {!data?.completedJobs.length ? <Empty message="Completed delivery earnings will appear here." /> : data.completedJobs.map((item) => <Card key={item.id}>
      <View style={ui.spaceBetween}><Text style={ui.sectionTitle}>{item.order.orderNumber}</Text><StatusBadge status={item.payoutStatus} /></View>
      <Text style={styles.metric}>{money(item.riderPayout)}</Text>
      <Text style={ui.muted}>{new Date(item.order.completedAt ?? item.createdAt).toLocaleString()}</Text>
    </Card>)}
  </Screen></Protected>;
}

const styles = StyleSheet.create({
  total: { color: brand.colors.charcoal, fontSize: 34, fontWeight: "900", letterSpacing: -0.5 },
  metric: { color: brand.colors.charcoal, fontSize: 20, fontWeight: "900" },
  summaryGrid: { gap: 12 }
});
