import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { AccountStatus, RiderStatus, TaxiDriverProfileStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedUser } from "../interfaces/authenticated-user.interface";

@Injectable()
export class ApprovedCaptainGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const userId = request.user?.id;
    if (!userId) {
      throw new ForbiddenException("Captain operations will be available after KariGO approves your application.");
    }

    const [rider, rideProfile] = await Promise.all([
      this.prisma.rider.findUnique({
        where: { userId },
        select: {
          deletedAt: true,
          verificationStatus: true,
          user: { select: { accountStatus: true, deletedAt: true } }
        }
      }),
      this.prisma.taxiDriverProfile.findUnique({
        where: { userId },
        select: {
          status: true,
          user: { select: { accountStatus: true, deletedAt: true } }
        }
      })
    ]);

    const deliveryActive = Boolean(
      rider &&
      !rider.deletedAt &&
      !rider.user.deletedAt &&
      rider.user.accountStatus === AccountStatus.ACTIVE &&
      rider.verificationStatus === RiderStatus.ACTIVE
    );
    const rideActive = Boolean(
      rideProfile &&
      rideProfile.user &&
      !rideProfile.user.deletedAt &&
      rideProfile.user.accountStatus === AccountStatus.ACTIVE &&
      rideProfile.status === TaxiDriverProfileStatus.ACTIVE
    );

    if (!deliveryActive && !rideActive) {
      throw new ForbiddenException("Captain operations will be available after KariGO approves your application.");
    }

    return true;
  }
}
