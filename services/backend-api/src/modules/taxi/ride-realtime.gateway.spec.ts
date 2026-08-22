import { AccountStatus } from "@prisma/client";
import { RideRealtimeGateway } from "./ride-realtime.gateway";

describe("RideRealtimeGateway", () => {
  const rideId = "20000000-0000-4000-8000-000000000001";
  const messageId = "30000000-0000-4000-8000-000000000001";
  const jwt: any = { verifyAsync: jest.fn() };
  const prisma: any = { user: { findUnique: jest.fn() } };
  const communications: any = {
    authorizeRealtimeParticipant: jest.fn(),
    acknowledgeDelivered: jest.fn()
  };
  const realtime: any = {
    attach: jest.fn(),
    userRoom: jest.fn((id: string) => `user:${id}`),
    rideRoom: jest.fn((id: string) => `ride:${id}`)
  };
  let gateway: RideRealtimeGateway;
  let client: any;

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new RideRealtimeGateway(jwt, prisma, communications, realtime);
    client = {
      handshake: { auth: { token: "jwt-token" }, headers: {} },
      data: {},
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn()
    };
    jwt.verifyAsync.mockResolvedValue({ sub: "user-id" });
    prisma.user.findUnique.mockResolvedValue({ id: "user-id", accountStatus: AccountStatus.ACTIVE, deletedAt: null });
    communications.authorizeRealtimeParticipant.mockResolvedValue({ participantRole: "CUSTOMER" });
    communications.acknowledgeDelivered.mockResolvedValue({ rideId, messageId, deliveredAt: "2026-08-22T10:00:00.000Z" });
  });

  it("authenticates active accounts and joins only their personal room", async () => {
    await gateway.handleConnection(client);
    expect(jwt.verifyAsync).toHaveBeenCalledWith("jwt-token");
    expect(client.join).toHaveBeenCalledWith("user:user-id");
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it("fails closed for deleted or inactive accounts", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "user-id", accountStatus: AccountStatus.SUSPENDED, deletedAt: null });
    await gateway.handleConnection(client);
    expect(client.emit).toHaveBeenCalledWith("ride.realtime.error", expect.objectContaining({ code: "AUTHENTICATION_REQUIRED" }));
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it("authorizes Ride membership before joining a Ride room", async () => {
    client.data.userId = "user-id";
    const result = await gateway.subscribe(client, { rideId });
    expect(communications.authorizeRealtimeParticipant).toHaveBeenCalledWith("user-id", rideId);
    expect(client.join).toHaveBeenCalledWith(`ride:${rideId}`);
    expect(result).toEqual({ event: "ride.subscribed", data: { rideId, participantRole: "CUSTOMER" } });
  });

  it("routes delivered acknowledgements through participant authorization", async () => {
    client.data.userId = "user-id";
    const result = await gateway.delivered(client, { rideId, messageId });
    expect(communications.acknowledgeDelivered).toHaveBeenCalledWith("user-id", rideId, messageId);
    expect(result.event).toBe("ride.message.delivery_acknowledged");
  });

  it("rejects malformed Ride identifiers before any room join", async () => {
    client.data.userId = "user-id";
    await expect(gateway.subscribe(client, { rideId: "not-a-uuid" })).rejects.toThrow("rideId must be a valid identifier");
    expect(client.join).not.toHaveBeenCalled();
  });
});
