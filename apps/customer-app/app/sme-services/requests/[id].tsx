import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ServiceProviderRequest, ServiceProviderRequestStatus, serviceProviderRequestsApi } from "../../../src/api/service-provider-requests.api";
import { Button, Card, Field, Loading, Message, Protected, Screen, StatusBadge, ui } from "../../../src/components/ui";
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

function progressLabel(index: number, currentStep: number) {
  if (index < currentStep) return "Done";
  if (index === currentStep) return "Current";
  return "Pending";
}

export default function SmeServicesRequestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [request, setRequest] = useState<ServiceProviderRequest | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");

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
  const canReview = request?.status === "COMPLETED" && !!request.assignedProvider && !request.review;

  async function submitReview() {
    if (!request || !canReview) return;
    setReviewing(true);
    setReviewMessage("");
    setError("");
    try {
      await serviceProviderRequestsApi.review(request.id, { rating, comment: reviewComment || undefined });
      setReviewMessage("Thank you. Your provider review has been recorded.");
      setReviewComment("");
      await load();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setReviewing(false);
    }
  }

  if (!request && !error) return <Protected><Loading label="Loading SME Services request..." /></Protected>;

  return <Protected><Screen title={request?.requestNumber ?? "SME Services request"} refreshing={refreshing} onRefresh={load}>
    <Message error>{error}</Message>
    {request ? <>
      <Card>
        <StatusBadge status={request.status} />
        <Text style={ui.cardTitle}>{request.serviceLabel}</Text>
        <Text style={ui.muted}>{statusHelp[request.status]}</Text>
      </Card>

      {request.customerUpdateNote ? <Card>
        <Text style={ui.cardTitle}>KariGO update</Text>
        <Text style={ui.cardText}>{request.customerUpdateNote}</Text>
      </Card> : null}

      <Card>
        <Text style={ui.cardTitle}>Status progress</Text>
        {isCancelled ? <View style={styles.timelineItem}>
          <Text style={[styles.timelinePill, styles.timelinePillCancelled]}>Cancelled</Text>
          <View style={styles.timelineText}>
            <Text style={styles.timelineTitle}>Cancelled</Text>
            <Text style={ui.muted}>This request is no longer active.</Text>
          </View>
        </View> : progress.map((step, index) => {
          const active = index === currentStep;
          const complete = index < currentStep;
          const pending = index > currentStep;
          return <View key={step.status} style={styles.timelineItem}>
            <Text style={[
              styles.timelinePill,
              complete && styles.timelinePillDone,
              active && styles.timelinePillCurrent,
              pending && styles.timelinePillPending
            ]}>{progressLabel(index, currentStep)}</Text>
            <View style={styles.timelineText}>
              <Text style={[styles.timelineTitle, complete && styles.timelineTitleDone, active && styles.timelineTitleActive]}>{step.label}</Text>
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

      {request.preferredProvider || request.assignedProvider ? <Card>
        <Text style={ui.cardTitle}>Provider</Text>
        {request.preferredProvider ? <Text style={ui.muted}>Preferred: {request.preferredProvider.displayName}</Text> : null}
        {request.assignedProvider ? <>
          <Text style={ui.cardText}>{request.assignedProvider.displayName}</Text>
          <Text style={ui.muted}>{request.assignedProvider.city}, {request.assignedProvider.state}</Text>
          <Text style={ui.muted}>{request.assignedProvider.reviewCount && request.assignedProvider.averageRating ? `${request.assignedProvider.averageRating.toFixed(1)} rating from ${request.assignedProvider.reviewCount} reviews` : "No public reviews yet"}</Text>
        </> : <Text style={ui.muted}>KariGO has not assigned a provider yet.</Text>}
        <Text style={ui.muted}>Private provider phone and email details are not shown in the Customer App.</Text>
      </Card> : null}

      {request.review ? <Card>
        <Text style={ui.cardTitle}>Your review</Text>
        <Text style={ui.cardText}>{request.review.rating} out of 5</Text>
        {request.review.comment ? <Text style={ui.muted}>{request.review.comment}</Text> : null}
      </Card> : null}

      {canReview ? <Card>
        <Text style={ui.cardTitle}>Rate this provider</Text>
        <Text style={ui.muted}>Reviews help KariGO improve SME Services quality. Do not include phone numbers, payment details or private information.</Text>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((value) => <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${value} out of 5`}
            onPress={() => setRating(value)}
            style={[styles.ratingButton, rating === value && styles.ratingButtonActive]}
          >
            <Text style={[styles.ratingText, rating === value && styles.ratingTextActive]}>{value}</Text>
          </Pressable>)}
        </View>
        <Field placeholder="Optional review comment" value={reviewComment} onChangeText={setReviewComment} multiline />
        <Button title={reviewing ? "Saving review..." : "Submit review"} onPress={submitReview} disabled={reviewing} />
        <Message>{reviewMessage}</Message>
      </Card> : null}

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
  timelinePill: { borderRadius: 999, fontSize: 11, fontWeight: "900", minWidth: 72, overflow: "hidden", paddingHorizontal: 10, paddingVertical: 7, textAlign: "center" },
  timelinePillDone: { backgroundColor: "#DCFCE7", color: "#166534" },
  timelinePillCurrent: { backgroundColor: "#DBEAFE", color: "#1E40AF" },
  timelinePillPending: { backgroundColor: "#F3F4F6", color: "#6B7280" },
  timelinePillCancelled: { backgroundColor: "#FEE2E2", color: "#991B1B" },
  timelineText: { flex: 1, gap: 3 },
  timelineTitle: { color: "#6B7280", fontWeight: "900" },
  timelineTitleDone: { color: "#166534" },
  timelineTitleActive: { color: "#111827" },
  ratingRow: { flexDirection: "row", gap: 8 },
  ratingButton: { alignItems: "center", backgroundColor: "#F3F4F6", borderColor: "#E5E7EB", borderRadius: 999, borderWidth: 1, height: 42, justifyContent: "center", width: 42 },
  ratingButtonActive: { backgroundColor: "#FEF2F2", borderColor: "#DC2626" },
  ratingText: { color: "#6B7280", fontWeight: "900" },
  ratingTextActive: { color: "#991B1B" }
});
