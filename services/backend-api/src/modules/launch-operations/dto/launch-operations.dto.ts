import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min
} from "class-validator";
import {
  ControlledSupplyGroupStatus,
  ControlledSupplyMemberType,
  LaunchChecklistItemStatus,
  LaunchCohortMemberStatus,
  LaunchCohortStatus,
  LaunchDrillResult,
  LaunchDrillStepStatus,
  LaunchDrillType,
  LaunchIncidentSeverity,
  LaunchIncidentStatus,
  LaunchReadinessStatus,
  LaunchServiceType,
  LaunchStage
} from "@prisma/client";

export class LaunchAvailabilityQueryDto {
  @IsString()
  @MaxLength(80)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  zoneId?: string;
}

export class UpdateLaunchConfigDto {
  @IsEnum(LaunchStage)
  launchStage!: LaunchStage;

  @IsBoolean()
  isEnabled!: boolean;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  @IsBoolean()
  confirmed!: boolean;

  @IsOptional()
  @IsBoolean()
  highImpactConfirmed?: boolean;

  @IsOptional()
  @IsDateString()
  activeFrom?: string;

  @IsOptional()
  @IsDateString()
  activeUntil?: string;

  @IsOptional()
  @IsObject()
  operatingHours?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  allowedZoneIds?: string[];

  @IsOptional()
  @IsUUID()
  inviteCohortId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  maxConcurrentRequests?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  maxUnassignedRequests?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  minimumOnlineCaptainCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  minimumOnlinePartnerCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  assignmentTimeoutMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  captainLocationFreshMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  customerMessage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  closedMessage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  internalNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  pausedReason?: string;
}

export class CreateLaunchCohortDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(80)
  city!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  maximumCustomers!: number;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsEnum(LaunchCohortStatus)
  status?: LaunchCohortStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateLaunchCohortDto {
  @IsEnum(LaunchCohortStatus)
  status!: LaunchCohortStatus;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class AddLaunchCohortMembersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID(undefined, { each: true })
  userIds!: string[];
}

export class UpdateLaunchCohortMemberDto {
  @IsEnum(LaunchCohortMemberStatus)
  status!: LaunchCohortMemberStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CreateControlledSupplyGroupDto {
  @IsString() @IsNotEmpty() @MaxLength(120) name!: string;
  @IsString() @MaxLength(80) city!: string;
  @IsEnum(LaunchServiceType) serviceType!: LaunchServiceType;
  @Type(() => Number) @IsInt() @Min(1) @Max(500) maximumMembers!: number;
  @IsOptional() @IsDateString() startAt?: string;
  @IsOptional() @IsDateString() endAt?: string;
  @IsOptional() @IsString() @MaxLength(1000) internalNote?: string;
}

export class UpdateControlledSupplyGroupDto {
  @IsEnum(ControlledSupplyGroupStatus) status!: ControlledSupplyGroupStatus;
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}

export class AddControlledSupplyMemberDto {
  @IsEnum(ControlledSupplyMemberType) memberType!: ControlledSupplyMemberType;
  @IsOptional() @IsUUID() captainUserId?: string;
  @IsOptional() @IsUUID() vendorId?: string;
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}

export class UpdateControlledSupplyMemberDto {
  @IsBoolean() enabled!: boolean;
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}

export class AddControlledOperationsCustomerDto {
  @IsString() @MaxLength(80) city!: string;
  @IsUUID() userId!: string;
  @IsString() @IsNotEmpty() @MaxLength(120) label!: string;
  @IsOptional() @IsString() @MaxLength(1000) internalNote?: string;
}

export class UpdateControlledOperationsCustomerDto {
  @IsBoolean() enabled!: boolean;
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}

export class UpdateOperationsChecklistItemDto {
  @IsEnum(LaunchChecklistItemStatus) status!: LaunchChecklistItemStatus;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
  @IsOptional() @IsString() @MaxLength(1000) waiverReason?: string;
  @IsOptional() @IsDateString() waiverExpiresAt?: string;
}

export class QuickLaunchSearchQueryDto {
  @IsString() @MaxLength(80) city!: string;
  @IsEnum(LaunchServiceType) serviceType!: LaunchServiceType;
  @IsOptional() @IsString() @MaxLength(120) query?: string;
}

export class QuickLaunchCustomerSearchQueryDto {
  @IsString() @MaxLength(80) city!: string;
  @IsOptional() @IsString() @MaxLength(120) query?: string;
}

export class StartQuickLaunchDto {
  @IsString() @MaxLength(80) city!: string;
  @IsEnum(LaunchServiceType) serviceType!: LaunchServiceType;
  @IsUUID() customerUserId!: string;
  @IsOptional() @IsUUID() captainUserId?: string;
  @IsOptional() @IsUUID() partnerVendorId?: string;
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
  @IsBoolean() confirmed!: boolean;
}

export class FinishQuickLaunchDto {
  @IsIn(["PASSED", "FAILED", "STOPPED"])
  outcome!: "PASSED" | "FAILED" | "STOPPED";

  @IsBoolean()
  returnServiceOff!: boolean;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;

  @IsBoolean()
  confirmed!: boolean;
}

export class UpdateLaunchReadinessDto {
  @IsEnum(LaunchReadinessStatus)
  status!: LaunchReadinessStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  waiverReason?: string;

  @IsOptional()
  @IsDateString()
  waiverExpiresAt?: string;
}

export class CreateLaunchIncidentDto {
  @IsEnum(LaunchIncidentSeverity)
  severity!: LaunchIncidentSeverity;

  @IsString()
  @MaxLength(80)
  city!: string;

  @IsOptional()
  @IsEnum(LaunchServiceType)
  serviceType?: LaunchServiceType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  summary!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  customerImpact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  captainPartnerImpact?: string;
}

export class UpdateLaunchIncidentDto {
  @IsEnum(LaunchIncidentStatus)
  status!: LaunchIncidentStatus;

  @IsOptional()
  @IsUUID()
  assignedOwnerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  mitigation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  rootCause?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  resolution?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  followUpActions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  timelineNote?: string;
}

export class PauseFromIncidentDto {
  @IsBoolean()
  confirmed!: boolean;

  @IsBoolean()
  highImpactConfirmed!: boolean;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class CreateLaunchDrillDto {
  @IsString()
  @MaxLength(80)
  city!: string;

  @IsEnum(LaunchDrillType)
  drillType!: LaunchDrillType;

  @IsOptional()
  @IsEnum(LaunchServiceType)
  serviceType?: LaunchServiceType;

  @IsOptional()
  @IsUUID()
  customerUserId?: string;

  @IsOptional()
  @IsUUID()
  captainUserId?: string;

  @IsOptional()
  @IsUUID()
  partnerUserId?: string;

  @IsOptional()
  @IsUUID()
  controlledCustomerId?: string;

  @IsOptional()
  @IsUUID()
  controlledSupplyGroupId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  relatedReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateLaunchDrillDto {
  @IsEnum(LaunchDrillResult)
  result!: LaunchDrillResult;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  failureStage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  evidenceReference?: string;

  @IsOptional()
  @IsBoolean()
  criticalFailure?: boolean;
}

export class UpdateLaunchDrillStepDto {
  @IsEnum(LaunchDrillStepStatus) status!: LaunchDrillStepStatus;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class ReopenLaunchDrillDto {
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}

export class LinkLaunchDrillFailureDto {
  @IsIn(["INCIDENT", "SUPPORT", "BOTH", "NEITHER"])
  action!: "INCIDENT" | "SUPPORT" | "BOTH" | "NEITHER";
  @IsOptional() @IsEnum(LaunchIncidentSeverity) severity?: LaunchIncidentSeverity;
  @IsString() @IsNotEmpty() @MaxLength(500) summary!: string;
  @IsOptional() @IsBoolean() criticalFailure?: boolean;
}
