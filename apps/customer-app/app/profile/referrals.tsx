import { Feather } from "@expo/vector-icons";
import { brand } from "@karigo/config";
import { useEffect, useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import { CustomerReferralProfileResult, CustomerReferralRecord, referralsApi } from "../../src/api/referrals.api";
import { Button, Card, Empty, Loading, Message, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Not yet";
}

function statusCopy(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function CustomerReferralsScreen() {
  const [profile, setProfile] = useState<CustomerReferralProfileResult | null>(null);
  const [referrals, setReferrals] = useState<CustomerReferralRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    setError("");
    try {
      const [nextProfile, nextReferrals] = await Promise.all([
        referralsApi.profile(),
        referralsApi.mine()
      ]);
      setProfile(nextProfile);
      setReferrals(nextReferrals);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, []);

  async function shareCode() {
    if (!profile?.code || !profile.shareEnabled) return;
    setMessage("");
    try {
      await Share.share({
        message: `Join KariGO in Kano and Abuja with my referral code: ${profile.code}. Referral rewards are subject to KariGO approval and are not automatic.`
      });
      setMessage("Referral code opened in your share sheet.");
    } catch {
      setError("Referral code could not be shared. Please try again.");
    }
  }

  if (loading && !profile) return <Protected><Loading label="Loading referral code..." /></Protected>;

  return <Protected>
    <Screen title="Referral rewards" refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }}>
      <Message error>{error}</Message>
      <Message>{message}</Message>

      <View style={styles.heroCard}>
        <View style={styles.heroIcon}><Feather name="gift" size={24} color={brand.colors.white} /></View>
        <Text style={styles.heroLabel}>Your KariGO referral code</Text>
        <Text selectable style={styles.referralCode}>{profile?.code ?? "Not available"}</Text>
        <Text style={styles.heroText}>Share this code manually with friends in supported launch cities. KariGO tracks referral progress, but rewards are not issued automatically.</Text>
        <Button title="Share referral code" disabled={!profile?.shareEnabled || !profile?.code} onPress={shareCode} />
      </View>

      <Card>
        <Text style={ui.cardTitle}>Referral summary</Text>
        <View style={styles.summaryGrid}>
          <SummaryItem label="Total referrals" value={profile?.summary.totalReferrals ?? 0} />
          <SummaryItem label="Activated" value={profile?.summary.activatedReferrals ?? 0} />
          <SummaryItem label="Eligible" value={profile?.summary.eligibleReferrals ?? 0} />
        </View>
        <Text style={ui.muted}>Last referral: {formatDate(profile?.lastReferralAt)}</Text>
        <StatusBadge status={profile?.status ?? "ACTIVE"} />
      </Card>

      <Card>
        <Text style={ui.cardTitle}>Reward safety status</Text>
        <Text style={ui.muted}>{profile?.summary.note ?? "Referral rewards are tracking-only for now."}</Text>
        <Text style={ui.muted}>No wallet credit, airtime, data, promo code, subscription, SMS, email, WhatsApp or push reward is sent from this screen.</Text>
      </Card>

      <Card>
        <Text style={ui.cardTitle}>Referral history</Text>
        {!referrals.length ? <Empty message="People who register with your code will appear here after KariGO records the referral." /> : referrals.map((referral) => (
          <View style={styles.referralRow} key={referral.id}>
            <View style={styles.referralIcon}><Feather name="user-plus" size={18} color={brand.colors.primary} /></View>
            <View style={styles.referralCopy}>
              <Text style={styles.referralName}>{referral.referredCustomer.fullName}</Text>
              <Text style={ui.muted}>{statusCopy(referral.status)} - {formatDate(referral.createdAt)}</Text>
              <Text style={styles.referenceText}>Code used: {referral.referralCode}</Text>
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  </Protected>;
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return <View style={styles.summaryItem}>
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>;
}

const styles = StyleSheet.create({
  heroCard: { backgroundColor: brand.colors.charcoal, borderRadius: 28, gap: 12, padding: 20 },
  heroIcon: { alignItems: "center", backgroundColor: brand.colors.primary, borderRadius: 999, height: 48, justifyContent: "center", width: 48 },
  heroLabel: { color: brand.colors.white, fontSize: 13, fontWeight: "900", opacity: 0.82, textTransform: "uppercase" },
  heroText: { color: brand.colors.white, fontSize: 14, lineHeight: 20, opacity: 0.84 },
  referenceText: { color: brand.colors.muted, fontSize: 11 },
  referralCode: { color: brand.colors.white, fontSize: 32, fontWeight: "900", letterSpacing: 1.4 },
  referralCopy: { flex: 1, gap: 3 },
  referralIcon: { alignItems: "center", backgroundColor: "#FEF2F2", borderRadius: 999, height: 38, justifyContent: "center", width: 38 },
  referralName: { color: brand.colors.charcoal, fontSize: 15, fontWeight: "900" },
  referralRow: { alignItems: "center", borderBottomColor: brand.colors.border, borderBottomWidth: 1, flexDirection: "row", gap: 12, paddingVertical: 12 },
  summaryGrid: { flexDirection: "row", gap: 10 },
  summaryItem: { alignItems: "center", backgroundColor: "#F9FAFB", borderColor: brand.colors.border, borderRadius: 18, borderWidth: 1, flex: 1, gap: 2, padding: 12 },
  summaryLabel: { color: brand.colors.muted, fontSize: 11, fontWeight: "800", textAlign: "center" },
  summaryValue: { color: brand.colors.charcoal, fontSize: 20, fontWeight: "900" }
});
