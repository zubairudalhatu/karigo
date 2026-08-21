"use client";
import { useEffect, useState } from "react";
import { dashboardApi, DashboardMetrics } from "../src/api/dashboard.api";
import { PortalShell, ErrorMessage, Loading } from "../src/components/portal";
import { friendlyError, money } from "../src/lib/errors";
export default function AdminDashboard() {
  const [data, setData] = useState<DashboardMetrics | null>(null); const [error, setError] = useState("");
  useEffect(() => { dashboardApi.get().then(setData).catch((e) => setError(friendlyError(e))); }, []);
  if (!data && !error) return <PortalShell><Loading /></PortalShell>;
  const metricGroups = data ? [
    { title: "Operations", metrics: [["Total orders", data.totalOrders], ["Orders today", data.ordersToday], ["Active orders", data.activeOrders], ["Completed", data.completedOrders]] },
    { title: "Customers & supply", metrics: [["Total users", data.totalUsers], ["Customers", data.totalCustomers], ["Active vendors", data.activeVendors], ["Online captains", data.onlineRiders]] },
    { title: "Transactions", metrics: [["GMV", money(data.grossMerchandiseValue)], ["Delivery fees", money(data.deliveryFeeTotal)], ["Pending vendor settlements", money(data.pendingVendorSettlements)], ["Pending captain earnings", money(data.pendingRiderEarnings)]] },
    { title: "Exceptions & support", metrics: [["Cancelled", data.cancelledOrders], ["Failed", data.failedOrders], ["Pending tickets", data.pendingSupportTickets], ["Open refunds", data.openRefundRequests]] }
  ] : [];
  return <PortalShell>
    <header className="topbar"><div><p className="page-kicker">Operations control centre</p><h1>KariGO pilot overview</h1><p className="muted">A compact view of demand, supply, transactions and exceptions.</p></div></header>
    <ErrorMessage>{error}</ErrorMessage>
    <div className="dashboard-groups">{metricGroups.map((group) => <section className="dashboard-group" key={group.title}>
      <header><h2>{group.title}</h2><span>{group.metrics.length} indicators</span></header>
      <div className="grid metric-grid">{group.metrics.map(([label, value]) => <article className="card metric-card" key={String(label)}>
        <span className="muted">{label}</span><p className="metric">{value}</p>
      </article>)}</div>
    </section>)}</div>
  </PortalShell>;
}
