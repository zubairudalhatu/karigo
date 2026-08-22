import type { RideIncomingCallEvent } from "@karigo/shared-types";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Modal, Platform, StyleSheet, Text, Vibration, View } from "react-native";
import { notificationsApi } from "../api/notifications.api";
import { taxiApi } from "../api/taxi.api";
import { useAuth } from "../contexts/auth-context";
import { disconnectRideRealtime, isActiveRideConversation, subscribePersonalRideRealtime } from "../lib/ride-realtime";
import { Button, Card, ui } from "./ui";

type IncomingNotice = Pick<RideIncomingCallEvent, "id" | "rideId" | "rideReference" | "callerLabel">;

function notificationMetadata(notification: Notifications.Notification) {
  const data = notification.request.content.data as Record<string, unknown>;
  return data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
    ? data.metadata as Record<string, unknown>
    : data;
}

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const metadata = notificationMetadata(notification);
    const quietConversation = metadata.event === "RIDE_MESSAGE" && isActiveRideConversation(metadata.rideId);
    return {
      shouldPlaySound: !quietConversation,
      shouldSetBadge: false,
      shouldShowBanner: !quietConversation,
      shouldShowList: !quietConversation
    };
  }
});

async function registerCustomerPush() {
  if (!Device.isDevice || (Platform.OS !== "android" && Platform.OS !== "ios")) return;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("ride-calls", {
      name: "KariGO Ride calls",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500, 250, 800],
      sound: "karigo-ride-call.wav",
      lightColor: "#D90000"
    });
    await Notifications.setNotificationChannelAsync("ride-messages", {
      name: "KariGO Ride messages",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 150],
      sound: "karigo-message.wav",
      lightColor: "#D90000"
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.granted ? existing : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await notificationsApi.registerDeviceToken({
    token,
    platform: Platform.OS === "ios" ? "IOS" : "ANDROID",
    provider: "EXPO",
    appSurface: "CUSTOMER_APP",
    deviceId: Device.osBuildId ?? undefined
  });
}

export function RideCommunicationHost() {
  const { user } = useAuth();
  const router = useRouter();
  const [incoming, setIncoming] = useState<IncomingNotice | null>(null);
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    if (!user) {
      disconnectRideRealtime();
      setIncoming(null);
      return;
    }
    let unsubscribe: (() => void) | undefined;
    void registerCustomerPush().catch(() => undefined);
    void subscribePersonalRideRealtime({
      "ride.call.incoming": (call) => {
        setIncoming(call);
        Vibration.vibrate([0, 500, 250, 500, 250, 800]);
        void Notifications.scheduleNotificationAsync({
          content: {
            title: "Incoming KariGO Ride call",
            body: `Ride ${call.rideReference} · ${call.callerLabel}`,
            data: { event: "RIDE_CALL_INCOMING", rideId: call.rideId, callSessionId: call.id },
            sound: "karigo-ride-call.wav"
          },
          trigger: null
        }).catch(() => undefined);
      },
      "ride.call.declined": (call) => setIncoming((current) => current?.id === call.id ? null : current),
      "ride.call.missed": (call) => setIncoming((current) => current?.id === call.id ? null : current),
      "ride.call.remote_ended": (call) => setIncoming((current) => current?.id === call.id ? null : current)
    }).then((cleanup) => { unsubscribe = cleanup; }).catch(() => undefined);

    const response = Notifications.addNotificationResponseReceivedListener(({ notification }) => {
      const metadata = notificationMetadata(notification);
      if (metadata.event === "RIDE_CALL_INCOMING" && typeof metadata.rideId === "string" && typeof metadata.callSessionId === "string") {
        router.push(`/taxi/call/${metadata.rideId}?mode=accept&sessionId=${metadata.callSessionId}` as never);
      } else if (metadata.event === "RIDE_MESSAGE" && typeof metadata.rideId === "string") {
        router.push(`/taxi/chat/${metadata.rideId}` as never);
      }
    });
    return () => { unsubscribe?.(); response.remove(); };
  }, [user?.id]);

  async function decline() {
    if (!incoming || responding) return;
    setResponding(true);
    try {
      await taxiApi.declineCall(incoming.rideId, incoming.id);
      setIncoming(null);
      Vibration.cancel();
    } finally {
      setResponding(false);
    }
  }

  function accept() {
    if (!incoming || responding) return;
    const current = incoming;
    setIncoming(null);
    Vibration.cancel();
    router.push(`/taxi/call/${current.rideId}?mode=accept&sessionId=${current.id}` as never);
  }

  return <Modal visible={Boolean(incoming)} transparent animationType="fade" onRequestClose={() => void decline()}>
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
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(0,0,0,0.72)" },
  card: { gap: 12 },
  title: { fontSize: 22, fontWeight: "900" },
  caller: { fontSize: 30, fontWeight: "900" },
  actions: { gap: 10, marginTop: 10 }
});
