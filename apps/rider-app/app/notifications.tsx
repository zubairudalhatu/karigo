import type { NotificationSummary } from "@karigo/shared-types";
import { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import { notificationsApi } from "../src/api/notifications.api";
import { Button, Card, Empty, Message, Protected, Screen, ui } from "../src/components/ui";
import { friendlyError } from "../src/lib/errors";
export default function Notifications() {
  const [items, setItems] = useState<NotificationSummary[]>([]); const [error, setError] = useState("");
  const load = () => notificationsApi.list().then(setItems).catch((e) => setError(friendlyError(e)));
  useEffect(() => { void load(); }, []);
  return <Protected><Screen title="Activity feed"><Button tone="muted" title="Mark all read" onPress={async () => { await notificationsApi.markAllRead(); await load(); }} /><Message error>{error}</Message>
    {!items.length ? <Empty message="Delivery and account updates will appear here." /> : items.map((item) => <Pressable key={item.id} onPress={async () => { if (!item.isRead) { await notificationsApi.markRead(item.id); await load(); } }}><Card><Text style={ui.title}>{item.isRead ? "" : "New: "}{item.title}</Text><Text>{item.message}</Text><Text style={ui.muted}>{new Date(item.createdAt).toLocaleString()}</Text></Card></Pressable>)}
  </Screen></Protected>;
}
