import { IsUUID } from "class-validator";

export class AdminAssignTaxiDriverDto {
  @IsUUID()
  driverProfileId!: string;
}
