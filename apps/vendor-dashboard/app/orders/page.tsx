"use client";
import { useEffect, useState } from "react";
import { ordersApi, VendorOrderSummary } from "../../src/api/orders.api";
import { DashboardShell, Empty, ErrorMessage, Loading, StatusBadge } from "../../src/components/dashboard";
import { friendlyError, money } from "../../src/lib/errors";
export default function Orders() {
  const [orders, setOrders] = useState<VendorOrderSummary[]>([]); const [status, setStatus] = useState(""); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { setLoading(true); ordersApi.list(status || undefined).then(setOrders).catch((e) => setError(friendlyError(e))).finally(() => setLoading(false)); }, [status]);
  return <DashboardShell><header className="topbar"><div><p className="muted">Fulfilment</p><h1>Orders</h1></div></header><div className="filters"><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option value="PAID">New paid</option><option value="VENDOR_ACCEPTED">Accepted</option><option value="PREPARING">Preparing</option><option value="READY_FOR_PICKUP">Ready</option><option value="COMPLETED">Completed</option><option value="VENDOR_REJECTED">Rejected</option></select></div><ErrorMessage>{error}</ErrorMessage>{loading ? <Loading /> : orders.length ? <section className="section">{orders.map((order) => <a className="card order-row" href={`/orders/${order.id}`} key={order.id}><div><strong>{order.orderNumber}</strong><p className="muted">{order.customerName} · {order.deliveryAddress ?? "No delivery address"}</p></div><div><StatusBadge>{order.orderStatus.replaceAll("_", " ")}</StatusBadge><strong>{money(order.totalAmount)}</strong></div></a>)}</section> : <Empty>No orders match this view.</Empty>}</DashboardShell>;
}
