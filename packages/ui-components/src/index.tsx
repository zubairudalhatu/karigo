import type { CSSProperties, ReactNode } from "react";
import { brand } from "@karigo/config";

const labelStatus = (status: string) => status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const badgeColors = (status: string) => {
  if (["PAID", "COMPLETED", "DELIVERED", "ACTIVE", "RESOLVED"].includes(status)) return { background: "#DCFCE7", color: "#166534" };
  if (["FAILED", "CANCELLED", "VENDOR_REJECTED", "REFUNDED", "CRITICAL", "INACTIVE"].includes(status)) return { background: "#FEE2E2", color: "#991B1B" };
  if (["PREPARING", "READY_FOR_PICKUP", "RIDER_ASSIGNED", "ON_THE_WAY", "OPEN", "HIGH"].includes(status)) return { background: "#FEF3C7", color: "#92400E" };
  return { background: "#DBEAFE", color: "#1E40AF" };
};

export function StatusBadge({ children }: { children: ReactNode }) {
  const status = typeof children === "string" ? children.toUpperCase().replaceAll(" ", "_") : "";
  const style: CSSProperties = {
    ...badgeColors(status),
    borderRadius: 999,
    display: "inline-flex",
    fontSize: 12,
    fontWeight: 700,
    padding: "6px 10px"
  };

  return <span style={style}>{typeof children === "string" ? labelStatus(children) : children}</span>;
}

export function EmptyState({ title = "Nothing here yet", children }: { title?: string; children: ReactNode }) {
  return <div style={{ background: brand.colors.white, border: `1px dashed ${brand.colors.border}`, borderRadius: 16, color: brand.colors.muted, display: "grid", gap: 6, padding: 28, textAlign: "center" }}><strong style={{ color: brand.colors.charcoal }}>{title}</strong><span>{children}</span></div>;
}

export function MetricCard({ label, value }: { label: string; value: ReactNode }) {
  return <article style={{ background: brand.colors.white, border: `1px solid ${brand.colors.border}`, borderRadius: 16, padding: 20 }}><span style={{ color: brand.colors.muted }}>{label}</span><p style={{ color: brand.colors.charcoal, fontSize: 30, fontWeight: 800, margin: "8px 0 0" }}>{value}</p></article>;
}
