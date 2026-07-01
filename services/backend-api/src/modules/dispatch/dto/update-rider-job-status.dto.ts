import { IsEnum } from "class-validator";
import { OrderStatus } from "@prisma/client";

export enum RiderDeliveryStatus {
  PICKED_UP = "PICKED_UP",
  ON_THE_WAY = "ON_THE_WAY",
  ARRIVED_DESTINATION = "ARRIVED_DESTINATION",
  DELIVERED = "DELIVERED"
}

export class UpdateRiderJobStatusDto {
  @IsEnum(RiderDeliveryStatus)
  status!: RiderDeliveryStatus;
}
