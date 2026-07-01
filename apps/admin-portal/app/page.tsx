"use client";
import { useEffect, useState } from "react";
import { dashboardApi, DashboardMetrics } from "../src/api/dashboard.api";
import { PortalShell, ErrorMessage, Loading } from "../src/components/portal";
import { friendlyError, money } from "../src/lib/errors";
export default function AdminDashboard() {
  const [data, setData] = useState<DashboardMetrics | null>(null); const [error, setError] = useState("");
  useEffect(() => { dashboardApi.get().then(setData).catch((e) => setError(friendlyError(e))); }, []);
  if (!data && !error) return <PortalShell><Loading /></PortalShell>;
  const metrics = data ? [["Total users", data.totalUsers], ["Customers", data.totalCustomers], ["Active vendors", data.activeVendors], ["Online riders", data.onlineRiders], ["Total orders", data.totalOrders], ["Orders today", data.ordersToday], ["Active orders", data.activeOrders], ["Completed", data.completedOrders], ["Cancelled", data.cancelledOrders], ["Failed", data.failedOrders], ["Pending tickets", data.pendingSupportTickets], ["Open refunds", data.openRefundRequests], ["GMV", money(data.grossMerchandiseValue)], ["Delivery fees", money(data.deliveryFeeTotal)], ["Pending vendor settlements", money(data.pendingVendorSettlements)], ["Pending rider earnings", money(data.pendingRiderEarnings)]] : [];
  return <PortalShell><header className="topbar"><div><p className="muted">Operations control centre</p><h1>KariGO pilot overview</h1></div></header><ErrorMessage>{error}</ErrorMessage><div className="grid">{metrics.map(([label, value]) => <article className="card" key={String(label)}><span className="muted">{label}</span><p className="metric">{value}</p></article>)}</div></PortalShell>;
}
