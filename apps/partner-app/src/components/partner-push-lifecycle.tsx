import { useEffect } from "react";
import { AppState } from "react-native";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { useAuth } from "../contexts/auth-context";
import { partnerApi } from "../api/partner.api";
import { registerPartnerPush } from "../lib/partner-push";

Notifications.setNotificationHandler({ handleNotification: async notification => {
  const partner = notification.request.content.data?.appSurface === "PARTNER_APP";
  return { shouldShowBanner: partner, shouldShowList: partner, shouldPlaySound: false, shouldSetBadge: false };
} });

export function PartnerPushLifecycle() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user || (user as unknown as { partnerScope?: string }).partnerScope) return;
    let active = true;
    const seen = new Set<string>();
    const sync = () => { void registerPartnerPush().catch(() => { /* Remains opt-in; Settings exposes registration errors. */ }); };
    async function open(response: Notifications.NotificationResponse) {
      const id = response.notification.request.identifier;
      const data = response.notification.request.content.data;
      if (!active || seen.has(id) || data.appSurface !== "PARTNER_APP") return;
      seen.add(id);
      try {
        const state = await partnerApi.onboardingState();
        if (!active || state.state !== "approved") return;
        if (data.route === "earnings") router.push("/earnings");
        else if (data.route === "order" && typeof data.entityId === "string" && /^[0-9a-f-]{36}$/i.test(data.entityId)) {
          await partnerApi.orderDetail(data.entityId); // Ownership is enforced server-side before navigation.
          if (active) router.push({ pathname: "/orders/[orderId]", params: { orderId: data.entityId } });
        }
      } catch { /* A revoked or reassigned resource must not open. */ }
    }
    sync();
    const state = AppState.addEventListener("change", value => { if (value === "active") sync(); });
    const token = Notifications.addPushTokenListener(sync);
    const response = Notifications.addNotificationResponseReceivedListener(value => { void open(value); });
    void Notifications.getLastNotificationResponseAsync().then(value => { if (value) void open(value); });
    return () => { active = false; state.remove(); token.remove(); response.remove(); };
  }, [user?.id]);
  return null;
}
