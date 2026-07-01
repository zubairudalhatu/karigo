import { IsEnum, IsOptional } from "class-validator";
import { SettlementStatus } from "@prisma/client";

export class ListSettlementsQueryDto {
  @IsOptional()
  @IsEnum(SettlementStatus)
  status?: SettlementStatus;
}
