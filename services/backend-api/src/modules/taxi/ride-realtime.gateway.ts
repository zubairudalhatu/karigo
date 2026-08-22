import { JwtService } from "@nestjs/jwt";
import { AccountStatus } from "@prisma/client";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { PrismaService } from "../../prisma/prisma.service";
import { RideCommunicationsService } from "./ride-communications.service";
import { RideRealtimeService } from "./ride-realtime.service";

type AuthenticatedRideSocket = Socket & { data: { userId?: string } };

@WebSocketGateway({
  namespace: "/ride-realtime",
  transports: ["websocket"],
  cors: { origin: true, credentials: false }
})
export class RideRealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly communications: RideCommunicationsService,
    private readonly realtime: RideRealtimeService
  ) {}

  afterInit(server: Server) {
    this.realtime.attach(server);
  }

  async handleConnection(client: AuthenticatedRideSocket) {
    try {
      const supplied = client.handshake.auth?.token ?? client.handshake.headers.authorization;
      const token = typeof supplied === "string" ? supplied.replace(/^Bearer\s+/i, "") : "";
      if (!token) throw new Error("missing token");
      const payload = await this.jwt.verifyAsync<{ sub?: string }>(token);
      if (!payload.sub) throw new Error("missing subject");
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, accountStatus: true, deletedAt: true }
      });
      if (!user || user.deletedAt || user.accountStatus !== AccountStatus.ACTIVE) {
        throw new Error("inactive account");
      }
      client.data.userId = user.id;
      await client.join(this.realtime.userRoom(user.id));
    } catch {
      client.emit("ride.realtime.error", { code: "AUTHENTICATION_REQUIRED", message: "Ride realtime authentication failed" });
      client.disconnect(true);
    }
  }

  @SubscribeMessage("ride.subscribe")
  async subscribe(@ConnectedSocket() client: AuthenticatedRideSocket, @MessageBody() body: { rideId?: string }) {
    const userId = this.userId(client);
    const rideId = this.rideId(body.rideId);
    const authorized = await this.communications.authorizeRealtimeParticipant(userId, rideId);
    await client.join(this.realtime.rideRoom(rideId));
    return { event: "ride.subscribed", data: { rideId, participantRole: authorized.participantRole } };
  }

  @SubscribeMessage("ride.unsubscribe")
  async unsubscribe(@ConnectedSocket() client: AuthenticatedRideSocket, @MessageBody() body: { rideId?: string }) {
    const rideId = this.rideId(body.rideId);
    await client.leave(this.realtime.rideRoom(rideId));
    return { event: "ride.unsubscribed", data: { rideId } };
  }

  @SubscribeMessage("ride.message.delivered")
  async delivered(@ConnectedSocket() client: AuthenticatedRideSocket, @MessageBody() body: { rideId?: string; messageId?: string }) {
    const userId = this.userId(client);
    const rideId = this.rideId(body.rideId);
    const messageId = this.uuid(body.messageId, "messageId");
    return {
      event: "ride.message.delivery_acknowledged",
      data: await this.communications.acknowledgeDelivered(userId, rideId, messageId)
    };
  }

  private userId(client: AuthenticatedRideSocket) {
    if (!client.data.userId) throw new WsException("Ride realtime authentication is required");
    return client.data.userId;
  }

  private rideId(value?: string) {
    return this.uuid(value, "rideId");
  }

  private uuid(value: string | undefined, field: string) {
    if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      throw new WsException(`${field} must be a valid identifier`);
    }
    return value;
  }
}
