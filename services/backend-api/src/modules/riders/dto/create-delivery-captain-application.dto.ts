import { DeliveryCaptainVehicleType } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsBoolean, IsEmail, IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { ApplicationDocumentDto } from "../../../common/dto/application-document.dto";
import { NIGERIAN_PHONE_PATTERN, normalizePhoneNumber } from "../../../common/utils/phone.util";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;
const normalizePhone = ({ value }: { value: unknown }) => typeof value === "string" ? normalizePhoneNumber(value) : value;

export class CreateDeliveryCaptainApplicationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(trim)
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(NIGERIAN_PHONE_PATTERN, { message: "phoneNumber must be a valid Nigerian mobile number" })
  @MaxLength(32)
  @Transform(normalizePhone)
  phoneNumber!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  @Transform(trim)
  email?: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(["Kano", "Abuja"], { message: "Delivery Captain applications are currently limited to Kano or Abuja." })
  @MaxLength(80)
  @Transform(trim)
  city!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(["Kano", "FCT"], { message: "Delivery Captain applications are currently limited to Kano State or FCT for Abuja." })
  @MaxLength(80)
  @Transform(trim)
  state!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(220)
  @Transform(trim)
  address!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trim)
  preferredZone?: string;

  @IsEnum(DeliveryCaptainVehicleType)
  vehicleType!: DeliveryCaptainVehicleType;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Transform(trim)
  vehiclePlateNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(700)
  @Transform(trim)
  riderExperience?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trim)
  profilePhotoUrl?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(trim)
  guarantorName!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(NIGERIAN_PHONE_PATTERN, { message: "guarantorPhone must be a valid Nigerian mobile number" })
  @MaxLength(32)
  @Transform(normalizePhone)
  guarantorPhone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(700)
  @Transform(trim)
  notes?: string;

  @IsOptional()
  documents?: ApplicationDocumentDto[];

  @IsBoolean()
  declarationAccepted!: boolean;

  @IsBoolean()
  privacyAccepted!: boolean;

  @IsBoolean()
  contactConsentAccepted!: boolean;
}
