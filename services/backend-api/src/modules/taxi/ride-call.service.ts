import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotificationChannel, NotificationType, Prisma, TaxiRideCallSession, TaxiTripActorType } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { AgoraRideCallProvider, RideCallParticipantToken, RideCallProvider } from "./ride-call.provider";
import { RideRealtimeService } from "./ride-realtime.service";

export type RideCallParticipantRole = "CUSTOMER" | "CAPTAIN";
export type RideCallState = "RINGING" | "ACCEPTED" | "CONNECTED" | "DECLINED" | "MISSED" | "ENDED" | "FAILED";

export interface RideCallSessionRequest {
  tripId: string;
  tripReference: string;
  participantUserId: string;
  participantRole: RideCallParticipantRole;
  participantLabel: string;
  recipientUserId: string;
  recipientRole: RideCallParticipantRole;
  recipientLabel: string;
}

const LIVE_CALL_STATES: RideCallState[] = ["RINGING", "ACCEPTED", "CONNECTED"];
const TERMINAL_CALL_STATES: RideCallState[] = ["DECLINED", "MISSED", "ENDED", "FAILED"];

@Injectable()
export class RideCallService {
  private readonly provider: RideCallProvider;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RideRealtimeService
  ) {
    this.provider = new AgoraRideCallProvider(config);
  }

  readiness() {
    const requestedEnabled = String(this.config.get<string | boolean>("RIDE_IN_APP_CALL_ENABLED", false)).toLowerCase() === "true";
    const readiness = this.provider.readiness();
    return {
      ...readiness,
      requestedEnabled,
      state: readiness.enabled ? "AVAILABLE" as const : "DISABLED" as const
    };
  }

  async initiate(request: RideCallSessionRequest) {
    this.assertEnabled();
    await this.expireStaleRinging(request.tripId);
    const existing = await this.prisma.taxiRideCallSession.findFirst({
      where: { tripId: request.tripId, state: { in: LIVE_CALL_STATES } },
      orderBy: { createdAt: "desc" }
    });
    if (existing) return this.sessionForParticipant(existing, request.participantUserId, true);

    const channel = `kgr_${randomBytes(18).toString("hex")}`;
    const channelHash = createHash("sha256").update(channel).digest("hex");
    const initiatorRtcUid = this.rtcUid(channel, request.participantUserId);
    let recipientRtcUid = this.rtcUid(channel, request.recipientUserId);
    if (recipientRtcUid === initiatorRtcUid) recipientRtcUid = initiatorRtcUid === 2_147_483_647 ? 1 : initiatorRtcUid + 1;

    const session = await this.prisma.$transaction(async (tx) => {
      const created = await tx.taxiRideCallSession.create({
        data: {
          tripId: request.tripId,
          initiatorUserId: request.participantUserId,
          initiatorRole: request.participantRole,
          recipientUserId: request.recipientUserId,
          recipientRole: request.recipientRole,
          state: "RINGING",
          provider: "AGORA",
          providerChannel: channel,
          providerChannelHash: channelHash,
          initiatorRtcUid,
          recipientRtcUid
        }
      });
      await this.audit(tx, created, request.participantUserId, request.participantRole, "ringing", {
        provider: "AGORA",
        providerChannelReference: channelHash.slice(0, 16),
        recordingEnabled: false
      });
      return created;
    });

    const incoming = {
      ...this.formatSession(session),
      rideReference: request.tripReference,
      callerLabel: request.participantLabel
    };
    this.realtime.emitToUser(request.recipientUserId, "ride.call.incoming", incoming);
    await this.notifyIncomingCall(request, session.id);
    return this.sessionForParticipant(session, request.participantUserId, true);
  }

  async recover(tripId: string, participantUserId: string) {
    this.assertEnabled();
    await this.expireStaleRinging(tripId);
    const session = await this.prisma.taxiRideCallSession.findFirst({
      where: { tripId, state: { in: LIVE_CALL_STATES } },
      orderBy: { createdAt: "desc" }
    });
    return session ? this.sessionForParticipant(session, participantUserId, true) : null;
  }

  async accept(sessionId: string, participantUserId: string, tripId?: string) {
    this.assertEnabled();
    const current = await this.requireSession(sessionId, participantUserId, tripId);
    if (current.recipientUserId !== participantUserId) throw new ForbiddenException("Only the called Ride participant may accept this call");
    if (current.state === "DECLINED" || current.state === "MISSED" || current.state === "ENDED" || current.state === "FAILED") {
      throw new BadRequestException("This Ride call is no longer available");
    }
    const session = current.state === "RINGING"
      ? await this.transition(current, "ACCEPTED", participantUserId, current.recipientRole as RideCallParticipantRole, { acceptedAt: new Date() }, "accepted")
      : current;
    return this.sessionForParticipant(session, participantUserId, true);
  }

  async connected(sessionId: string, participantUserId: string, tripId?: string) {
    const current = await this.requireSession(sessionId, participantUserId, tripId);
    if (current.state === "CONNECTED") return this.sessionForParticipant(current, participantUserId, false);
    if (current.state !== "ACCEPTED") throw new BadRequestException("Accept the Ride call before connecting");
    const role = this.participantRole(current, participantUserId);
    const session = await this.transition(current, "CONNECTED", participantUserId, role, { connectedAt: new Date() }, "connected");
    return this.sessionForParticipant(session, participantUserId, false);
  }

  async decline(sessionId: string, participantUserId: string, tripId?: string) {
    const current = await this.requireSession(sessionId, participantUserId, tripId);
    if (current.recipientUserId !== participantUserId) throw new ForbiddenException("Only the called Ride participant may decline this call");
    if (current.state === "DECLINED") return this.sessionForParticipant(current, participantUserId, false);
    if (current.state !== "RINGING") throw new BadRequestException("This Ride call can no longer be declined");
    const session = await this.transition(current, "DECLINED", participantUserId, current.recipientRole as RideCallParticipantRole, {
      declinedAt: new Date(), endedAt: new Date(), endedByUserId: participantUserId, endReason: "DECLINED"
    }, "declined");
    return this.sessionForParticipant(session, participantUserId, false);
  }

  async end(sessionId: string, participantUserId: string, reason = "ENDED_BY_PARTICIPANT", tripId?: string) {
    const current = await this.requireSession(sessionId, participantUserId, tripId);
    if (TERMINAL_CALL_STATES.includes(current.state as RideCallState)) return this.sessionForParticipant(current, participantUserId, false);
    const endedAt = new Date();
    const session = await this.transition(current, "ENDED", participantUserId, this.participantRole(current, participantUserId), {
      endedAt,
      endedByUserId: participantUserId,
      endReason: this.safeReason(reason),
      durationSeconds: current.connectedAt ? Math.max(0, Math.floor((endedAt.getTime() - current.connectedAt.getTime()) / 1000)) : 0
    }, "ended");
    return this.sessionForParticipant(session, participantUserId, false);
  }

  async renewToken(sessionId: string, participantUserId: string, tripId?: string) {
    this.assertEnabled();
    const session = await this.requireSession(sessionId, participantUserId, tripId);
    if (session.state !== "ACCEPTED" && session.state !== "CONNECTED") {
      throw new BadRequestException("Ride call tokens can be renewed only for an accepted active call");
    }
    return this.sessionForParticipant(session, participantUserId, true);
  }

  async endCallsForRide(tripId: string, reason: string) {
    const sessions = await this.prisma.taxiRideCallSession.findMany({ where: { tripId, state: { in: LIVE_CALL_STATES } } });
    for (const session of sessions) {
      const endedAt = new Date();
      const safeReason = this.safeReason(reason);
      const updated = await this.systemTransition(session, "ENDED", {
        endedAt,
        endReason: safeReason,
        durationSeconds: session.connectedAt ? Math.max(0, Math.floor((endedAt.getTime() - session.connectedAt.getTime()) / 1000)) : 0
      }, "ended", { endReason: safeReason });
      this.emitState(updated, "ride.call.remote_ended");
    }
  }

  private async transition(
    current: TaxiRideCallSession,
    state: RideCallState,
    actorUserId: string,
    actorRole: RideCallParticipantRole,
    data: Prisma.TaxiRideCallSessionUpdateInput,
    event: string
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.taxiRideCallSession.update({ where: { id: current.id }, data: { ...data, state } });
      await this.audit(tx, next, actorUserId, actorRole, event, { state, endReason: next.endReason, durationSeconds: next.durationSeconds });
      return next;
    });
    this.emitState(updated, event === "ended" ? "ride.call.remote_ended" : `ride.call.${event}`);
    return updated;
  }

  private async requireSession(sessionId: string, participantUserId: string, tripId?: string) {
    const session = await this.prisma.taxiRideCallSession.findUnique({ where: { id: sessionId } });
    if (!session || (tripId && session.tripId !== tripId) || (session.initiatorUserId !== participantUserId && session.recipientUserId !== participantUserId)) {
      throw new NotFoundException("Ride call session not found");
    }
    return session;
  }

  private async sessionForParticipant(session: TaxiRideCallSession, participantUserId: string, includeToken: boolean) {
    const role = session.initiatorUserId === participantUserId ? "initiator" : session.recipientUserId === participantUserId ? "recipient" : null;
    if (!role) throw new NotFoundException("Ride call session not found");
    const mayJoin = includeToken && (
      (role === "initiator" && LIVE_CALL_STATES.includes(session.state as RideCallState)) ||
      (role === "recipient" && (session.state === "ACCEPTED" || session.state === "CONNECTED"))
    );
    let credential: RideCallParticipantToken | undefined;
    if (mayJoin) {
      credential = this.provider.createParticipantToken({
        channel: session.providerChannel,
        uid: role === "initiator" ? session.initiatorRtcUid : session.recipientRtcUid
      });
      await this.prisma.taxiRideCallSession.update({
        where: { id: session.id },
        data: { lastTokenExpiresAt: new Date(credential.expiresAt) }
      });
    }
    return { ...this.formatSession(session), participant: role, credential };
  }

  private formatSession(session: TaxiRideCallSession) {
    return {
      id: session.id,
      rideId: session.tripId,
      provider: "AGORA" as const,
      state: session.state as RideCallState,
      recordingEnabled: false as const,
      ringingAt: session.ringingAt.toISOString(),
      acceptedAt: session.acceptedAt?.toISOString() ?? null,
      connectedAt: session.connectedAt?.toISOString() ?? null,
      declinedAt: session.declinedAt?.toISOString() ?? null,
      missedAt: session.missedAt?.toISOString() ?? null,
      endedAt: session.endedAt?.toISOString() ?? null,
      endReason: session.endReason,
      durationSeconds: session.durationSeconds,
      providerChannelReference: session.providerChannelHash.slice(0, 16)
    };
  }

  private emitState(session: TaxiRideCallSession, event: string) {
    const payload = this.formatSession(session);
    this.realtime.emitToUser(session.initiatorUserId, event, payload);
    this.realtime.emitToUser(session.recipientUserId, event, payload);
  }

  private async notifyIncomingCall(request: RideCallSessionRequest, sessionId: string) {
    const notice = {
      userId: request.recipientUserId,
      title: "Incoming KariGO Ride call",
      message: `Incoming Ride call for ${request.tripReference}. Open KariGO to respond.`,
      type: NotificationType.SYSTEM_ALERT,
      entityType: "TaxiTrip",
      entityId: request.tripId,
      metadata: {
        event: "RIDE_CALL_INCOMING",
        rideId: request.tripId,
        callSessionId: sessionId,
        rideReference: request.tripReference
      }
    };
    await Promise.allSettled([
      this.notifications.createNotification(notice),
      this.notifications.createNotification({ ...notice, channel: NotificationChannel.PUSH })
    ]);
  }

  private async expireStaleRinging(tripId: string) {
    const cutoff = new Date(Date.now() - this.ringTimeoutSeconds() * 1000);
    const sessions = await this.prisma.taxiRideCallSession.findMany({
      where: { tripId, state: "RINGING", ringingAt: { lt: cutoff } }
    });
    for (const session of sessions) {
      const missedAt = new Date();
      const updated = await this.systemTransition(session, "MISSED", {
        missedAt, endedAt: missedAt, endReason: "MISSED", durationSeconds: 0
      }, "missed", { endReason: "MISSED" });
      this.emitState(updated, "ride.call.missed");
    }
  }

  private async systemTransition(
    session: TaxiRideCallSession,
    state: RideCallState,
    data: Prisma.TaxiRideCallSessionUpdateInput,
    event: string,
    metadata: Record<string, unknown>
  ) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.taxiRideCallSession.update({ where: { id: session.id }, data: { ...data, state } });
      await tx.taxiTripEvent.create({
        data: {
          tripId: updated.tripId,
          actorType: TaxiTripActorType.SYSTEM,
          actorId: null,
          eventType: `taxi.trip.call.${event}`,
          note: `Ride call ${event}`,
          metadata: { callSessionId: updated.id, state, ...metadata } as Prisma.InputJsonValue
        }
      });
      return updated;
    });
  }

  private audit(
    tx: Prisma.TransactionClient,
    session: TaxiRideCallSession,
    actorUserId: string,
    actorRole: RideCallParticipantRole,
    event: string,
    metadata: Record<string, unknown>
  ) {
    return tx.taxiTripEvent.create({
      data: {
        tripId: session.tripId,
        actorType: actorRole === "CUSTOMER" ? TaxiTripActorType.CUSTOMER : TaxiTripActorType.DRIVER,
        actorId: actorUserId,
        eventType: `taxi.trip.call.${event}`,
        note: `Ride call ${event}`,
        metadata: { callSessionId: session.id, ...metadata } as Prisma.InputJsonValue
      }
    });
  }

  private participantRole(session: TaxiRideCallSession, userId: string): RideCallParticipantRole {
    if (session.initiatorUserId === userId) return session.initiatorRole as RideCallParticipantRole;
    if (session.recipientUserId === userId) return session.recipientRole as RideCallParticipantRole;
    throw new NotFoundException("Ride call session not found");
  }

  private assertEnabled() {
    if (!this.provider.readiness().enabled) throw new BadRequestException(this.provider.readiness().reason);
  }

  private ringTimeoutSeconds() {
    const configured = Number(this.config.get<string | number>("RIDE_CALL_RING_TIMEOUT_SECONDS", 45));
    return Number.isFinite(configured) ? Math.min(120, Math.max(20, Math.floor(configured))) : 45;
  }

  private rtcUid(channel: string, userId: string) {
    const value = createHash("sha256").update(`${channel}:${userId}`).digest().readUInt32BE(0) & 0x7fffffff;
    return value || 1;
  }

  private safeReason(reason: string) {
    return reason.replace(/[^A-Z0-9_ -]/gi, "").trim().slice(0, 80) || "ENDED_BY_PARTICIPANT";
  }
}
