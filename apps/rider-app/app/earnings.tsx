import { Feather } from "@expo/vector-icons";
import { brand } from "@karigo/config";
import { formatNaira } from "@karigo/shared-types";
import { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { CaptainAccess, CaptainWorkState } from "../src/api/captain-access.api";
import { captainAccessApi } from "../src/api/captain-access.api";
import type { EarningsSummary, RideEarningRecord } from "../src/api/earnings.api";
import { earningsApi } from "../src/api/earnings.api";
import type { CaptainRideStatement } from "../src/api/taxi.api";
import { taxiApi } from "../src/api/taxi.api";
import { Button, Card, Empty, Message, Protected, Screen, StatusBadge, ui } from "../src/components/ui";
import { friendlyError } from "../src/lib/errors";
import { projectCaptainOperationalState } from "../src/lib/captain-operational-state";

type EarningsFilter = "ALL" | "RIDES" | "DELIVERIES";
type EarningsHistoryRecord = { id: string; mode: "Ride" | "Delivery"; reference: string; amount: string | number; displayStatus: string; secondaryStatus?: string | null; occurredAt: string; ride?: RideEarningRecord };

function amountTotal(records: Array<{ riderPayout: string | number }>) {
  return records.reduce((total, record) => total + Number(record.riderPayout ?? 0), 0);
}

export default function Earnings() {
  const [data, setData] = useState<EarningsSummary | null>(null);
  const [rideStatement, setRideStatement] = useState<CaptainRideStatement | null>(null);
  const [access, setAccess] = useState<CaptainAccess | null>(null);
  const [workState, setWorkState] = useState<CaptainWorkState | null>(null);
  const [filter, setFilter] = useState<EarningsFilter>("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [pendingPaymentReference, setPendingPaymentReference] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [resolvedAccess, state] = await Promise.all([captainAccessApi.resolve(), captainAccessApi.workState().catch(() => null)]);
      setAccess(resolvedAccess);
      setWorkState(state);
      if (!projectCaptainOperationalState(resolvedAccess, state).hasAnyActiveMode) {
        setData(null);
        setError("");
        return;
      }
      const projection = projectCaptainOperationalState(resolvedAccess, state);
      const [summary, statement] = await Promise.all([
        earningsApi.summary(),
        projection.hasActiveRideMode ? taxiApi.earningsStatement().catch(() => null) : Promise.resolve(null)
      ]);
      setData(summary);
      setRideStatement(statement);
      setError("");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function payKarigoFee() {
    if (paymentBusy) return;
    setPaymentBusy(true);
    setError("");
    setPaymentMessage("");
    try {
      const result = await taxiApi.initializeCommissionPayment();
      const url = result.authorization.authorizationUrl ?? result.authorization.checkoutUrl;
      if (!url) throw new Error("Flutterwave checkout link was not returned.");
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" || !(parsed.hostname === "flutterwave.com" || parsed.hostname.endsWith(".flutterwave.com"))) {
        throw new Error("Payment provider returned an invalid checkout link.");
      }
      setPendingPaymentReference(result.authorization.transactionReference);
      await Linking.openURL(parsed.toString());
      setPaymentMessage("Flutterwave checkout opened. Return here and verify payment after completing it.");
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setPaymentBusy(false);
    }
  }

  async function verifyKarigoFee() {
    if (!pendingPaymentReference || paymentBusy) return;
    setPaymentBusy(true);
    setError("");
    try {
      const result = await taxiApi.verifyCommissionPayment(pendingPaymentReference);
      if (result.payment.status !== "SUCCESSFUL") throw new Error("Payment has not been verified yet.");
      setPaymentMessage("Payment verified. Your Ride eligibility has been recalculated automatically.");
      setPendingPaymentReference(null);
      await load();
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setPaymentBusy(false);
    }
  }

  const projection = useMemo(() => projectCaptainOperationalState(access, workState), [access, workState]);
  const deliveryRecords = data?.completedJobs ?? [];
  const rideRecords = data?.completedRides ?? [];
  const availableFilters: EarningsFilter[] = projection.hasActiveRideMode && projection.hasActiveDeliveryMode
    ? ["ALL", "RIDES", "DELIVERIES"] : projection.hasActiveRideMode ? ["RIDES"] : projection.hasActiveDeliveryMode ? ["DELIVERIES"] : [];
  const activeFilter = availableFilters.includes(filter) ? filter : availableFilters[0] ?? "ALL";
  const historyRecords: EarningsHistoryRecord[] = [
    ...rideRecords.map((item) => ({ id: `ride-${item.id}`, mode: "Ride" as const, reference: item.trip?.tripReference ?? item.tripReference, amount: item.riderPayout, displayStatus: item.displayStatus, secondaryStatus: item.secondaryDisplayStatus, occurredAt: item.trip?.completedAt ?? item.createdAt, ride: item })),
    ...deliveryRecords.map((item) => ({ id: `delivery-${item.id}`, mode: "Delivery" as const, reference: item.order.orderNumber, amount: item.riderPayout, displayStatus: item.payoutStatus, occurredAt: item.order.completedAt ?? item.createdAt }))
  ].filter((item) => activeFilter === "ALL" || (activeFilter === "RIDES" ? item.mode === "Ride" : item.mode === "Delivery"))
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  return <Protected><Screen title="Earnings" subtitle={projection.hasAnyActiveMode ? "A clear view of your Captain income." : "Earnings appear after a Captain mode is activated."} refreshing={loading} onRefresh={load}>
    <Message error>{error}</Message>
    {!projection.hasAnyActiveMode ? <Card tone="soft"><Text style={ui.sectionTitle}>Activation pending</Text><Text style={ui.pageIntro}>Earnings unlock when a Captain mode is active.</Text></Card> : <>
      <View style={styles.hero}>
        <View style={styles.heroMetric}><Text style={styles.kicker}>TODAY</Text><Text style={styles.heroValue}>{formatNaira(data?.todayEarnings ?? 0)}</Text></View>
        <View style={styles.heroDivider} />
        <View style={styles.heroMetric}><Text style={styles.kicker}>THIS WEEK</Text><Text style={styles.heroValue}>{formatNaira(data?.thisWeekEarnings ?? 0)}</Text></View>
      </View>

      <View style={styles.compactGrid}>
        <Metric label="Pending payout (Delivery)" value={formatNaira(data?.pendingEarnings ?? 0)} icon="clock" />
        <Metric label="Paid (Delivery)" value={formatNaira(data?.paidEarnings ?? 0)} icon="check-circle" />
        <Metric label="Ride earnings" value={formatNaira(amountTotal(rideRecords))} icon="navigation" />
        <Metric label="Delivery earnings" value={formatNaira(amountTotal(deliveryRecords))} icon="package" />
        {projection.hasActiveRideMode ? <Metric label="Cash fares collected" value={formatNaira((rideStatement?.cashCollectedKobo ?? 0) / 100)} icon="briefcase" /> : null}
        {projection.hasActiveRideMode ? <Metric label="KariGO fee outstanding" value={formatNaira((rideStatement?.karigoCommissionDueKobo ?? 0) / 100)} icon="alert-circle" /> : null}
      </View>

      <View style={styles.sectionHeading}><Text style={ui.sectionTitle}>Earnings history</Text><Text style={styles.totalLabel}>{formatNaira(data?.totalEarnings ?? 0)} total</Text></View>
      <View accessibilityRole="tablist" style={styles.filterRow}>
        {availableFilters.map((item) => <Pressable key={item} accessibilityRole="tab" accessibilityLabel={`Show ${item.toLowerCase()} earnings`} accessibilityState={{ selected: activeFilter === item }} onPress={() => setFilter(item)} style={[styles.filterChip, activeFilter === item && styles.filterChipActive]}>
          <Text style={[styles.filterText, activeFilter === item && styles.filterTextActive]}>{item === "ALL" ? "All" : item === "RIDES" ? "Rides" : "Deliveries"}</Text>
        </Pressable>)}
      </View>

      {!historyRecords.length ? <Empty message="Completed Captain earnings will appear here." /> : <View style={styles.historySurface}>
        {historyRecords.map((item, index) => <View key={item.id} style={[styles.historyRow, index < historyRecords.length - 1 && styles.rowDivider]}>
          <View style={styles.historyIcon}><Feather name={item.mode === "Ride" ? "navigation" : "package"} size={17} color={brand.colors.primary} /></View>
          <View style={styles.historyCopy}>
            <Text style={styles.reference}>{item.reference}</Text><Text style={styles.meta}>{item.mode}{item.ride ? ` · ${item.ride.rideCategory.replaceAll("_", " ")}` : ""} • {new Date(item.occurredAt).toLocaleDateString()}</Text>
            {item.ride ? <><Text style={styles.financeLine}>Fare collected: {formatNaira(item.ride.grossCustomerFareKobo / 100)}</Text><Text style={styles.financeLine}>KariGO service fee: {formatNaira(item.ride.karigoCommissionKobo / 100)}</Text>{item.ride.captainAdjustmentKobo !== 0 ? <Text style={styles.financeLine}>Financial adjustment: {formatNaira(item.ride.captainAdjustmentKobo / 100)}</Text> : null}<Text style={styles.financeStrong}>Your earnings: {formatNaira(item.ride.captainEarningKobo / 100)}</Text></> : null}
          </View>
          <View style={styles.historyAmount}><Text style={styles.amount}>{formatNaira(item.amount)}</Text><StatusBadge status={item.displayStatus} />{item.secondaryStatus === "KARIGO_FEE_DUE" ? <Text style={ui.muted}>KariGO fee due</Text> : null}</View>
        </View>)}
      </View>}
      {projection.hasActiveRideMode ? <Card tone="soft">
        <Text style={ui.sectionTitle}>{rideStatement?.financialEligibility.level === "BLOCKED" ? "Ride requests paused" : "KariGO commission statement"}</Text>
        <Text style={ui.pageIntro}>{rideStatement?.financialEligibility.level === "BLOCKED" ? `Your outstanding KariGO service fee has reached the ${formatNaira(rideStatement.financialEligibility.thresholds.blockKobo / 100)} settlement limit. Settle your KariGO fee to continue receiving Ride requests. This is not an account suspension.` : "Cash fares stay with you. Only the KariGO service fee is due for reconciliation; this is not a payout."}</Text>
        {rideStatement?.financialEligibility.level === "WARNING" || rideStatement?.financialEligibility.level === "URGENT" ? <Text style={styles.warningText}>{rideStatement.financialEligibility.message}</Text> : null}
        <ReceiptLine label="Current Ride eligibility" value={rideStatement?.financialEligibility.rideEligible ? "Eligible" : "Paused"} />
        <ReceiptLine label="Remitted" value={formatNaira((rideStatement?.karigoCommissionRemittedKobo ?? 0) / 100)} />
        <ReceiptLine label="Outstanding" value={formatNaira((rideStatement?.karigoCommissionDueKobo ?? 0) / 100)} />
        {rideStatement?.financialEligibility.paymentEnabled && (rideStatement?.karigoCommissionDueKobo ?? 0) > 0 ? <Button title={paymentBusy ? "Starting secure checkout..." : "Pay KariGO fee"} disabled={paymentBusy} onPress={payKarigoFee} /> : null}
        {pendingPaymentReference ? <Button title={paymentBusy ? "Verifying..." : "Verify completed payment"} tone="muted" disabled={paymentBusy} onPress={verifyKarigoFee} /> : null}
        {paymentMessage ? <Text style={styles.successText}>{paymentMessage}</Text> : null}
        <Text style={styles.subheading}>Recent verified commission payments</Text>
        {rideStatement?.commissionPayments.length ? rideStatement.commissionPayments.map((item) => <View key={item.id} style={styles.remittance}><Text style={styles.reference}>{item.reference}</Text><Text style={styles.meta}>{new Date(item.verifiedAt ?? item.initiatedAt).toLocaleDateString()} · {item.provider.toUpperCase()} · {item.status}</Text><Text style={styles.financeStrong}>{formatNaira(item.amountKobo / 100)}</Text></View>) : <Text style={ui.muted}>No provider commission payments recorded yet.</Text>}
        <Text style={styles.subheading}>Commission remittance history</Text>
        {rideStatement?.remittances.length ? rideStatement.remittances.map((item) => <View key={item.id} style={styles.remittance}><Text style={styles.reference}>{item.reference}</Text><Text style={styles.meta}>{new Date(item.remittedAt).toLocaleDateString()} · {item.source === "PROVIDER_VERIFIED" ? "Provider verified" : "Manual finance override"} · {item.method}</Text><Text style={styles.financeStrong}>{formatNaira(item.amountKobo / 100)}</Text></View>) : <Text style={ui.muted}>No commission remittances recorded yet.</Text>}
      </Card> : null}
    </>}
  </Screen></Protected>;
}

function Metric({ label, value, icon }: { label: string; value: string; icon: keyof typeof Feather.glyphMap }) {
  return <View style={styles.metric}><Feather name={icon} size={17} color={brand.colors.primary} /><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>;
}

function ReceiptLine({ label, value }: { label: string; value: string }) {
  return <View style={styles.statementLine}><Text style={styles.meta}>{label}</Text><Text style={styles.financeStrong}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  hero: { backgroundColor: brand.colors.charcoal, borderRadius: 24, flexDirection: "row", padding: 18 },
  heroMetric: { flex: 1, gap: 5 },
  heroDivider: { backgroundColor: "rgba(255,255,255,0.2)", marginHorizontal: 14, width: 1 },
  kicker: { color: "#D1D5DB", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  heroValue: { color: brand.colors.white, fontSize: 24, fontWeight: "900", letterSpacing: -0.4 },
  compactGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: { backgroundColor: "#F9FAFB", borderRadius: 16, flexBasis: "47%", flexGrow: 1, gap: 4, padding: 12 },
  metricLabel: { color: brand.colors.muted, fontSize: 11, fontWeight: "700" },
  metricValue: { color: brand.colors.charcoal, fontSize: 16, fontWeight: "900" },
  sectionHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { color: brand.colors.muted, fontSize: 12, fontWeight: "800" },
  filterRow: { flexDirection: "row", gap: 8 },
  filterChip: { alignItems: "center", backgroundColor: "#F3F4F6", borderRadius: 999, justifyContent: "center", minHeight: 42, paddingHorizontal: 16 },
  filterChipActive: { backgroundColor: brand.colors.charcoal },
  filterText: { color: brand.colors.muted, fontWeight: "900" },
  filterTextActive: { color: brand.colors.white },
  historySurface: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 20, borderWidth: 1, overflow: "hidden", paddingHorizontal: 14 },
  historyRow: { alignItems: "center", flexDirection: "row", gap: 10, minHeight: 76, paddingVertical: 10 },
  rowDivider: { borderBottomColor: brand.colors.border, borderBottomWidth: 1 },
  historyIcon: { alignItems: "center", backgroundColor: "#FFF1ED", borderRadius: 12, height: 38, justifyContent: "center", width: 38 },
  historyCopy: { flex: 1, gap: 3 },
  reference: { color: brand.colors.charcoal, fontSize: 14, fontWeight: "900" },
  meta: { color: brand.colors.muted, fontSize: 11.5 },
  historyAmount: { alignItems: "flex-end", gap: 5 },
  amount: { color: brand.colors.charcoal, fontSize: 14, fontWeight: "900" },
  financeLine: { color: brand.colors.muted, fontSize: 11.5, lineHeight: 16 },
  financeStrong: { color: brand.colors.charcoal, fontSize: 12, fontWeight: "900" },
  statementLine: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  remittance: { borderTopColor: brand.colors.border, borderTopWidth: 1, gap: 3, paddingTop: 9 },
  subheading: { color: brand.colors.charcoal, fontSize: 12, fontWeight: "900", marginTop: 8 },
  warningText: { color: "#9A6700", fontSize: 12, fontWeight: "800" },
  successText: { color: "#137333", fontSize: 12, fontWeight: "800" },
});
