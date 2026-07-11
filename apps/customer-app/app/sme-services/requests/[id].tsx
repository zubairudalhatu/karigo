import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ServiceProviderRequest, ServiceProviderRequestStatus, serviceProviderRequestsApi } from "../../../src/api/service-provider-requests.api";
import { Card, Loading, Message, Protected, Screen, StatusBadge, ui } from "../../../src/components/ui";
import { friendlyError } from "../../../src/lib/errors";

const progress: Array<{ status: ServiceProviderRequestStatus; label: string; description: string }> = [
  { status: "SUBMITTED", label: "Submitted", description: "KariGO has received your service request." },
  { status: "UNDER_REVIEW", label: "Under Review", description: "Operations is checking the request details." },
  { status: "PROVIDER_MATCHING", label: "Provider Matching", description: "KariGO is reviewing suitable service-provider options." },
  { status: "PROVIDER_ASSIGNED", label: "Provider Assigned", description: "A provider assignment has been recorded for operations follow-up." },
  { status: "COMPLETED", label: "Completed", description: "The request has been closed as completed." }
];

const statusHelp: Record<ServiceProviderRequestStatus, string> = {
  SUBMITTED: "Your request is waiting for KariGO review.",
  UNDER_REVIEW: "KariGO is checking your service needs and location details.",
  PROVIDER_MATCHING: "KariGO is reviewing available approved providers for this request.",
  PROVIDER_ASSIGNED: "KariGO has recorded a provider assignment. Operations will coordinate the next steps; private provider contact details remain protected.",
  COMPLETED: "This SME Services request has been completed.",
  CANCELLED: "This SME Services request has been cancelled."
};

function date(value?: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function SmeServicesRequestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [request, setRequest] = useState<ServiceProviderRequest | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    setError("");
    try {
      setRequest(await serviceProviderRequestsApi.detail(id));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { void load(); }, [id]);

  const currentStep = useMemo(() => progress.findIndex((step) => step.status === request?.status), [request?.status]);
  const isCancelled = request?.status === "CANCELLED";

  if (!request && !error) return <Protected><Loading label="Loading SME Services request..." /></Protected>;

  return <Protected><Screen title={request?.requestNumber ?? "SME Services request"} refreshing={refreshing} onRefresh={load}>
    <Message error>{error}</Message>
    {request ? <>
      <Card>
        <StatusBadge status={request.status} />
        <Text style={ui.cardTitle}>{request.serviceLabel}</Text>
        <Text style={ui.muted}>{statusHelp[request.status]}</Text>
      </Card>

      <Card>
        <Text style={ui.cardTitle}>Status progress</Text>
        {isCancelled ? <View style={styles.timelineItem}>
          <Text style={styles.timelineMarker}>!</Text>
          <View style={styles.timelineText}>
            <Text style={styles.timelineTitle}>Cancelled</Text>
            <Text style={ui.muted}>This request is no longer active.</Text>
          </View>
        </View> : progress.map((step, index) => {
          const active = index === currentStep;
          const complete = currentStep >= index;
          return <View key={step.status} style={styles.timelineItem}>
            <Text style={[styles.timelineMarker, complete && styles.timelineMarkerComplete, active && styles.timelineMarkerActive]}>{complete ? "OK" : index + 1}</Text>
            <View style={styles.timelineText}>
              <Text style={[styles.timelineTitle, active && styles.timelineTitleActive]}>{step.label}</Text>
              <Text style={ui.muted}>{step.description}</Text>
            </View>
          </View>;
        })}
      </Card>

      <Card>
        <Text style={ui.cardTitle}>Request details</Text>
        <Text style={ui.cardText}>{request.description || "No description provided."}</Text>
        <View style={ui.priceRow}><Text style={ui.priceLabel}>Preferred date</Text><Text style={ui.priceValue}>{request.preferredDate || "Not set"}</Text></View>
        <View style={ui.priceRow}><Text style={ui.priceLabel}>Preferred time</Text><Text style={ui.priceValue}>{request.preferredTimeWindow || "Not set"}</Text></View>
        <View style={ui.priceRow}><Text style={ui.priceLabel}>Submitted</Text><Text style={ui.priceValue}>{date(request.createdAt)}</Text></View>
        <View style={ui.priceRow}><Text style={ui.priceLabel}>Last updated</Text><Text style={ui.priceValue}>{date(request.updatedAt)}</Text></View>
      </Card>

      <Card>
        <Text style={ui.cardTitle}>Service location</Text>
        <Text style={ui.cardText}>{request.serviceAddress.label}</Text>
        <Text style={ui.muted}>{request.serviceAddress.addressLine}</Text>
        <Text style={ui.muted}>{request.serviceAddress.city}, {request.serviceAddress.state}</Text>
      </Card>

      <Card>
        <Text style={ui.cardTitle}>Safety note</Text>
        <Text style={ui.muted}>This is a manual review workflow. No live dispatch, service payment, provider payout or provider login is activated from this request.</Text>
        <Text style={ui.muted}>KariGO does not show private provider phone or email details in the Customer App.</Text>
      </Card>
    </> : null}
  </Screen></Protected>;
}

const styles = StyleSheet.create({
  timelineItem: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  timelineMarker: { backgroundColor: "#F3F4F6", borderRadius: 999, color: "#6B7280", fontSize: 12, fontWeight: "900", minWidth: 28, overflow: "hidden", paddingHorizontal: 8, paddingVertical: 6, textAlign: "center" },
  timelineMarkerComplete: { backgroundColor: "#DCFCE7", color: "#166534" },
  timelineMarkerActive: { backgroundColor: "#FEF2F2", color: "#991B1B" },
  timelineText: { flex: 1, gap: 3 },
  timelineTitle: { color: "#6B7280", fontWeight: "900" },
  timelineTitleActive: { color: "#111827" }
});
