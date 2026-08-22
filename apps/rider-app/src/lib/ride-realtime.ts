import type { RideCallSession, RideIncomingCallEvent, RideLifecycleRealtimeEvent, RideMessage } from "@karigo/shared-types";
import { io, type Socket } from "socket.io-client";
import { API_BASE_URL, tokenStore } from "../api/client";

export interface RideRealtimeEvents {
  "ride.message.new": RideMessage;
  "ride.message.delivered": { rideId: string; messageId: string; deliveredAt: string };
  "ride.message.read": { rideId: string; lastMessageId: string; readAt: string };
  "ride.lifecycle.updated": RideLifecycleRealtimeEvent;
  "ride.call.incoming": RideIncomingCallEvent;
  "ride.call.accepted": RideCallSession;
  "ride.call.connected": RideCallSession;
  "ride.call.declined": RideCallSession;
  "ride.call.missed": RideCallSession;
  "ride.call.remote_ended": RideCallSession;
}

type EventName = keyof RideRealtimeEvents;
let socket: Socket | null = null;
let connecting: Promise<Socket> | null = null;

let activeConversationRideId: string | null = null;
function realtimeOrigin() {
  return API_BASE_URL.replace(/\/?api\/v1\/?$/i, "").replace(/\/$/, "");
}

export async function connectRideRealtime() {
  if (socket?.connected) return socket;
  if (connecting) return connecting;
  connecting = (async () => {
    const token = await tokenStore.getToken();
    if (!token) throw new Error("Sign in to use live Ride updates.");
    socket?.disconnect();
    socket = io(`${realtimeOrigin()}/ride-realtime`, {
      transports: ["websocket"],
      auth: { token },
      reconnection: true,
      reconnectionDelay: 750,
      reconnectionDelayMax: 5_000,
      timeout: 10_000
    });
    return socket;
  })();
  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

export function setActiveRideConversation(rideId: string | null) {
  activeConversationRideId = rideId;
}

export function isActiveRideConversation(rideId: unknown) {
  return typeof rideId === "string" && activeConversationRideId === rideId;
}

export function disconnectRideRealtime() {
  socket?.disconnect();
  socket = null;
  connecting = null;
}

export async function subscribeRideRealtime<K extends EventName>(
  rideId: string,
  handlers: Partial<{ [P in K]: (payload: RideRealtimeEvents[P]) => void }>
) {
  const client = await connectRideRealtime();
  const registrations: Array<[string, (payload: any) => void]> = [];
  Object.entries(handlers).forEach(([event, handler]) => {
    if (!handler) return;
    const scoped = (payload: { rideId?: string }) => {
      if (payload?.rideId === rideId) (handler as (value: unknown) => void)(payload);
    };
    registrations.push([event, scoped]);
    client.on(event, scoped);
  });
  client.emit("ride.subscribe", { rideId });
  return () => {
    registrations.forEach(([event, handler]) => client.off(event, handler));
    client.emit("ride.unsubscribe", { rideId });
  };
}

export async function subscribePersonalRideRealtime<K extends EventName>(
  handlers: Partial<{ [P in K]: (payload: RideRealtimeEvents[P]) => void }>
) {
  const client = await connectRideRealtime();
  const registrations: Array<[string, (payload: any) => void]> = [];
  Object.entries(handlers).forEach(([event, handler]) => {
    if (!handler) return;
    const callback = handler as (payload: unknown) => void;
    registrations.push([event, callback]);
    client.on(event, callback);
  });
  return () => registrations.forEach(([event, handler]) => client.off(event, handler));
}

export async function acknowledgeRideMessageDelivered(rideId: string, messageId: string) {
  const client = await connectRideRealtime();
  client.emit("ride.message.delivered", { rideId, messageId });
}
