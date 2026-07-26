import type { BadgeTone } from "../components/ui";

const labelOverrides: Record<string, string> = {
  APPROVED: "Approved",
  ARCHIVED: "Archived",
  ASSIGNED: "Assigned",
  CANCELLED: "Cancelled",
  CASH_ON_DELIVERY: "Pay on Delivery",
  CASH_PENDING: "Pay on Delivery pending",
  CLOSED: "Closed",
  DELIVERED: "Delivered",
  FLUTTERWAVE: "Flutterwave",
  INACTIVE: "Inactive",
  PAID: "Paid",
  PAYMENT_PENDING: "Payment pending",
  PENDING: "Pending",
  PREPARING: "Preparing",
  READY: "Ready",
  READY_FOR_PICKUP: "Ready for pickup",
  REJECTED: "Rejected",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  VENDOR_ACCEPTED: "Accepted"
};

export function formatLabel(value?: string | null, fallback = "Pending") {
  if (!value) return fallback;
  const normalized = value.trim();
  if (!normalized) return fallback;
  const upper = normalized.toUpperCase();
  if (labelOverrides[upper]) return labelOverrides[upper];
  return upper
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function statusTone(value?: string | null): BadgeTone {
  const normalized = value?.toUpperCase() ?? "";
  if (["APPROVED", "ACTIVE", "OPEN", "PAID", "DELIVERED", "READY", "READY_FOR_PICKUP"].includes(normalized)) {
    return "success";
  }
  if (["PENDING", "PAYMENT_PENDING", "CASH_PENDING", "SUBMITTED", "UNDER_REVIEW", "PREPARING", "ASSIGNED"].includes(normalized)) {
    return "info";
  }
  if (["CLOSED", "INACTIVE", "ARCHIVED", "REJECTED", "CANCELLED", "SUSPENDED", "DELETED", "TRASHED"].includes(normalized)) {
    return "warning";
  }
  return "neutral";
}

export function money(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return `NGN ${Number.isFinite(amount) ? amount.toLocaleString() : "0"}`;
}
