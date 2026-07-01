"use client";
import type { NotificationSummary } from "@karigo/shared-types";
import { useEffect, useState } from "react";
import { notificationsApi } from "../../src/api/notifications.api";
import { DashboardShell, Empty, ErrorMessage } from "../../src/components/dashboard";
import { friendlyError } from "../../src/lib/errors";
export default function Notifications() {
  const [items, setItems] = useState<NotificationSummary[]>([]); const [error, setError] = useState(""); const load = () => notificationsApi.list().then(setItems).catch((e) => setError(friendlyError(e))); useEffect(() => { void load(); }, []);
  return <DashboardShell><header className="topbar"><div><p className="muted">Account activity</p><h1>Notifications</h1></div><button className="secondary" onClick={async () => { await notificationsApi.markAllRead(); await load(); }}>Mark all read</button></header><ErrorMessage>{error}</ErrorMessage><section className="section">{items.length ? items.map((item) => <button className="card secondary" style={{ textAlign: "left" }} key={item.id} onClick={async () => { if (!item.isRead) { await notificationsApi.markRead(item.id); await load(); } }}><strong>{item.isRead ? "" : "New: "}{item.title}</strong><span>{item.message}</span><span className="muted">{new Date(item.createdAt).toLocaleString()}</span></button>) : <Empty>Your vendor activity will appear here.</Empty>}</section></DashboardShell>;
}
