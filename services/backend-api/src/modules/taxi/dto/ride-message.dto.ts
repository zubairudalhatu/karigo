import { Type } from "class-transformer";
import { IsInt, IsISO8601, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from "class-validator";

export class CreateRideMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  message!: string;
}

export class ListRideMessagesQueryDto {
  @IsOptional()
  @IsISO8601()
  before?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 30;
}

export class MarkRideMessagesReadDto {
  @IsUUID()
  lastMessageId!: string;
}
