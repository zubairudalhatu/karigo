import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";

export class UpdateSmeServicesPilotReadinessItemDto {
  @IsString()
  key!: string;

  @IsBoolean()
  isCompleted!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class UpdateSmeServicesPilotReadinessDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSmeServicesPilotReadinessItemDto)
  items!: UpdateSmeServicesPilotReadinessItemDto[];
}
