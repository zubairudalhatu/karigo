import { Feather } from "@expo/vector-icons";
import type { NotificationSummary } from "@karigo/shared-types";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { brand } from "@karigo/config";
import { notificationsApi } from "../src/api/notifications.api";
import { Button, Card, Empty, Message, Protected, Screen, ui } from "../src/components/ui";
import { friendlyError } from "../src/lib/errors";

function categoryIcon(item: NotificationSummary): keyof typeof Feather.glyphMap {
  const source = `${item.type} ${item.entityType ?? ""}`.toUpperCase();
  if (source.includes("RIDE") || source.includes("TAXI")) return "map-pin";
  if (source.includes("ORDER") || source.includes("DELIVERY") || source.includes("RIDER")) return "briefcase";
  if (source.includes("APPLICATION") || source.includes("DOCUMENT")) return "file-text";
  if (source.includes("EARNING") || source.includes("PAYOUT")) return "credit-card";
  if (source.includes("SECURITY") || source.includes("AUTH")) return "shield";
  return "bell";
}

function targetFor(item: NotificationSummary): string {
  if (item.type === "SYSTEM_ALERT" && item.entityType === "TaxiTrip" && item.entityId) return `/ride-chat/${item.entityId}`;
  const source = `${item.type} ${item.entityType ?? ""}`.toUpperCase();
  if (source.includes("RIDE") || source.includes("TAXI")) return "/tabs/dashboard";
  if (source.includes("DELIVERY") || source.includes("RIDER_ASSIGNED") || source.includes("ORDER")) {
    return item.entityType === "Order" && item.entityId ? `/jobs/${item.entityId}` : "/jobs";
  }
  if (source.includes("DOCUMENT") && source.includes("REVISION")) return "/delivery-application-revision";
  if (source.includes("APPLICATION") || source.includes("ACTIVATION")) return "/application-status";
  if (source.includes("EARNING") || source.includes("PAYOUT")) return "/earnings";
  if (source.includes("SECURITY") || source.includes("AUTH")) return "/profile";
  return "/notifications";
}

export default function Notifications() {
  const [items, setItems] = useState<NotificationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const unreadCount = useMemo(() => items.filter((item) => !item.isRead).length, [items]);

  async function load() {
    setLoading(true);
    try {
      setItems(await notificationsApi.list());
      setError("");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function openNotification(item: NotificationSummary) {
    try {
      if (!item.isRead) await notificationsApi.markRead(item.id);
      await load();
      router.push(targetFor(item) as never);
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  async function markAllRead() {
    try {
      await notificationsApi.markAllRead();
      await load();
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return <Protected><Screen title="Notifications" subtitle="Updates about assignments, applications and your Captain account will appear here." refreshing={loading} onRefresh={load}>
    <View style={ui.spaceBetween}>
      <Text style={ui.muted}>{unreadCount ? `${unreadCount} unread` : "All caught up"}</Text>
      <Button tone="muted" title="Mark all read" disabled={!unreadCount} onPress={markAllRead} />
    </View>
    <Message error>{error}</Message>
    {!items.length ? <Empty message="No notifications yet. Updates about assignments, applications and your Captain account will appear here." /> : items.map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => openNotification(item)}>
      <Card tone={item.isRead ? "default" : "soft"}>
        <View style={styles.notificationRow}>
          <View style={[styles.iconWrap, !item.isRead && styles.iconWrapUnread]}>
            <Feather name={categoryIcon(item)} size={18} color={!item.isRead ? brand.colors.primary : brand.colors.muted} />
          </View>
          <View style={styles.notificationCopy}>
            <View style={ui.spaceBetween}>
              <Text style={styles.title}>{item.title}</Text>
              {!item.isRead ? <Text style={styles.unreadDot}>New</Text> : null}
            </View>
            <Text style={ui.muted}>{item.message}</Text>
            <Text style={styles.timestamp}>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
        </View>
      </Card>
    </Pressable>)}
  </Screen></Protected>;
}

const styles = StyleSheet.create({
  notificationRow: { flexDirection: "row", gap: 12 },
  notificationCopy: { flex: 1, gap: 5 },
  iconWrap: { alignItems: "center", backgroundColor: "#F3F4F6", borderRadius: 16, height: 36, justifyContent: "center", width: 36 },
  iconWrapUnread: { backgroundColor: "#FEF2F2" },
  title: { color: brand.colors.charcoal, flex: 1, fontSize: 16, fontWeight: "900" },
  unreadDot: { backgroundColor: brand.colors.primary, borderRadius: 999, color: brand.colors.white, fontSize: 10, fontWeight: "900", overflow: "hidden", paddingHorizontal: 8, paddingVertical: 4 },
  timestamp: { color: brand.colors.muted, fontSize: 12, fontWeight: "700" }
});
