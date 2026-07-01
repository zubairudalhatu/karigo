import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";
import { SupportTicketCategory } from "@prisma/client";

export class CreateTicketDto {
  @IsEnum(SupportTicketCategory)
  category!: SupportTicketCategory;

  @IsString()
  @MinLength(3)
  @MaxLength(150)
  subject!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(3000)
  description!: string;

  @IsOptional()
  @IsUUID()
  orderId?: string;
}
