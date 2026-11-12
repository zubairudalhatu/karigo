import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { api } from "../api/client";

const KEY = "karigo_partner_push_registration";
export interface PartnerNotificationPreferences { enabled: boolean; orders: boolean; settlements: boolean; }
export const partnerPushPreferences = () => api.get<PartnerNotificationPreferences>("partner-mobile/push/preferences");
export const updatePartnerPushPreferences = (body: PartnerNotificationPreferences) => api.patch<PartnerNotificationPreferences>("partner-mobile/push/preferences", { enabled: body.enabled, orders: body.orders, settlements: body.settlements });

// Only this settings action may request permission. Bootstrap never prompts.
export async function enablePartnerPush(preferences: PartnerNotificationPreferences) {
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("partner-orders", { name: "Partner updates", importance: Notifications.AndroidImportance.DEFAULT });
  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") throw new Error("Notifications are not allowed. You can enable them in device Settings.");
  await updatePartnerPushPreferences({ ...preferences, enabled: true });
  await registerPartnerPush();
}
export async function registerPartnerPush() {
  if ((await Notifications.getPermissionsAsync()).status !== "granted") return;
  const preferences = await partnerPushPreferences();
  if (!preferences.enabled) return;
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) throw new Error("Partner push project is not configured.");
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const old = await SecureStore.getItemAsync(KEY);
  if (old && old !== token) await api.request("partner-mobile/push/device", { method: "DELETE", body: { token: old, platform: Platform.OS.toUpperCase() } });
  await api.post("partner-mobile/push/device", { token, platform: Platform.OS.toUpperCase() });
  await SecureStore.setItemAsync(KEY, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED });
}
export async function clearPartnerPush() {
  // Server logout also removes all Partner registrations if unregister cannot finish.
  await SecureStore.deleteItemAsync(KEY);
  await Notifications.dismissAllNotificationsAsync();
  await Notifications.clearLastNotificationResponseAsync();
}
