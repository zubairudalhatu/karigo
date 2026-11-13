import { OrderStatus } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional } from "class-validator";

// Optional together for compatibility with existing web requests. Mobile sends both.
export class OrderPreconditionDto {
  @IsOptional() @IsEnum(OrderStatus) expectedStatus?: OrderStatus;
  @IsOptional() @IsDateString() expectedUpdatedAt?: string;
}
