"use client";
import { useEffect, useState } from "react";
import { ordersApi, VendorOrderSummary } from "../src/api/orders.api";
import { notificationsApi } from "../src/api/notifications.api";
import { DashboardShell, Empty, ErrorMessage, Loading, StatusBadge } from "../src/components/dashboard";
import { money } from "../src/lib/errors";

export default function VendorDashboard() {
  const [orders, setOrders] = useState<VendorOrderSummary[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { Promise.all([ordersApi.list(), notificationsApi.unreadCount()]).then(([o, n]) => { setOrders(o); setUnread(n.count); }).catch((e) => setError(String(e instanceof Error ? e.message : e))).finally(() => setLoading(false)); }, []);
  const count = (statuses: string[]) => orders.filter((order) => statuses.includes(order.orderStatus)).length;
  if (loading) return <DashboardShell><Loading /></DashboardShell>;
  return <DashboardShell unread={unread}><header className="topbar"><div><p className="muted">Vendor workspace</p><h1>Operations overview</h1></div><StatusBadge>Live API</StatusBadge></header><ErrorMessage>{error}</ErrorMessage>
    <div className="grid">
      <article className="card"><span className="muted">New orders</span><p className="metric">{count(["PAID", "VENDOR_CONFIRMING"])}</p></article>
      <article className="card"><span className="muted">Active orders</span><p className="metric">{count(["VENDOR_ACCEPTED", "PREPARING", "READY_FOR_PICKUP"])}</p></article>
      <article className="card"><span className="muted">Completed</span><p className="metric">{count(["COMPLETED"])}</p></article>
      <article className="card"><span className="muted">Rejected</span><p className="metric">{count(["VENDOR_REJECTED"])}</p></article>
    </div>
    <section className="section"><h2>Recent orders</h2>{orders.length ? orders.slice(0, 5).map((order) => <a className="card order-row" href={`/orders/${order.id}`} key={order.id}><div><strong>{order.orderNumber}</strong><p className="muted">{order.customerName} · {order.itemsCount} items</p></div><div><StatusBadge>{order.orderStatus.replaceAll("_", " ")}</StatusBadge><strong>{money(order.totalAmount)}</strong></div></a>) : <Empty>No new orders yet. Paid customer orders will appear here.</Empty>}</section>
  </DashboardShell>;
}
