import { RideRealtimeService } from "./ride-realtime.service";

describe("RideRealtimeService", () => {
  it("publishes only to the requested Ride and user rooms", () => {
    const emit = jest.fn();
    const to = jest.fn(() => ({ emit }));
    const service = new RideRealtimeService();
    service.attach({ to } as any);
    service.emitToRide("ride-id", "ride.lifecycle.updated", { rideId: "ride-id" });
    service.emitToUser("user-id", "ride.call.incoming", { rideId: "ride-id" });
    expect(to).toHaveBeenNthCalledWith(1, "ride:ride-id");
    expect(to).toHaveBeenNthCalledWith(2, "user:user-id");
  });

  it("uses a Socket.IO room union so one recipient socket gets one message event", () => {
    const emit = jest.fn();
    const union = { to: jest.fn(), emit } as any;
    union.to.mockReturnValue(union);
    const serverTo = jest.fn(() => union);
    const service = new RideRealtimeService();
    service.attach({ to: serverTo } as any);

    service.emitToRideAndUser("ride-id", "recipient-id", "ride.message.new", { id: "message-id" });

    expect(serverTo).toHaveBeenCalledWith("ride:ride-id");
    expect(union.to).toHaveBeenCalledWith("user:recipient-id");
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith("ride.message.new", { id: "message-id" });
  });

  it("emits the free and paid waiting boundary without client polling", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-08-22T10:00:00.000Z"));
    const emit = jest.fn();
    const service = new RideRealtimeService();
    service.attach({ to: jest.fn(() => ({ emit })) } as any);
    service.schedulePaidWaiting("ride-id", new Date(), 300);
    expect(emit).toHaveBeenCalledWith("ride.waiting.free_started", expect.objectContaining({ rideId: "ride-id" }));
    jest.advanceTimersByTime(300_000);
    expect(emit).toHaveBeenCalledWith("ride.waiting.paid_started", expect.objectContaining({ rideId: "ride-id" }));
    jest.useRealTimers();
  });

  it("cancels paid waiting when the Ride starts", () => {
    jest.useFakeTimers();
    const emit = jest.fn();
    const service = new RideRealtimeService();
    service.attach({ to: jest.fn(() => ({ emit })) } as any);
    service.schedulePaidWaiting("ride-id", new Date(), 300);
    service.stopWaiting("ride-id", new Date());
    jest.advanceTimersByTime(300_000);
    expect(emit).not.toHaveBeenCalledWith("ride.waiting.paid_started", expect.anything());
    expect(emit).toHaveBeenCalledWith("ride.waiting.stopped", expect.objectContaining({ rideId: "ride-id" }));
    jest.useRealTimers();
  });
});
