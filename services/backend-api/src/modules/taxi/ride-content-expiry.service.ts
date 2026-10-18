import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/** Only the new, explicitly Google-derived coordinate fields. Not the broad retention worker. */
@Injectable()
export class RideContentExpiryService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly logger = new Logger(RideContentExpiryService.name);
  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    void this.disposeExpired();
    this.timer = setInterval(() => void this.disposeExpired(), 15 * 60 * 1000);
    this.timer.unref();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  async disposeExpired(now = new Date()) {
    if (this.running) return;
    this.running = true;
    try {
      const pickup = await this.prisma.taxiTrip.updateMany({
        where: { pickupContentSource: "GOOGLE_DERIVED", pickupGoogleExpiresAt: { lte: now } },
        data: { pickupLatitude: null, pickupLongitude: null, pickupGoogleExpiresAt: null }
      });
      const destination = await this.prisma.taxiTrip.updateMany({
        where: { destinationContentSource: "GOOGLE_DERIVED", destinationGoogleExpiresAt: { lte: now } },
        data: { destinationLatitude: null, destinationLongitude: null, destinationGoogleExpiresAt: null }
      });
      const stop = await this.prisma.taxiTrip.updateMany({
        where: { stopContentSource: "GOOGLE_DERIVED", stopGoogleExpiresAt: { lte: now } },
        data: { stopLatitude: null, stopLongitude: null, stopGoogleExpiresAt: null }
      });
      this.logger.log(JSON.stringify({ kind: "ride_google_coordinate_expiry", pickup: pickup.count, destination: destination.count, stop: stop.count }));
      return { pickup: pickup.count, destination: destination.count, stop: stop.count };
    } catch {
      // No location, object reference or raw database error enters logs.
      this.logger.error("RIDE_GOOGLE_COORDINATE_EXPIRY_FAILED");
      return { failed: true };
    } finally { this.running = false; }
  }
}
