import { useEffect, useSyncExternalStore } from "react";

const unreadByRide = new Map<string, number>();
const handledMessageEvents = new Map<string, number>();
const listeners = new Set<() => void>();
const EVENT_TTL_MS = 10 * 60_000;

function emitChange() {
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function pruneHandledEvents() {
  const cutoff = Date.now() - EVENT_TTL_MS;
  handledMessageEvents.forEach((seenAt, id) => {
    if (seenAt < cutoff) handledMessageEvents.delete(id);
  });
}

export function claimRideMessageEvent(messageEventId: string) {
  pruneHandledEvents();
  if (handledMessageEvents.has(messageEventId)) return false;
  handledMessageEvents.set(messageEventId, Date.now());
  return true;
}

export function hasHandledRideMessageEvent(messageEventId: unknown) {
  pruneHandledEvents();
  return typeof messageEventId === "string" && handledMessageEvents.has(messageEventId);
}

export function incrementRideUnread(rideId: string) {
  unreadByRide.set(rideId, (unreadByRide.get(rideId) ?? 0) + 1);
  emitChange();
}

export function setRideUnread(rideId: string, count: number) {
  const next = Math.max(0, Math.floor(count));
  if ((unreadByRide.get(rideId) ?? 0) === next) return;
  unreadByRide.set(rideId, next);
  emitChange();
}

export function clearRideUnread(rideId: string) {
  setRideUnread(rideId, 0);
}

export function useRideUnreadCount(rideId: string, authoritativeCount = 0) {
  useEffect(() => {
    setRideUnread(rideId, authoritativeCount);
  }, [rideId, authoritativeCount]);
  return useSyncExternalStore(
    subscribe,
    () => unreadByRide.get(rideId) ?? authoritativeCount,
    () => authoritativeCount
  );
}
