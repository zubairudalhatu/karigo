import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { RideMessageSenderRole } from "@karigo/shared-types";
import { NotificationChannel, NotificationType, Prisma, TaxiTripActorType, TaxiTripStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateRideMessageDto, ListRideMessagesQueryDto, MarkRideMessagesReadDto } from "./dto/ride-message.dto";
import { RideCallService } from "./ride-call.service";
import { RideRealtimeService } from "./ride-realtime.service";

export const RIDE_MESSAGE_EVENT = "taxi.trip.message";
export const RIDE_MESSAGE_DELIVERED_EVENT = "taxi.trip.message_delivered";
export const RIDE_MESSAGE_READ_EVENT = "taxi.trip.message_read";
export const RIDE_CALL_EVENT_PREFIX = "taxi.trip.call";

const ACTIVE_COMMUNICATION_STATUSES = new Set<TaxiTripStatus>([
  TaxiTripStatus.DRIVER_ASSIGNED,
  TaxiTripStatus.ACCEPTED,
  TaxiTripStatus.ARRIVED_PICKUP,
  TaxiTripStatus.STARTED,
  TaxiTripStatus.ARRIVED_DESTINATION
]);
const CLOSED_STATUSES = new Set<TaxiTripStatus>([
  TaxiTripStatus.COMPLETED,
  TaxiTripStatus.CANCELLED_BY_CUSTOMER,
  TaxiTripStatus.CANCELLED_BY_DRIVER,
  TaxiTripStatus.CANCELLED_BY_ADMIN,
  TaxiTripStatus.EXPIRED
]);
const COMMUNICATION_TRIP_INCLUDE = {
  customer: { include: { user: { select: { id: true, fullName: true, phoneNumber: true } } } },
  driverProfile: true,
  events: true
} satisfies Prisma.TaxiTripInclude;
export type RideCommunicationTrip = Prisma.TaxiTripGetPayload<{ include: typeof COMMUNICATION_TRIP_INCLUDE }>;
type RideEvent = Prisma.TaxiTripEventGetPayload<Record<string, never>>;

@Injectable()
export class RideCommunicationsService {
  private readonly logger = new Logger(RideCommunicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
    private readonly rideCalls: RideCallService,
    private readonly realtime: RideRealtimeService
  ) {}

  async authorizeRealtimeParticipant(userId: string, tripId: string) {
    const trip = await this.prisma.taxiTrip.findFirst({
      where: {
        id: tripId,
        OR: [
          { customer: { is: { userId } } },
          { driverProfile: { is: { userId } } }
        ]
      },
      include: COMMUNICATION_TRIP_INCLUDE
    });
    if (!trip) throw new NotFoundException("Ride not found");
    this.assertReadable(trip);
    return {
      trip,
      participantRole: trip.customer.user.id === userId ? "CUSTOMER" as const : "CAPTAIN" as const
    };
  }

  async listMessages(trip: RideCommunicationTrip, viewerRole: RideMessageSenderRole, query: ListRideMessagesQueryDto) {
    this.assertReadable(trip);
    const limit = query.limit ?? 30;
    const [messageEvents, receipts, messageCount] = await Promise.all([
      this.prisma.taxiTripEvent.findMany({
        where: {
          tripId: trip.id,
          eventType: RIDE_MESSAGE_EVENT,
          ...(query.before ? { createdAt: { lt: new Date(query.before) } } : {})
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1
      }),
      this.prisma.taxiTripEvent.findMany({
        where: { tripId: trip.id, eventType: { in: [RIDE_MESSAGE_DELIVERED_EVENT, RIDE_MESSAGE_READ_EVENT] } },
        orderBy: { createdAt: "asc" }
      }),
      this.prisma.taxiTripEvent.count({ where: { tripId: trip.id, eventType: RIDE_MESSAGE_EVENT } })
    ]);
    const hasMore = messageEvents.length > limit;
    const page = messageEvents.slice(0, limit);
    const retentionEndsAt = CLOSED_STATUSES.has(trip.status)
      ? new Date(trip.updatedAt.getTime() + this.retentionDays() * 86_400_000).toISOString()
      : null;
    return {
      rideId: trip.id,
      rideReference: trip.tripReference,
      participantLabel: viewerRole === "CUSTOMER"
        ? this.firstName(trip.driverProfile?.fullName, "Ride Captain")
        : this.firstName(trip.customer.user.fullName, "Customer"),
      messages: page.reverse().map((event) => this.formatMessage(event, receipts)),
      messageCount,
      unreadCount: this.unreadCount(messageEvents, receipts, viewerRole),
      exists: messageCount > 0,
      lastMessageAt: messageEvents[0]?.createdAt.toISOString() ?? null,
      readOnly: CLOSED_STATUSES.has(trip.status),
      nextBefore: hasMore ? page.at(-1)?.createdAt.toISOString() ?? null : null,
      retentionEndsAt
    };
  }

  async sendMessage(trip: RideCommunicationTrip, userId: string, senderRole: RideMessageSenderRole, dto: CreateRideMessageDto) {
    this.assertWritable(trip);
    const message = this.safeMessage(dto.message);
    const event = await this.prisma.taxiTripEvent.create({
      data: {
        tripId: trip.id,
        actorType: senderRole === "CUSTOMER" ? TaxiTripActorType.CUSTOMER : TaxiTripActorType.DRIVER,
        actorId: userId,
        eventType: RIDE_MESSAGE_EVENT,
        note: message,
        metadata: { deliveryState: "SENT", senderRole } as Prisma.InputJsonValue
      }
    });
    const formatted = this.formatMessage(event, []);
    this.realtime.emitToRide(trip.id, "ride.message.new", formatted);
    await this.notifyRecipient(trip, senderRole, event.id);
    return formatted;
  }

  async acknowledgeDelivered(userId: string, tripId: string, messageId: string) {
    const { trip, participantRole } = await this.authorizeRealtimeParticipant(userId, tripId);
    const message = await this.prisma.taxiTripEvent.findFirst({
      where: { id: messageId, tripId, eventType: RIDE_MESSAGE_EVENT }
    });
    if (!message) throw new NotFoundException("Ride message not found");
    const senderRole = this.senderRole(message);
    if (senderRole === participantRole) throw new BadRequestException("Only received Ride messages can be acknowledged as delivered");
    const receipts = await this.prisma.taxiTripEvent.findMany({
      where: { tripId, eventType: RIDE_MESSAGE_DELIVERED_EVENT, actorId: userId }
    });
    const existing = receipts.find((receipt) => this.jsonRecord(receipt.metadata).messageId === messageId);
    const receipt = existing ?? await this.prisma.taxiTripEvent.create({
      data: {
        tripId,
        actorType: participantRole === "CUSTOMER" ? TaxiTripActorType.CUSTOMER : TaxiTripActorType.DRIVER,
        actorId: userId,
        eventType: RIDE_MESSAGE_DELIVERED_EVENT,
        metadata: { messageId, recipientRole: participantRole } as Prisma.InputJsonValue
      }
    });
    const result = { rideId: trip.id, messageId, deliveredAt: receipt.createdAt.toISOString() };
    this.realtime.emitToRide(tripId, "ride.message.delivered", result);
    return result;
  }

  async markRead(trip: RideCommunicationTrip, userId: string, readerRole: RideMessageSenderRole, dto: MarkRideMessagesReadDto) {
    this.assertReadable(trip);
    const message = await this.prisma.taxiTripEvent.findFirst({
      where: { id: dto.lastMessageId, tripId: trip.id, eventType: RIDE_MESSAGE_EVENT }
    });
    if (!message) throw new NotFoundException("Ride message not found");
    const senderRole = this.senderRole(message);
    if (senderRole === readerRole) throw new BadRequestException("Only received Ride messages can be marked read");
    const receipts = await this.prisma.taxiTripEvent.findMany({
      where: { tripId: trip.id, eventType: RIDE_MESSAGE_READ_EVENT, actorId: userId },
      orderBy: { createdAt: "desc" }
    });
    const covering = receipts.find((item) => {
      const value = this.jsonRecord(item.metadata).lastMessageCreatedAt;
      return typeof value === "string" && new Date(value) >= message.createdAt;
    });
    const receipt = covering ?? await this.prisma.taxiTripEvent.create({
      data: {
        tripId: trip.id,
        actorType: readerRole === "CUSTOMER" ? TaxiTripActorType.CUSTOMER : TaxiTripActorType.DRIVER,
        actorId: userId,
        eventType: RIDE_MESSAGE_READ_EVENT,
        note: null,
        metadata: {
          lastMessageId: message.id,
          lastMessageCreatedAt: message.createdAt.toISOString(),
          readerRole
        } as Prisma.InputJsonValue
      }
    });
    const result = { rideId: trip.id, lastMessageId: message.id, readAt: receipt.createdAt.toISOString() };
    this.realtime.emitToRide(trip.id, "ride.message.read", result);
    return result;
  }

  contactOptions(trip: RideCommunicationTrip, viewerRole: RideMessageSenderRole) {
    this.assertWritable(trip);
    const configured = this.config.get<string | boolean>("RIDE_PHONE_FALLBACK_ENABLED", true);
    const phoneFallbackEnabled = String(configured).toLowerCase() !== "false";
    const phoneNumber = viewerRole === "CUSTOMER" ? trip.driverProfile?.phoneNumber : trip.customer.user.phoneNumber;
    return {
      rideId: trip.id,
      chatAvailable: true,
      inAppCall: this.rideCalls.readiness(),
      phoneFallbackAvailable: phoneFallbackEnabled && Boolean(phoneNumber),
      phoneNumber: phoneFallbackEnabled ? phoneNumber ?? null : null,
      phoneFallbackLabel: "Call by phone" as const,
      maskedNumberProviderRequiredForPublicLaunch: true
    };
  }

  callReadiness() {
    return this.rideCalls.readiness();
  }

  callSession(trip: RideCommunicationTrip, participantUserId: string, participantRole: RideMessageSenderRole) {
    this.assertWritable(trip);
    const recipientUserId = participantRole === "CUSTOMER" ? trip.driverProfile?.userId : trip.customer.user.id;
    if (!recipientUserId) throw new BadRequestException("The assigned Ride participant is not available for in-app calling");
    return this.rideCalls.initiate({
      tripId: trip.id,
      tripReference: trip.tripReference,
      participantUserId,
      participantRole,
      participantLabel: participantRole === "CUSTOMER" ? this.firstName(trip.customer.user.fullName, "Customer") : this.firstName(trip.driverProfile?.fullName, "Ride Captain"),
      recipientUserId,
      recipientRole: participantRole === "CUSTOMER" ? "CAPTAIN" : "CUSTOMER",
      recipientLabel: participantRole === "CUSTOMER" ? this.firstName(trip.driverProfile?.fullName, "Ride Captain") : this.firstName(trip.customer.user.fullName, "Customer")
    });
  }

  recoverCallSession(trip: RideCommunicationTrip, participantUserId: string) {
    this.assertWritable(trip);
    return this.rideCalls.recover(trip.id, participantUserId);
  }

  acceptCall(trip: RideCommunicationTrip, participantUserId: string, sessionId: string) {
    this.assertWritable(trip);
    return this.rideCalls.accept(sessionId, participantUserId, trip.id);
  }

  connectCall(trip: RideCommunicationTrip, participantUserId: string, sessionId: string) {
    this.assertWritable(trip);
    return this.rideCalls.connected(sessionId, participantUserId, trip.id);
  }

  declineCall(trip: RideCommunicationTrip, participantUserId: string, sessionId: string) {
    this.assertWritable(trip);
    return this.rideCalls.decline(sessionId, participantUserId, trip.id);
  }

  endCall(trip: RideCommunicationTrip, participantUserId: string, sessionId: string, reason?: string) {
    this.assertReadable(trip);
    return this.rideCalls.end(sessionId, participantUserId, reason, trip.id);
  }

  renewCallToken(trip: RideCommunicationTrip, participantUserId: string, sessionId: string) {
    this.assertWritable(trip);
    return this.rideCalls.renewToken(sessionId, participantUserId, trip.id);
  }

  endCallsForTerminalRide(tripId: string, reason: string) {
    return this.rideCalls.endCallsForRide(tripId, reason);
  }

  private assertReadable(trip: RideCommunicationTrip) {
    if (!trip.driverProfileId || trip.status === TaxiTripStatus.REQUESTED) {
      throw new BadRequestException("Ride communication becomes available after a Ride Captain is assigned");
    }
    if (CLOSED_STATUSES.has(trip.status) && Date.now() - trip.updatedAt.getTime() > this.retentionDays() * 86_400_000) {
      throw new NotFoundException("Ride conversation is outside the support retention window");
    }
  }

  private assertWritable(trip: RideCommunicationTrip) {
    this.assertReadable(trip);
    if (!ACTIVE_COMMUNICATION_STATUSES.has(trip.status)) {
      throw new BadRequestException("Completed or closed Rides cannot accept new messages or calls");
    }
  }

  private safeMessage(value: string) {
    const message = value.replace(/\s+/g, " ").trim();
    const sensitiveLabel = /\b(otp|one[- ]time password|password|passcode|pin|cvv|payment (?:token|secret)|secret key)\b/i;
    const possibleSecretDigits = /\b\d{4,8}\b|(?:\d[ -]?){12,19}/;
    if (sensitiveLabel.test(message) || possibleSecretDigits.test(message)) {
      throw new BadRequestException("Do not send passwords, OTPs, Ride PINs, card details or payment secrets in Ride chat");
    }
    return message;
  }

  private async notifyRecipient(trip: RideCommunicationTrip, senderRole: RideMessageSenderRole, messageEventId: string) {
    const recipientUserId = senderRole === "CUSTOMER" ? trip.driverProfile?.userId : trip.customer.user.id;
    if (!recipientUserId) return;
    const senderLabel = senderRole === "CUSTOMER" ? "Customer" : "Ride Captain";
    const notification = {
      userId: recipientUserId,
      title: "New Ride message",
      message: "Open KariGO to view it.",
      type: NotificationType.SYSTEM_ALERT,
      entityType: "TaxiTrip",
      entityId: trip.id,
      metadata: { event: "RIDE_MESSAGE", rideId: trip.id, messageEventId, senderLabel }
    };
    const results = await Promise.allSettled([
      this.notifications.createNotification(notification),
      this.notifications.createNotification({ ...notification, channel: NotificationChannel.PUSH })
    ]);
    if (results.some((result) => result.status === "rejected")) {
      this.logger.warn(`Ride message notification failed tripId=${trip.id} eventId=${messageEventId}`);
    }
  }

  private formatMessage(event: RideEvent, receipts: RideEvent[]) {
    const senderRole = this.senderRole(event);
    const deliveredReceipt = receipts.find((receipt) => {
      if (receipt.eventType !== RIDE_MESSAGE_DELIVERED_EVENT) return false;
      return this.jsonRecord(receipt.metadata).messageId === event.id;
    });
    const readReceipt = receipts.find((receipt) => {
      if (receipt.eventType !== RIDE_MESSAGE_READ_EVENT) return false;
      if (senderRole === "CUSTOMER" && receipt.actorType !== TaxiTripActorType.DRIVER) return false;
      if (senderRole === "CAPTAIN" && receipt.actorType !== TaxiTripActorType.CUSTOMER) return false;
      const lastMessageCreatedAt = this.jsonRecord(receipt.metadata).lastMessageCreatedAt;
      return typeof lastMessageCreatedAt === "string" && new Date(lastMessageCreatedAt) >= event.createdAt;
    });
    return {
      id: event.id,
      rideId: event.tripId,
      senderRole,
      senderLabel: senderRole === "CUSTOMER" ? "Customer" : "Ride Captain",
      message: event.note ?? "",
      deliveryState: readReceipt ? "READ" as const : deliveredReceipt ? "DELIVERED" as const : "SENT" as const,
      deliveredAt: deliveredReceipt?.createdAt.toISOString() ?? null,
      readAt: readReceipt?.createdAt.toISOString() ?? null,
      createdAt: event.createdAt.toISOString()
    };
  }

  private unreadCount(messages: RideEvent[], receipts: RideEvent[], viewerRole: RideMessageSenderRole) {
    const latestReadAt = receipts
      .filter((receipt) => receipt.eventType === RIDE_MESSAGE_READ_EVENT && (
        viewerRole === "CUSTOMER" ? receipt.actorType === TaxiTripActorType.CUSTOMER : receipt.actorType === TaxiTripActorType.DRIVER
      ))
      .map((receipt) => this.jsonRecord(receipt.metadata).lastMessageCreatedAt)
      .filter((value): value is string => typeof value === "string")
      .map((value) => new Date(value).getTime())
      .reduce((latest, value) => Math.max(latest, value), 0);
    return messages.filter((message) => this.senderRole(message) !== viewerRole && message.createdAt.getTime() > latestReadAt).length;
  }

  private senderRole(event: RideEvent): RideMessageSenderRole {
    return event.actorType === TaxiTripActorType.CUSTOMER ? "CUSTOMER" : "CAPTAIN";
  }

  private jsonRecord(value: Prisma.JsonValue | null): Record<string, Prisma.JsonValue> {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, Prisma.JsonValue> : {};
  }

  private retentionDays() {
    return Math.max(1, this.config.get<number>("RIDE_CONVERSATION_RETENTION_DAYS", 90));
  }

  private firstName(value: string | null | undefined, fallback: string) {
    return value?.trim().split(/\s+/)[0] || fallback;
  }
}
