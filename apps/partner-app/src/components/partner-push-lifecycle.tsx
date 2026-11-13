import { authSessionStore } from "../api/client";
import { resolvePartnerOrderPush, partnerOrderId, PartnerPushClaims } from "../lib/order-push";
import { notifyPartnerOrderChanged } from "../lib/order-operations";
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
    const claims = new PartnerPushClaims();
    const sync = () => { void registerPartnerPush().catch(() => { /* Remains opt-in; Settings exposes registration errors. */ }); };
    async function open(response: Notifications.NotificationResponse) {
      const id = response.notification.request.identifier;
      const data = response.notification.request.content.data;
      if (!active || data.appSurface !== "PARTNER_APP" || !claims.claim(id)) return;
      const generation = authSessionStore.currentGeneration();
      const current = () => active && authSessionStore.isCurrent(generation);
      const approved = async () => (await partnerApi.onboardingState()).state === "approved";
      if (data.route === "order") {
        const orderId = await resolvePartnerOrderPush(data, { current, approved, detail: partnerApi.orderDetail });
        if (orderId && current()) { notifyPartnerOrderChanged(orderId); router.push({ pathname: "/orders/[orderId]", params: { orderId } }); }
      } else if (data.route === "earnings") {
        try { if (await approved() && current()) router.push("/earnings"); } catch { /* Revoked access must not open. */ }
      }
    }

    sync();
    const state = AppState.addEventListener("change", value => { if (value === "active") sync(); });
    const token = Notifications.addPushTokenListener(sync);
    const receipt = Notifications.addNotificationReceivedListener(value => {
      const data = value.request.content.data;
      if (active && data.appSurface === "PARTNER_APP" && data.route === "order" && partnerOrderId(data.entityId)) notifyPartnerOrderChanged(data.entityId);
    });
    const response = Notifications.addNotificationResponseReceivedListener(value => { void open(value); });
    void Notifications.getLastNotificationResponseAsync().then(value => { if (value) void open(value); }).catch(() => undefined);
    return () => { active = false; state.remove(); token.remove(); response.remove(); receipt.remove(); };
  }, [user?.id]);
  return null;
}
