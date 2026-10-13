import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { notificationsApi } from "../api/notifications.api";

export type IosPushState = "undetermined" | "denied" | "granted";
export function iosPushPermission(permission: Notifications.NotificationPermissionsStatus): IosPushState {
  if (permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    || permission.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL) return "granted";
  return permission.status === "undetermined" ? "undetermined" : "denied";
}

const inFlight = new Map<string, Promise<boolean>>();
const registered = new Map<string, string>();
export function resetIosPushRegistration() { registered.clear(); }

export function registerCustomerIosPush(userId: string, requestPermission = false): Promise<boolean> {
  const existing = inFlight.get(userId);
  if (existing) return requestPermission
    ? existing.then((saved) => saved || registerCustomerIosPush(userId, true))
    : existing;
  const task = (async () => {
    if (!Device.isDevice) throw new Error("Push notifications require a physical iPhone.");
    let permission = await Notifications.getPermissionsAsync();
    if (requestPermission && iosPushPermission(permission) === "undetermined") {
      permission = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
    }
    if (iosPushPermission(permission) !== "granted") return false;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) throw new Error("Notification setup is unavailable. Please contact support.");
    try {
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      if (registered.get(userId) !== token) {
        await notificationsApi.registerDeviceToken({ token, platform: "IOS", provider: "EXPO", appSurface: "CUSTOMER_APP" });
        registered.set(userId, token);
      }
      return true;
    } catch {
      // Provider/backend errors may contain a token; never surface raw errors.
      throw new Error("Notifications are allowed, but device registration failed. Please try again.");
    }
  })();
  inFlight.set(userId, task);
  void task.finally(() => { if (inFlight.get(userId) === task) inFlight.delete(userId); }).catch(() => undefined);
  return task;
}
