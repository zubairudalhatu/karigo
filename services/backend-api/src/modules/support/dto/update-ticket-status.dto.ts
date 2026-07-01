import { IsEnum, IsOptional } from "class-validator";
import { SupportTicketPriority, SupportTicketStatus } from "@prisma/client";

export class UpdateTicketStatusDto {
  @IsEnum(SupportTicketStatus)
  status!: SupportTicketStatus;

  @IsOptional()
  @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority;
}
