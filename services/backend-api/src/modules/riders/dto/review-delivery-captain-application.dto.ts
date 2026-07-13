import { DeliveryCaptainApplicationStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class ReviewDeliveryCaptainApplicationDto {
  @IsEnum(DeliveryCaptainApplicationStatus)
  status!: DeliveryCaptainApplicationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(700)
  applicantVisibleNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}
