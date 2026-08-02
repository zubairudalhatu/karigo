import { brand } from "@karigo/config";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { CaptainAccess } from "../src/api/captain-access.api";
import { captainAccessApi } from "../src/api/captain-access.api";
import { Button, Card, Loading, Message, Protected, Screen, StatusBadge, ui } from "../src/components/ui";
import {
  applicantReviewCopy,
  applicationModeLabel,
  applicationStatusLabel,
  CaptainApplicationMode,
  CaptainApplicationSummary,
  categoryLabel,
  classifyCaptainApplication,
  formatCaptainDate,
  hasAnyCaptainApplication,
  hasSubmittedCaptainApplication,
  overallReviewState
} from "../src/lib/captain-application-status";
import { CaptainModeProjection, projectCaptainOperationalState } from "../src/lib/captain-operational-state";
import { friendlyError } from "../src/lib/errors";

function firstName(fullName?: string | null) {
  return fullName?.trim().split(/\s+/)[0] || "Captain";
}

function locationLabel(application: Extract<CaptainApplicationSummary, { exists: true }>) {
  const anyApplication = application as typeof application & {
    residentialLocation?: { label?: string | null } | null;
    operatingAreas?: Array<{ label?: string | null }>;
    primaryOperatingArea?: { label?: string | null } | null;
    pilotCity?: string | null;
  };
  return {
    residential: anyApplication.residentialLocation?.label || anyApplication.pilotCity || "Not provided",
    operatingAreas: anyApplication.operatingAreas?.map((area) => area.label).filter(Boolean).join(", ") || "Not provided",
    primaryArea: anyApplication.primaryOperatingArea?.label || "Not provided"
  };
}

function timelineFor(category: ReturnType<typeof classifyCaptainApplication>) {
  const steps = [
    { key: "submitted", title: "Application submitted" },
    { key: "review", title: "Document review" },
    { key: "approval", title: "KariGO approval" },
    { key: "activation", title: "Operations activation" }
  ];
  const currentIndex = category === "SUBMITTED" ? 1
      : category === "UNDER_REVIEW" || category === "REVISION_REQUIRED" ? 1
      : category === "PROVISIONALLY_APPROVED" ? 2
        : category === "APPROVED" ? 3
        : category === "ACTIVATION_PENDING" ? 3
          : category === "ACTIVE" ? 4
            : category === "REJECTED" ? 1
              : 0;

  return steps.map((step, index) => ({
    ...step,
    state: category === "REJECTED" && index >= 1 ? "Paused" : index < currentIndex ? "Done" : index === currentIndex ? "Current" : "Pending"
  }));
}

function documentStageLabel(stage?: string | null) {
  switch (stage) {
    case "DOCUMENTS_MISSING":
      return "Documents needed";
    case "DOCUMENTS_RECEIVED":
      return "Documents received";
    case "DOCUMENTS_UNDER_REVIEW":
      return "Documents under review";
    case "CHANGES_REQUESTED":
      return "Changes requested";
    case "DOCUMENTS_APPROVED":
      return "Documents approved";
    default:
      return "Documents received";
  }
}

function ApplicationSection({ application, mode, projection }: { application: CaptainApplicationSummary; mode: CaptainApplicationMode; projection: CaptainModeProjection }) {
  if (!hasSubmittedCaptainApplication(application)) {
    return <Card>
      <Text style={ui.sectionTitle}>{applicationModeLabel(mode)} application</Text>
      <StatusBadge status="Not submitted" />
      <Text style={ui.muted}>{application.message}</Text>
    </Card>;
  }

  const category = classifyCaptainApplication(application.status);
  const location = locationLabel(application);
  const documentReview = application.documentReview;
  return <Card>
    <View style={ui.spaceBetween}>
      <Text style={ui.sectionTitle}>{applicationModeLabel(mode)} application</Text>
      <StatusBadge status={applicationStatusLabel(application)} />
    </View>
    <Text style={styles.reference}>{application.applicationReference}</Text>
    <View style={styles.stageGrid}>
      <View style={styles.stageItem}><Text style={styles.metaLabel}>Application</Text><Text style={styles.metaValue}>{projection.applicationLabel}</Text></View>
      <View style={styles.stageItem}><Text style={styles.metaLabel}>Documents</Text><Text style={styles.metaValue}>{projection.documentsLabel}</Text></View>
      <View style={styles.stageItem}><Text style={styles.metaLabel}>Operations</Text><Text style={styles.metaValue}>{projection.operationsLabel}</Text></View>
    </View>
    <Text style={ui.muted}>{projection.active ? `Your ${applicationModeLabel(mode)} access is active.` : applicantReviewCopy(application, mode)}</Text>
    {application.applicantVisibleNote ? <Message>{application.applicantVisibleNote}</Message> : null}
    {documentReview ? <View style={styles.documentReview}>
      <View style={ui.spaceBetween}>
        <Text style={styles.metaLabel}>Document review</Text>
        <StatusBadge status={documentStageLabel(documentReview.stage)} />
      </View>
      <Text style={ui.muted}>{documentReview.message}</Text>
    </View> : null}
    {mode === "DELIVERY_CAPTAIN" && category === "REVISION_REQUIRED" ? <Button title="Upload requested documents" onPress={() => router.push("/delivery-application-revision")} /> : null}
    <View style={styles.metaGrid}>
      <View style={styles.metaItem}><Text style={styles.metaLabel}>Submitted</Text><Text style={styles.metaValue}>{formatCaptainDate(application.submittedAt)}</Text></View>
      <View style={styles.metaItem}><Text style={styles.metaLabel}>Last update</Text><Text style={styles.metaValue}>{formatCaptainDate(application.reviewedAt ?? application.submittedAt)}</Text></View>
      <View style={styles.metaItem}><Text style={styles.metaLabel}>Residential location</Text><Text style={styles.metaValue}>{location.residential}</Text></View>
      <View style={styles.metaItem}><Text style={styles.metaLabel}>Primary area</Text><Text style={styles.metaValue}>{location.primaryArea}</Text></View>
    </View>
    <Text style={styles.metaLabel}>Selected operating areas</Text>
    <Text style={ui.muted}>{location.operatingAreas}</Text>
    <View style={styles.timeline}>
      {timelineFor(category).map((step) => <View key={step.key} style={styles.timelineRow}>
        <Text style={[styles.timelineBadge, step.state === "Done" && styles.timelineDone, step.state === "Current" && styles.timelineCurrent, step.state === "Paused" && styles.timelinePaused]}>{step.state}</Text>
        <Text style={styles.timelineText}>{step.title}</Text>
      </View>)}
    </View>
  </Card>;
}

export default function ApplicationStatus() {
  const params = useLocalSearchParams<{ submitted?: string }>();
  const [access, setAccess] = useState<CaptainAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [showSubmitted, setShowSubmitted] = useState(params.submitted === "1");

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const resolved = await captainAccessApi.resolve();
      setAccess(resolved);
      setLastChecked(new Date());
      if (!hasAnyCaptainApplication(resolved) && resolved.nextStep === "START_APPLICATION") {
        router.replace("/auth/apply");
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(false); }, [load]));

  if (loading && !access) return <Protected><Loading label="Loading application status..." /></Protected>;

  const overall = overallReviewState(access);
  const overallLabel = categoryLabel(overall);
  const projection = projectCaptainOperationalState(access);
  const headerLabel = projection.hasAnyActiveMode ? "Captain access active" : overallLabel;

  return <Protected>
    <Screen
      title="Application status"
      subtitle="Review your KariGO Captain access, documents and application history."
      refreshing={refreshing}
      onRefresh={() => void load(true)}
    >
      {showSubmitted ? <Card tone="soft">
        <Image source={require("../assets/karigo-logo.png")} style={styles.logo} resizeMode="contain" />
        <Text style={styles.successTitle}>Application submitted</Text>
        <Text style={ui.pageIntro}>Your Captain application has been received and is now waiting for KariGO review.</Text>
        <Text style={ui.muted}>We will notify you when your application status changes.</Text>
        <Button title="View application status" onPress={() => setShowSubmitted(false)} />
        <Button title="Return to Captain home" tone="muted" onPress={() => router.replace("/tabs/dashboard")} />
      </Card> : null}

      <Card tone="soft">
        <Text style={styles.kicker}>KariGO Captain</Text>
        <Text style={ui.heroTitle}>Hi, {firstName(access?.account.fullName)}</Text>
        <View style={styles.badgeRow}><StatusBadge status={projection.hasAnyActiveMode ? "Active" : overallLabel} /></View>
        <Text style={styles.overallTitle}>{headerLabel}</Text>
        <Text style={ui.pageIntro}>{projection.overallMessage}</Text>
        {lastChecked ? <Text style={ui.muted}>Last checked {lastChecked.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}</Text> : null}
      </Card>

      <Message error>{error}</Message>
      <Button title={refreshing ? "Refreshing..." : "Refresh status"} tone="muted" disabled={refreshing} onPress={() => void load(true)} />

      {access ? <>
        <ApplicationSection application={access.deliveryCaptainApplication} mode="DELIVERY_CAPTAIN" projection={projection.delivery} />
        <ApplicationSection application={access.rideCaptainApplication} mode="RIDE_CAPTAIN" projection={projection.ride} />
      </> : null}

      <Card>
        <Text style={ui.sectionTitle}>Need help?</Text>
        <Text style={ui.muted}>Use your KariGO account details when contacting support about your Captain application. Do not share OTPs or passwords.</Text>
        <Pressable onPress={() => router.push("/profile")}><Text style={ui.link}>Open Profile</Text></Pressable>
      </Card>
    </Screen>
  </Protected>;
}

const styles = StyleSheet.create({
  logo: { height: 44, width: 150 },
  successTitle: { color: brand.colors.charcoal, fontSize: 27, fontWeight: "900", letterSpacing: -0.3 },
  kicker: { color: brand.colors.primary, fontSize: 12, fontWeight: "900", letterSpacing: 1.2, textTransform: "uppercase" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  overallTitle: { color: brand.colors.charcoal, fontSize: 18, fontWeight: "900" },
  reference: { color: brand.colors.charcoal, fontSize: 16, fontWeight: "900" },
  metaGrid: { gap: 8 },
  stageGrid: { gap: 8 },
  stageItem: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 14, borderWidth: 1, gap: 2, padding: 10 },
  documentReview: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA", borderRadius: 14, borderWidth: 1, gap: 6, padding: 10 },
  metaItem: { backgroundColor: "#F9FAFB", borderColor: brand.colors.border, borderRadius: 14, borderWidth: 1, gap: 2, padding: 10 },
  metaLabel: { color: brand.colors.muted, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  metaValue: { color: brand.colors.charcoal, fontWeight: "900" },
  timeline: { gap: 8, marginTop: 4 },
  timelineRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  timelineBadge: { backgroundColor: "#F3F4F6", borderRadius: 999, color: brand.colors.muted, fontSize: 11, fontWeight: "900", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 5, width: 74 },
  timelineDone: { backgroundColor: "#DCFCE7", color: "#166534" },
  timelineCurrent: { backgroundColor: "#FEF3C7", color: "#92400E" },
  timelinePaused: { backgroundColor: "#FEE2E2", color: "#991B1B" },
  timelineText: { color: brand.colors.charcoal, flex: 1, fontWeight: "800" }
});
