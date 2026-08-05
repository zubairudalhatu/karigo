"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ordersApi, VendorOrderSummary } from "../src/api/orders.api";
import { notificationsApi } from "../src/api/notifications.api";
import { DashboardShell, Empty, ErrorMessage, Loading, StatusBadge } from "../src/components/dashboard";
import { useAuth } from "../src/contexts/auth-context";
import { money } from "../src/lib/errors";
import { vendorApi } from "../src/api/vendor.api";
import { launchApi } from "../src/api/launch.api";
import type { LaunchAvailabilityResponse } from "@karigo/shared-types";

export default function VendorDashboard() {
  const router = useRouter();
  const { logout } = useAuth();
  const [orders, setOrders] = useState<VendorOrderSummary[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");
  const [missingProfile, setMissingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [launchAvailability, setLaunchAvailability] = useState<LaunchAvailabilityResponse | null>(null);
  useEffect(() => {
    Promise.all([ordersApi.list(), notificationsApi.unreadCount(), vendorApi.profile()])
      .then(async ([o, n, profile]) => {
        setOrders(o);
        setUnread(n.count);
        setLaunchAvailability(await launchApi.myAvailability(profile.city).catch(() => null));
      })
      .catch((e) => {
        const message = String(e instanceof Error ? e.message : e);
        if (message.includes("Vendor profile not found")) {
          setMissingProfile(true);
          setError("");
          return;
        }
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);
  const count = (statuses: string[]) => orders.filter((order) => statuses.includes(order.orderStatus)).length;
  const operationsOnlyEnabled = launchAvailability?.services.some((service) => service.available && service.launchStage === "OPERATIONS_ONLY");
  if (loading) return <DashboardShell><Loading /></DashboardShell>;
  if (missingProfile) return <DashboardShell unread={unread}>
    <section className="card missing-profile">
      <p className="muted">Partner profile</p>
      <h1>Your partner profile is not active.</h1>
      <p>This account is signed in, but no active KariGO Partner profile is currently linked to it. If this is a new account, please complete onboarding. If this account was closed or removed, contact KariGO support.</p>
      <div className="actions">
        <a className="button-link" href="/register">Start Partner Onboarding</a>
        <button className="secondary" onClick={async () => { await logout(); router.replace("/login"); }}>Log out</button>
        <a className="button-link secondary-link" href="https://www.karigo.com.ng/contact">Contact Support</a>
      </div>
      <p className="muted">Only KariGO Admin can restore, approve or reactivate closed partner records.</p>
    </section>
  </DashboardShell>;
  return <DashboardShell unread={unread}><header className="topbar"><div><p className="muted">Partner workspace</p><h1>Operations overview</h1><p className="muted">Product sellers and SME service providers can manage the approved workspace areas for their account.</p></div><StatusBadge>Live API</StatusBadge></header><ErrorMessage>{error}</ErrorMessage>
    {launchAvailability ? <section className="notice"><strong>{launchAvailability.city.name} operational status</strong><p>{operationsOnlyEnabled ? "This approved Partner account can receive scheduled controlled production operations." : launchAvailability.services.some((service) => service.available) ? "At least one approved KariGO service is accepting new Customer activity." : "New Customer activity is currently unavailable. Catalogue management and historical orders remain accessible."}</p></section> : null}
    <div className="grid">
      <article className="card"><span className="muted">New orders</span><p className="metric">{count(["PAID", "VENDOR_CONFIRMING"])}</p></article>
      <article className="card"><span className="muted">Active orders</span><p className="metric">{count(["VENDOR_ACCEPTED", "PREPARING", "READY_FOR_PICKUP"])}</p></article>
      <article className="card"><span className="muted">Completed</span><p className="metric">{count(["COMPLETED"])}</p></article>
      <article className="card"><span className="muted">Rejected</span><p className="metric">{count(["VENDOR_REJECTED"])}</p></article>
    </div>
    <section className="section"><h2>Recent orders</h2>{orders.length ? orders.slice(0, 5).map((order) => <a className="card order-row" href={`/orders/${order.id}`} key={order.id}><div><strong>{order.orderNumber}</strong><p className="muted">{order.customerName} · {order.itemsCount} items</p></div><div><StatusBadge>{order.orderStatus.replaceAll("_", " ")}</StatusBadge><strong>{money(order.totalAmount)}</strong></div></a>) : <Empty>No new orders yet. Paid customer orders will appear here.</Empty>}</section>
  </DashboardShell>;
}
