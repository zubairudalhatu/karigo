import { useCallback, useSyncExternalStore } from "react";
import { useFocusEffect } from "expo-router";
import { AppState } from "react-native";
import { OrderResource, subscribePartnerOrderChanges } from "./order-operations";

export function useOrderResource<T>(resource: OrderResource<T>, orderId?: string) {
  const state = useSyncExternalStore(resource.subscribe, resource.snapshot, resource.snapshot);
  useFocusEffect(useCallback(() => {
    const read = () => { if (AppState.currentState === "active") void resource.load(); };
    read();
    const timer = setInterval(read, 20000);
    const app = AppState.addEventListener("change", value => { resource.invalidate(); if (value === "active") read(); });
    const stop = subscribePartnerOrderChanges(id => { if (!orderId || !id || id === orderId) { resource.invalidate(); read(); } });
    return () => { clearInterval(timer); app.remove(); stop(); resource.invalidate(); };
  }, [resource, orderId]));
  return state;
}
