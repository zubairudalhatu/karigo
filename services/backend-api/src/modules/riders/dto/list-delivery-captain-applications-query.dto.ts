import { DeliveryCaptainApplicationStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class ListDeliveryCaptainApplicationsQueryDto {
  @IsOptional()
  @IsEnum(DeliveryCaptainApplicationStatus)
  status?: DeliveryCaptainApplicationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
