import { IsISO8601, IsNumber, IsOptional, Max, Min } from "class-validator";
import { LaunchAvailabilityQueryDto } from "./launch-operations.dto";

// Body only: never place precise location in URL/query/request-log labels.
export class CaptainReadinessDto extends LaunchAvailabilityQueryDto {
  @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;
  @IsOptional() @IsISO8601() recordedAt?: string;
  @IsOptional() @IsNumber() @Min(0) accuracyMeters?: number | null;
}
