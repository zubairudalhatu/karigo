import { RideContentExpiryService } from "./ride-content-expiry.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("Narrow Ride coordinate disposal", () => {
  it("only targets expired explicitly Google-derived coordinates; leaves identity/financial/user fields untouched", async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const service = new RideContentExpiryService({ taxiTrip: { updateMany } } as unknown as PrismaService);
    const now = new Date("2026-10-18T12:00:00Z");
    await expect(service.disposeExpired(now)).resolves.toEqual({ pickup: 1, destination: 1, stop: 1 });
    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: { pickupContentSource: "GOOGLE_DERIVED", pickupGoogleExpiresAt: { lte: now } },
      data: { pickupLatitude: null, pickupLongitude: null, pickupGoogleExpiresAt: null }
    });
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: { destinationContentSource: "GOOGLE_DERIVED", destinationGoogleExpiresAt: { lte: now } },
      data: { destinationLatitude: null, destinationLongitude: null, destinationGoogleExpiresAt: null }
    });
    expect(updateMany).toHaveBeenNthCalledWith(3, {
      where: { stopContentSource: "GOOGLE_DERIVED", stopGoogleExpiresAt: { lte: now } },
      data: { stopLatitude: null, stopLongitude: null, stopGoogleExpiresAt: null }
    });
  });
  it("reports a sanitized failure", async () => {
    const updateMany = jest.fn().mockRejectedValue(new Error("synthetic private detail"));
    const service = new RideContentExpiryService({ taxiTrip: { updateMany } } as unknown as PrismaService);
    await expect(service.disposeExpired()).resolves.toEqual({ failed: true });
    expect(updateMany).toHaveBeenCalledTimes(1);
  });
});
