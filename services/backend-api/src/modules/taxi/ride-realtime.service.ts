import { Injectable } from "@nestjs/common";
import type { Server } from "socket.io";

@Injectable()
export class RideRealtimeService {
  private server: Server | null = null;
  private readonly waitingTimers = new Map<string, ReturnType<typeof setTimeout>>();

  attach(server: Server) {
    this.server = server;
  }

  emitToRide(rideId: string, event: string, payload: unknown) {
    this.server?.to(this.rideRoom(rideId)).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server?.to(this.userRoom(userId)).emit(event, payload);
  }

  schedulePaidWaiting(rideId: string, arrivedAt: Date, freeSeconds: number) {
    this.stopWaitingTimer(rideId);
    const paidWaitingStartsAt = new Date(arrivedAt.getTime() + freeSeconds * 1000);
    this.emitToRide(rideId, "ride.waiting.free_started", {
      rideId,
      arrivedAt: arrivedAt.toISOString(),
      paidWaitingStartsAt: paidWaitingStartsAt.toISOString()
    });
    const delay = Math.max(0, paidWaitingStartsAt.getTime() - Date.now());
    const timer = setTimeout(() => {
      this.waitingTimers.delete(rideId);
      this.emitToRide(rideId, "ride.waiting.paid_started", {
        rideId,
        paidWaitingStartsAt: paidWaitingStartsAt.toISOString()
      });
    }, delay);
    timer.unref?.();
    this.waitingTimers.set(rideId, timer);
  }

  stopWaiting(rideId: string, stoppedAt: Date) {
    this.stopWaitingTimer(rideId);
    this.emitToRide(rideId, "ride.waiting.stopped", { rideId, stoppedAt: stoppedAt.toISOString() });
  }

  private stopWaitingTimer(rideId: string) {
    const timer = this.waitingTimers.get(rideId);
    if (timer) clearTimeout(timer);
    this.waitingTimers.delete(rideId);
  }

  rideRoom(rideId: string) {
    return `ride:${rideId}`;
  }

  userRoom(userId: string) {
    return `user:${userId}`;
  }
}
