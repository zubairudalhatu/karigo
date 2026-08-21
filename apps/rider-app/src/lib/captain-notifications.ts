import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { notificationsApi } from "../api/notifications.api";

const ASSIGNMENT_ENTITY_TYPES = new Set(["TaxiTrip", "Order"]);
let presenceNotificationId: string | null = null;


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

function notificationData(notification: Notifications.Notification) {
  return notification.request.content.data as Record<string, unknown>;
}

export function isCaptainAssignmentNotification(notification: Notifications.Notification) {
  const data = notificationData(notification);
  return data.event === "CAPTAIN_PRESENCE" ||
    data.type === "RIDER_ASSIGNED" ||
    data.event === "RIDE_ASSIGNED" ||
    (typeof data.entityType === "string" && ASSIGNMENT_ENTITY_TYPES.has(data.entityType));
}
function rideMessageTarget(notification: Notifications.Notification) {
  const data = notificationData(notification);
  const metadata = data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
    ? data.metadata as Record<string, unknown> : data;
  return typeof metadata.rideId === "string" && typeof metadata.messageEventId === "string"
    ? { rideId: metadata.rideId, messageEventId: metadata.messageEventId }
    : undefined;
}


export async function registerCaptainPushNotifications() {
  if (!Device.isDevice || (Platform.OS !== "android" && Platform.OS !== "ios")) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("captain-assignments", {
      name: "Captain assignments",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: "#E31E24",
      sound: "default"
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.granted ? existing : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  return notificationsApi.registerDeviceToken({
    token,
    platform: Platform.OS === "ios" ? "IOS" : "ANDROID",
    provider: "EXPO",
    appSurface: "RIDER_APP",
    deviceId: Device.osBuildId ?? undefined
  });
}

export async function updateCaptainPresenceNotification(input: {
  online: boolean;
  activeRide: boolean;
  city: string;
  rideMode: boolean;
  deliveryMode: boolean;
}) {
  if (Platform.OS !== "android") return;
  if (!input.online && !input.activeRide) {
    if (presenceNotificationId) await Notifications.dismissNotificationAsync(presenceNotificationId).catch(() => undefined);
    presenceNotificationId = null;
    return;
  }
  await Notifications.setNotificationChannelAsync("captain-presence", {
    name: "Captain online status",
    importance: Notifications.AndroidImportance.LOW,
    lightColor: "#E31E24",
    sound: null,
    vibrationPattern: null
  });
  if (presenceNotificationId) await Notifications.dismissNotificationAsync(presenceNotificationId).catch(() => undefined);
  const modes = input.rideMode && input.deliveryMode ? "Ride + Delivery" : input.rideMode ? "Ride" : "Delivery";
  presenceNotificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: input.activeRide ? "Ride in progress" : "KariGO Captain",
      body: input.activeRide ? "Open KariGO Captain to continue" : `Online in ${input.city} · ${modes}`,
      data: { event: "CAPTAIN_PRESENCE", safeRoute: "/tabs/dashboard" },
      sticky: true,
      autoDismiss: false,
      priority: Notifications.AndroidNotificationPriority.LOW,
      sound: false
    },
    trigger: null
  });
}

export async function dismissCaptainPresenceNotification() {
  if (!presenceNotificationId) return;
  await Notifications.dismissNotificationAsync(presenceNotificationId).catch(() => undefined);
  presenceNotificationId = null;
}

export async function deactivateCaptainPushNotifications() {
  const tokens = await notificationsApi.listDeviceTokens();
  const activeCaptainTokens = tokens.filter((token) => token.appSurface === "RIDER_APP" && token.isActive);
  await Promise.all(activeCaptainTokens.map((token) =>
    notificationsApi.deactivateDeviceToken(token.id).catch(() => undefined)
  ));
}

export function subscribeToCaptainAssignmentNotifications(onAssignment: (messageTarget?: { rideId: string; messageEventId: string }) => void) {
  const received = Notifications.addNotificationReceivedListener((notification) => {
    if (isCaptainAssignmentNotification(notification)) onAssignment();
  });
  const responded = Notifications.addNotificationResponseReceivedListener((response) => {
    if (isCaptainAssignmentNotification(response.notification)) onAssignment(rideMessageTarget(response.notification));
  });

  void Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response && isCaptainAssignmentNotification(response.notification)) onAssignment(rideMessageTarget(response.notification));
  }).catch(() => undefined);

  return () => {
    received.remove();
    responded.remove();
  };
}
