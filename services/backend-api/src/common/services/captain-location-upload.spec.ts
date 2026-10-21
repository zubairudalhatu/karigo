import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { CaptainWorkStateService } from "./captain-work-state.service";
import { UpdateCaptainAvailabilityDto } from "../../modules/riders/dto/update-captain-availability.dto";

describe("Captain location upload numeric contract", () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
  const point = () => ({ clientPointId: "local-location-regression", latitude: 9.08, longitude: 7.49,
    recordedAt: new Date().toISOString(), source: "BACKGROUND" });

  it("rejects the shipped iOS unknown-speed/course sentinel before a database write", async () => {
    await expect(pipe.transform({ latitude: 9.08, longitude: 7.49, tracePoints: [{ ...point(), speedMetersPerSecond: -1, headingDegrees: -1 }] },
      { type: "body", metatype: UpdateCaptainAvailabilityDto })).rejects.toThrow();
  });

  it("accepts normalized unknown telemetry, updates active-work location and preserves availability", async () => {
    const state = { activeWorkMode: "RIDE", activeRideTripId: "local-ride", lockStage: "ACCEPTED" };
    const user = { rider: { id: "local-rider" }, taxiDriverProfiles: [{ id: "local-driver" }], captainWorkState: state };
    const tx = { captainWorkState: { update: jest.fn() }, rider: { update: jest.fn() }, taxiDriverProfile: { update: jest.fn() },
      taxiRideTracePoint: { createMany: jest.fn() } };
    const service: any = Object.create(CaptainWorkStateService.prototype);
    Object.assign(service, { prisma: { $transaction: async (fn: any) => fn(tx) },
      loadUser: async () => user, ensureState: async () => state,
      rideEligibility: () => ({ eligible: true }), deliveryEligibility: () => ({ eligible: false }),
      getForUser: async () => state });
    const body = await pipe.transform({ latitude: 9.08, longitude: 7.49, accuracyMeters: 10, tracePoints: [point()] },
      { type: "body", metatype: UpdateCaptainAvailabilityDto });
    await expect(service.updateAvailability("local-captain", body)).resolves.toBe(state);
    expect(tx.captainWorkState.update).toHaveBeenCalledWith({ where: { userId: "local-captain" }, data: { lastLocationAt: expect.any(Date), version: { increment: 1 } } });
    expect(tx.rider.update).toHaveBeenCalled(); expect(tx.taxiDriverProfile.update).toHaveBeenCalled();
    expect(tx.taxiRideTracePoint.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({
      tripId: "local-ride", clientPointId: "local-location-regression", source: "BACKGROUND",
      speedMetersPerSecond: null, headingDegrees: null
    })], skipDuplicates: true });
    // First legitimate sample is inserted; deduplication is delegated to the unique point key.
    expect(tx.taxiRideTracePoint.createMany).toHaveBeenCalledTimes(1);
  });
});
