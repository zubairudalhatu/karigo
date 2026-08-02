import type { CaptainAccess } from "../api/captain-access.api";

export type CaptainApplicationMode = "DELIVERY_CAPTAIN" | "RIDE_CAPTAIN";
export type CaptainApplicationCategory =
  | "NOT_STARTED"
  | "DRAFT_ALLOWED"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "REVISION_REQUIRED"
  | "REJECTED"
  | "PROVISIONALLY_APPROVED"
  | "APPROVED"
  | "ACTIVATION_PENDING"
  | "ACTIVE";

export type CaptainApplicationSummary =
  | CaptainAccess["deliveryCaptainApplication"]
  | CaptainAccess["rideCaptainApplication"];

const submittedStatuses = new Set(["SUBMITTED", "PENDING", "PENDING_REVIEW"]);
const reviewStatuses = new Set(["UNDER_REVIEW", "IN_REVIEW", "DOCUMENT_REVIEW", "DOCUMENTS_UNDER_REVIEW", "REVIEWING"]);
const revisionStatuses = new Set(["REVISION_REQUIRED", "CHANGES_REQUESTED", "DOCUMENT_REVISION_REQUIRED"]);
const rejectedStatuses = new Set(["REJECTED", "DECLINED", "CANCELLED"]);
const provisionalStatuses = new Set(["PROVISIONALLY_APPROVED", "CONDITIONALLY_APPROVED"]);
const approvalStatuses = new Set(["APPROVED"]);
const activeStatuses = new Set(["ACTIVE", "VERIFIED", "OPERATIONAL"]);

export function normalizeCaptainStatus(status?: string | null) {
  return (status ?? "").trim().replaceAll(" ", "_").replaceAll("-", "_").toUpperCase();
}

export function classifyCaptainApplication(status?: string | null): CaptainApplicationCategory {
  const normalized = normalizeCaptainStatus(status);
  if (!normalized) return "NOT_STARTED";
  if (submittedStatuses.has(normalized)) return "SUBMITTED";
  if (reviewStatuses.has(normalized)) return "UNDER_REVIEW";
  if (revisionStatuses.has(normalized)) return "REVISION_REQUIRED";
  if (rejectedStatuses.has(normalized)) return "REJECTED";
  if (provisionalStatuses.has(normalized)) return "PROVISIONALLY_APPROVED";
  if (normalized === "APPROVED_PENDING_ACTIVATION" || normalized === "ACTIVATION_PENDING") return "ACTIVATION_PENDING";
  if (approvalStatuses.has(normalized)) return "APPROVED";
  if (activeStatuses.has(normalized)) return "ACTIVE";
  return "UNDER_REVIEW";
}

export function hasSubmittedCaptainApplication(application?: CaptainApplicationSummary | null): application is Extract<CaptainApplicationSummary, { exists: true }> {
  return application?.exists === true;
}

export function hasAnyCaptainApplication(access?: CaptainAccess | null) {
  return Boolean(hasSubmittedCaptainApplication(access?.deliveryCaptainApplication) || hasSubmittedCaptainApplication(access?.rideCaptainApplication));
}

export function hasActiveReviewLock(application?: CaptainApplicationSummary | null) {
  if (!hasSubmittedCaptainApplication(application)) return false;
  return classifyCaptainApplication(application.status) !== "NOT_STARTED";
}

export function isApplicationEditable(application?: CaptainApplicationSummary | null) {
  if (!hasSubmittedCaptainApplication(application)) return true;
  const category = classifyCaptainApplication(application.status);
  return category === "DRAFT_ALLOWED";
}

export function categoryLabel(category: CaptainApplicationCategory) {
  switch (category) {
    case "NOT_STARTED":
      return "Application incomplete";
    case "DRAFT_ALLOWED":
      return "Application incomplete";
    case "SUBMITTED":
      return "Submitted";
    case "UNDER_REVIEW":
      return "Under review";
    case "REVISION_REQUIRED":
      return "Revision required";
    case "REJECTED":
      return "Rejected";
    case "PROVISIONALLY_APPROVED":
      return "Provisionally approved";
    case "APPROVED":
      return "Approved";
    case "ACTIVATION_PENDING":
      return "Activation pending";
    case "ACTIVE":
      return "Active";
    default:
      return "Under review";
  }
}

export function applicationModeLabel(mode: CaptainApplicationMode) {
  return mode === "DELIVERY_CAPTAIN" ? "Delivery Captain" : "Ride Captain";
}

export function applicationStatusLabel(application?: CaptainApplicationSummary | null) {
  return categoryLabel(classifyCaptainApplication(hasSubmittedCaptainApplication(application) ? application.status : undefined));
}

export function captainHeroStatus(access?: CaptainAccess | null, profileStatus?: { verificationStatus?: string | null; availabilityStatus?: string | null } | null) {
  if (access?.operationalModes.includes("RIDE_CAPTAIN") && !profileStatus) return "Active";
  if (profileStatus?.verificationStatus === "ACTIVE") {
    if (profileStatus.availabilityStatus === "BUSY") return "On delivery";
    if (profileStatus.availabilityStatus === "ONLINE") return "Online";
    if (profileStatus.availabilityStatus === "OFFLINE") return "Offline";
    return "Unavailable";
  }

  const delivery = hasSubmittedCaptainApplication(access?.deliveryCaptainApplication)
    ? classifyCaptainApplication(access.deliveryCaptainApplication.status)
    : "NOT_STARTED";
  const ride = hasSubmittedCaptainApplication(access?.rideCaptainApplication)
    ? classifyCaptainApplication(access.rideCaptainApplication.status)
    : "NOT_STARTED";

  if (delivery === "REVISION_REQUIRED" || ride === "REVISION_REQUIRED") return "Revision required";
  if (delivery === "REJECTED" && ride === "REJECTED") return "Rejected";
  if (delivery === "PROVISIONALLY_APPROVED" || ride === "PROVISIONALLY_APPROVED") return "Provisionally approved";
  if (delivery === "ACTIVATION_PENDING" || ride === "ACTIVATION_PENDING") return "Activation pending";
  if (delivery === "APPROVED" || ride === "APPROVED") return "Approved";
  if (delivery === "UNDER_REVIEW" || ride === "UNDER_REVIEW") return "Under review";
  if (delivery === "SUBMITTED" || ride === "SUBMITTED") return "Submitted";
  return "Application incomplete";
}

export function applicantReviewCopy(application?: CaptainApplicationSummary | null, mode: CaptainApplicationMode = "DELIVERY_CAPTAIN") {
  if (!hasSubmittedCaptainApplication(application)) {
    return `Complete your ${applicationModeLabel(mode)} application when you are ready.`;
  }
  const modeLabel = applicationModeLabel(mode);
  const activationLabel = mode === "RIDE_CAPTAIN" ? "Ride activation" : `${modeLabel} activation`;
  const category = classifyCaptainApplication(application.status);
  if (category === "REVISION_REQUIRED") {
    return application.applicantVisibleNote || `KariGO needs an update before your ${modeLabel} application can continue.`;
  }
  if (category === "REJECTED") {
    return application.applicantVisibleNote || `Your ${modeLabel} application was not approved.`;
  }
  if (category === "APPROVED") {
    return `Your ${modeLabel} application has been approved. KariGO Operations is completing your ${activationLabel}.`;
  }
  if (category === "PROVISIONALLY_APPROVED") {
    return `Your ${modeLabel} application passed initial review. Final checks remain.`;
  }
  if (category === "ACTIVATION_PENDING") {
    return `Your ${modeLabel} application is approved and waiting for Operations activation.`;
  }
  if (category === "ACTIVE") {
    return `Your ${modeLabel} access is active.`;
  }
  return application.message || `Your ${modeLabel} application is waiting for KariGO review.`;
}

export function overallReviewState(access?: CaptainAccess | null) {
  const statuses = [
    hasSubmittedCaptainApplication(access?.deliveryCaptainApplication) ? classifyCaptainApplication(access.deliveryCaptainApplication.status) : null,
    hasSubmittedCaptainApplication(access?.rideCaptainApplication) ? classifyCaptainApplication(access.rideCaptainApplication.status) : null
  ].filter(Boolean) as CaptainApplicationCategory[];

  if (!statuses.length) return "NOT_STARTED";
  if (statuses.includes("REVISION_REQUIRED")) return "REVISION_REQUIRED";
  if (statuses.includes("UNDER_REVIEW")) return "UNDER_REVIEW";
  if (statuses.includes("SUBMITTED")) return "SUBMITTED";
  if (statuses.includes("PROVISIONALLY_APPROVED")) return "PROVISIONALLY_APPROVED";
  if (statuses.includes("ACTIVATION_PENDING")) return "ACTIVATION_PENDING";
  if (statuses.includes("APPROVED")) return "APPROVED";
  if (statuses.every((status) => status === "ACTIVE")) return "ACTIVE";
  if (statuses.every((status) => status === "REJECTED")) return "REJECTED";
  return "UNDER_REVIEW";
}

export function formatCaptainDate(value?: string | null) {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}
