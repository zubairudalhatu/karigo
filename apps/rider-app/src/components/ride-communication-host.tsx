import type { RideIncomingCallEvent, RideMessage } from "@karigo/shared-types";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, Vibration, View } from "react-native";
import { taxiApi } from "../api/taxi.api";
import { useAuth } from "../contexts/auth-context";
import { registerCaptainPushNotifications } from "../lib/captain-notifications";
import { claimRideMessageEvent, incrementRideUnread } from "../lib/ride-alert-state";
import { acknowledgeRideMessageDelivered, disconnectRideRealtime, isActiveRideConversation, subscribePersonalRideRealtime } from "../lib/ride-realtime";
import { Button, Card, ui } from "./ui";

type IncomingNotice = Pick<RideIncomingCallEvent, "id" | "rideId" | "rideReference" | "callerLabel">;

function notificationMetadata(notification: Notifications.Notification) {
  const data = notification.request.content.data as Record<string, unknown>;
  return data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
    ? data.metadata as Record<string, unknown>
    : data;
}

export function RideCommunicationHost() {
  const { user } = useAuth();
  const router = useRouter();
  const incomingCallIdRef = useRef<string | null>(null);
  const incomingNotificationRef = useRef<string | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [incoming, setIncoming] = useState<IncomingNotice | null>(null);
  const [responding, setResponding] = useState(false);
  const [banner, setBanner] = useState<{ rideId: string; senderLabel: string } | null>(null);

  function stopIncomingAlert() {
    Vibration.cancel();
    incomingCallIdRef.current = null;
    const id = incomingNotificationRef.current;
    incomingNotificationRef.current = null;
    if (id) void Notifications.dismissNotificationAsync(id).catch(() => undefined);
  }

  useEffect(() => {
    if (!user) {
      disconnectRideRealtime();
      setIncoming(null);
      return;
    }
    let unsubscribe: (() => void) | undefined;
    void registerCaptainPushNotifications().catch(() => undefined);
    void subscribePersonalRideRealtime({
      "ride.message.new": (message: RideMessage) => {
        if (message.senderRole !== "CUSTOMER") return;
        void acknowledgeRideMessageDelivered(message.rideId, message.id);
        if (isActiveRideConversation(message.rideId) || !claimRideMessageEvent(message.id)) return;
        incrementRideUnread(message.rideId);
        setBanner({ rideId: message.rideId, senderLabel: "Customer" });
        Vibration.vibrate(140);
        void Notifications.scheduleNotificationAsync({
          content: {
            title: "New Ride message",
            body: "Customer sent you a message",
            data: { event: "RIDE_MESSAGE_FOREGROUND_SOUND", rideId: message.rideId, messageEventId: message.id },
            sound: "karigo_message.wav"
          },
          trigger: null
        }).catch(() => undefined);
        if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
        bannerTimerRef.current = setTimeout(() => setBanner(null), 4_500);
      },
      "ride.call.incoming": (call) => {
        incomingCallIdRef.current = call.id;
        setIncoming(call);
        Vibration.vibrate([0, 500, 250, 500, 250, 800]);
        void Notifications.scheduleNotificationAsync({
          content: {
            title: "Incoming KariGO Ride call",
            body: `Ride ${call.rideReference} · ${call.callerLabel}`,
            data: { event: "RIDE_CALL_INCOMING", rideId: call.rideId, callSessionId: call.id },
            sound: "karigo_ride_call.wav"
          },
          trigger: null
        }).then((id) => {
          if (incomingCallIdRef.current === call.id) incomingNotificationRef.current = id;
          else void Notifications.dismissNotificationAsync(id).catch(() => undefined);
        }).catch(() => undefined);
      },
      "ride.call.declined": (call) => { setIncoming((current) => current?.id === call.id ? null : current); stopIncomingAlert(); },
      "ride.call.missed": (call) => { setIncoming((current) => current?.id === call.id ? null : current); stopIncomingAlert(); },
      "ride.call.remote_ended": (call) => { setIncoming((current) => current?.id === call.id ? null : current); stopIncomingAlert(); }
    }).then((cleanup) => { unsubscribe = cleanup; }).catch(() => undefined);
    const response = Notifications.addNotificationResponseReceivedListener(({ notification }) => {
      const metadata = notificationMetadata(notification);
      if (metadata.event === "RIDE_CALL_INCOMING" && typeof metadata.rideId === "string" && typeof metadata.callSessionId === "string") {
        router.push(`/ride-call/${metadata.rideId}?mode=accept&sessionId=${metadata.callSessionId}` as never);
      } else if (metadata.event === "RIDE_MESSAGE" && typeof metadata.rideId === "string") {
        router.push(`/ride-chat/${metadata.rideId}` as never);
      }
    });
    const received = Notifications.addNotificationReceivedListener((notification) => {
      const metadata = notificationMetadata(notification);
      if (metadata.event === "RIDE_MESSAGE" && typeof metadata.rideId === "string" && typeof metadata.messageEventId === "string" && claimRideMessageEvent(metadata.messageEventId)) {
        incrementRideUnread(metadata.rideId);
      }
    });
    return () => { unsubscribe?.(); response.remove(); received.remove(); stopIncomingAlert(); if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current); };
  }, [user?.id]);

  async function decline() {
    if (!incoming || responding) return;
    setResponding(true);
    try {
      await taxiApi.declineCall(incoming.rideId, incoming.id);
      setIncoming(null);
      stopIncomingAlert();
    } finally {
      setResponding(false);
    }
  }

  function accept() {
    if (!incoming || responding) return;
    const current = incoming;
    setIncoming(null);
    stopIncomingAlert();
    router.push(`/ride-call/${current.rideId}?mode=accept&sessionId=${current.id}` as never);
  }

  return <>
    {banner ? <Pressable accessibilityRole="button" accessibilityLabel="Open new Ride message" onPress={() => { const current = banner; setBanner(null); router.push(`/ride-chat/${current.rideId}` as never); }} style={styles.banner}>
      <Text style={styles.bannerTitle}>New Ride message</Text>
      <Text style={styles.bannerBody}>{banner.senderLabel} sent you a message</Text>
    </Pressable> : null}
    <Modal visible={Boolean(incoming)} transparent animationType="fade" onRequestClose={() => void decline()}>
    <View style={styles.backdrop}><Card><View style={styles.card}>
      <Text style={styles.title}>Incoming KariGO Ride call</Text>
      <Text style={styles.caller}>{incoming?.callerLabel ?? "Ride participant"}</Text>
      <Text style={ui.muted}>Ride {incoming?.rideReference}</Text>
      <Text style={ui.muted}>Audio only · not recorded</Text>
      <View style={styles.actions}>
        <Button title={responding ? "Declining..." : "Decline"} tone="muted" disabled={responding} onPress={() => void decline()} />
        <Button title="Accept" disabled={responding} onPress={accept} />
      </View>
    </View></Card></View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(0,0,0,0.72)" },
  card: { gap: 12 },
  title: { fontSize: 22, fontWeight: "900" },
  caller: { fontSize: 30, fontWeight: "900" },
  actions: { gap: 10, marginTop: 10 },
  banner: { backgroundColor: "#1F2937", borderLeftColor: "#E31E24", borderLeftWidth: 5, borderRadius: 14, elevation: 8, gap: 3, left: 18, padding: 14, position: "absolute", right: 18, top: 56, zIndex: 1000 },
  bannerTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  bannerBody: { color: "#F3F4F6", fontSize: 13 }
});
