import { IsEnum } from "class-validator";
import { RiderStatus } from "@prisma/client";

export enum RiderAvailability {
  ONLINE = "ONLINE",
  OFFLINE = "OFFLINE"
}

export class UpdateRiderAvailabilityDto {
  @IsEnum(RiderAvailability)
  availability!: RiderAvailability;
}
