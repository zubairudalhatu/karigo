import type { CaptainAccess, CaptainAvailabilityReasonCode, CaptainWorkState } from "../api/captain-access.api";
import {
  CaptainApplicationCategory,
  CaptainApplicationSummary,
  classifyCaptainApplication,
  hasSubmittedCaptainApplication
} from "./captain-application-status";

export type CaptainModeKey = "DELIVERY" | "RIDE";

export interface CaptainModeProjection {
  key: CaptainModeKey;
  label: "Delivery Captain" | "Ride Captain";
  hasApplication: boolean;
  applicationCategory: CaptainApplicationCategory;
  applicationLabel: string;
  documentsLabel: string;
  operationsLabel: string;
  active: boolean;
  approvedPendingActivation: boolean;
  revisionRequired: boolean;
  underReview: boolean;
  desiredOnline: boolean;
  effectiveOnline: boolean;
  eligible: boolean;
  eligibilityReasonCode?: CaptainAvailabilityReasonCode;
  eligibilityReason?: string | null;
}

export interface CaptainOperationalProjection {
  delivery: CaptainModeProjection;
  ride: CaptainModeProjection;
  hasActiveDeliveryMode: boolean;
  hasActiveRideMode: boolean;
  hasAnyActiveMode: boolean;
  hasPendingApplication: boolean;
  hasApprovedPendingActivation: boolean;
  hasRevisionRequired: boolean;
  hasActiveAssignment: boolean;
  activeWorkMode: CaptainWorkState["activeWorkMode"];
  desiredDeliveryOnline: boolean;
  desiredRideOnline: boolean;
  effectiveDeliveryOnline: boolean;
  effectiveRideOnline: boolean;
  overallStatus: string;
  overallMessage: string;
}

const pendingCategories = new Set<CaptainApplicationCategory>([
  "SUBMITTED",
  "UNDER_REVIEW",
  "PROVISIONALLY_APPROVED"
]);

function applicationCategory(application?: CaptainApplicationSummary | null) {
  return hasSubmittedCaptainApplication(application)
    ? classifyCaptainApplication(application.status)
    : "NOT_STARTED";
}

function applicationLabel(category: CaptainApplicationCategory) {
  if (category === "NOT_STARTED" || category === "DRAFT_ALLOWED") return "Not submitted";
  if (category === "REVISION_REQUIRED") return "Changes requested";
  if (category === "PROVISIONALLY_APPROVED") return "Provisionally approved";
  if (category === "ACTIVATION_PENDING") return "Approved";
  return category.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function documentsLabel(application?: CaptainApplicationSummary | null) {
  if (!hasSubmittedCaptainApplication(application)) return "Not submitted";
  const stage = application.documentReview?.stage;
  if (stage === "DOCUMENTS_APPROVED") return "Approved";
  if (stage === "CHANGES_REQUESTED") return "Changes requested";
  if (stage === "DOCUMENTS_UNDER_REVIEW") return "Under review";
  if (stage === "DOCUMENTS_MISSING") return "Needed";
  return "Received";
}

function operationLabel(active: boolean, category: CaptainApplicationCategory) {
  if (active) return "Operations active";
  if (category === "APPROVED" || category === "ACTIVATION_PENDING") return "Approved - activation pending";
  if (category === "REVISION_REQUIRED") return "Changes requested";
  if (pendingCategories.has(category)) return "Under review";
  if (category === "REJECTED") return "Rejected";
  return "Not active";
}

function modeProjection(
  key: CaptainModeKey,
  access: CaptainAccess | null | undefined,
  workState: CaptainWorkState | null | undefined
): CaptainModeProjection {
  const isDelivery = key === "DELIVERY";
  const application = isDelivery ? access?.deliveryCaptainApplication : access?.rideCaptainApplication;
  const category = applicationCategory(application);
  const active = isDelivery
    ? Boolean(access?.operationalModes.includes("DELIVERY_CAPTAIN") || access?.deliveryCaptainProfile?.operationalAccess)
    : Boolean(access?.operationalModes.includes("RIDE_CAPTAIN") || access?.rideCaptainProfile?.operationalAccess);
  return {
    key,
    label: isDelivery ? "Delivery Captain" : "Ride Captain",
    hasApplication: hasSubmittedCaptainApplication(application),
    applicationCategory: category,
    applicationLabel: applicationLabel(category),
    documentsLabel: documentsLabel(application),
    operationsLabel: operationLabel(active, category),
    active,
    approvedPendingActivation: !active && (category === "APPROVED" || category === "ACTIVATION_PENDING"),
    revisionRequired: category === "REVISION_REQUIRED",
    underReview: pendingCategories.has(category),
    desiredOnline: isDelivery ? Boolean(workState?.desiredDeliveryOnline) : Boolean(workState?.desiredRideOnline),
    effectiveOnline: isDelivery ? Boolean(workState?.effectiveDeliveryOnline) : Boolean(workState?.effectiveRideOnline),
    eligible: isDelivery ? Boolean(workState?.deliveryEligibility.eligible) : Boolean(workState?.rideEligibility.eligible),
    eligibilityReasonCode: isDelivery ? workState?.deliveryEligibility.reasonCode : workState?.rideEligibility.reasonCode,
    eligibilityReason: isDelivery ? workState?.deliveryEligibility.reason : workState?.rideEligibility.reason
  };
}

export function projectCaptainOperationalState(
  access: CaptainAccess | null | undefined,
  workState?: CaptainWorkState | null
): CaptainOperationalProjection {
  const delivery = modeProjection("DELIVERY", access, workState);
  const ride = modeProjection("RIDE", access, workState);
  const hasActiveAssignment = Boolean(workState?.activeWorkMode);
  const hasAnyActiveMode = delivery.active || ride.active;

  let overallStatus = "Application incomplete";
  if (workState?.activeWorkMode === "DELIVERY") overallStatus = "Busy with Delivery";
  else if (workState?.activeWorkMode === "RIDE") overallStatus = "Busy with Ride";
  else if (workState?.effectiveDeliveryOnline && workState.effectiveRideOnline) overallStatus = "Online for both";
  else if (workState?.effectiveDeliveryOnline) overallStatus = "Online for Delivery";
  else if (workState?.effectiveRideOnline) overallStatus = "Online for Ride";
  else if (hasAnyActiveMode) overallStatus = "Offline";
  else if (delivery.revisionRequired || ride.revisionRequired) overallStatus = "Changes requested";
  else if (delivery.approvedPendingActivation || ride.approvedPendingActivation) overallStatus = "Activation pending";
  else if (delivery.underReview || ride.underReview) overallStatus = "Under review";

  const activeLabels = [delivery.active ? "Delivery Captain" : null, ride.active ? "Ride Captain" : null].filter(Boolean);
  const pendingLabels = [
    delivery.approvedPendingActivation ? "Delivery Captain" : null,
    ride.approvedPendingActivation ? "Ride Captain" : null
  ].filter(Boolean);
  const overallMessage = hasAnyActiveMode
    ? pendingLabels.length
      ? `Your ${activeLabels.join(" and ")} access is active. ${pendingLabels.join(" and ")} activation is still pending.`
      : `Your ${activeLabels.join(" and ")} access is active.`
    : pendingLabels.length
      ? `${pendingLabels.join(" and ")} activation is pending.`
      : "Track your Captain application status here.";

  return {
    delivery,
    ride,
    hasActiveDeliveryMode: delivery.active,
    hasActiveRideMode: ride.active,
    hasAnyActiveMode,
    hasPendingApplication: delivery.underReview || ride.underReview,
    hasApprovedPendingActivation: delivery.approvedPendingActivation || ride.approvedPendingActivation,
    hasRevisionRequired: delivery.revisionRequired || ride.revisionRequired,
    hasActiveAssignment,
    activeWorkMode: workState?.activeWorkMode ?? null,
    desiredDeliveryOnline: delivery.desiredOnline,
    desiredRideOnline: ride.desiredOnline,
    effectiveDeliveryOnline: delivery.effectiveOnline,
    effectiveRideOnline: ride.effectiveOnline,
    overallStatus,
    overallMessage
  };
}
