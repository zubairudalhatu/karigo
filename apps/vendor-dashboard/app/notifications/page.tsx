"use client";

import { useEffect, useState } from "react";
import type { NotificationSummary } from "@karigo/shared-types";
import { DashboardShell, Empty, ErrorMessage } from "../../src/components/dashboard";
import { notificationsApi } from "../../src/api/notifications.api";
import { friendlyError } from "../../src/lib/errors";

const formatDate = (value: string) => new Date(value).toLocaleString();

export default function Notifications() {
  const [items, setItems] = useState<NotificationSummary[]>([]);
  const [error, setError] = useState("");
  const load = () => notificationsApi.list().then(setItems).catch((e) => setError(friendlyError(e)));
  useEffect(() => { void load(); }, []);

  return (
    <DashboardShell>
      <header className="topbar">
        <div>
          <p className="muted">Account activity</p>
          <h1>Notifications</h1>
        </div>
        <button className="secondary" onClick={async () => { await notificationsApi.markAllRead(); await load(); }}>Mark all read</button>
      </header>
      <ErrorMessage>{error}</ErrorMessage>
      <section className="section">
        {items.length ? items.map((item) => (
          <button
            className={`notification-card ${item.isRead ? "" : "unread"}`}
            key={item.id}
            onClick={async () => {
              if (!item.isRead) {
                await notificationsApi.markRead(item.id);
                await load();
              }
            }}
          >
            <span className="notification-title">{item.isRead ? "" : "New: "}{item.title}</span>
            <span className="notification-message">{item.message}</span>
            <span className="notification-time">{formatDate(item.createdAt)}</span>
          </button>
        )) : <Empty>Your vendor activity will appear here.</Empty>}
      </section>
    </DashboardShell>
  );
}
