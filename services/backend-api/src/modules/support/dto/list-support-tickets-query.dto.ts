import { IsDateString, IsEnum, IsOptional, IsUUID } from "class-validator";
import { SupportTicketCategory, SupportTicketPriority, SupportTicketStatus } from "@prisma/client";

export class ListSupportTicketsQueryDto {
  @IsOptional() @IsEnum(SupportTicketStatus) status?: SupportTicketStatus;
  @IsOptional() @IsEnum(SupportTicketCategory) category?: SupportTicketCategory;
  @IsOptional() @IsEnum(SupportTicketPriority) priority?: SupportTicketPriority;
  @IsOptional() @IsUUID() assignedAdminId?: string;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
}
