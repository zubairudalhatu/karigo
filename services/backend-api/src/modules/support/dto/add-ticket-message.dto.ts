import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class AddTicketMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(3000)
  message!: string;

  @IsOptional()
  @IsBoolean()
  isInternalNote?: boolean;
}
