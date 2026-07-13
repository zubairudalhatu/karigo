import { PreferredContactMethod, VendorApplicationCategory } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsBoolean, IsEmail, IsEnum, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;

export class CreateVendorApplicationDto {
  @IsEnum(VendorApplicationCategory)
  businessCategory!: VendorApplicationCategory;

  @IsString()
  @MaxLength(160)
  @Transform(trim)
  businessName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Transform(trim)
  tradingName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trim)
  businessType?: string;

  @IsString()
  @MaxLength(1000)
  @Transform(trim)
  businessDescription!: string;

  @IsString()
  @MaxLength(300)
  @Transform(trim)
  businessAddress!: string;

  @IsString()
  @IsIn(["Kano"], { message: "Vendor applications are currently limited to Kano State." })
  @MaxLength(80)
  @Transform(trim)
  state!: string;

  @IsString()
  @IsIn(["Kano"], { message: "Vendor applications are currently limited to Kano city." })
  @MaxLength(80)
  @Transform(trim)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trim)
  area?: string;

  @IsOptional()
  serviceAreas?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(240)
  @Transform(trim)
  operatingHours?: string;

  @IsString()
  @MaxLength(30)
  @Transform(trim)
  businessPhoneNumber!: string;

  @IsEmail()
  @MaxLength(160)
  @Transform(trim)
  businessEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  @Transform(trim)
  websiteOrSocialLink?: string;

  @IsString()
  @MaxLength(160)
  @Transform(trim)
  contactFullName!: string;

  @IsString()
  @MaxLength(120)
  @Transform(trim)
  contactRole!: string;

  @IsString()
  @MaxLength(30)
  @Transform(trim)
  contactPhoneNumber!: string;

  @IsEmail()
  @MaxLength(160)
  @Transform(trim)
  contactEmail!: string;

  @IsEnum(PreferredContactMethod)
  preferredContactMethod: PreferredContactMethod = PreferredContactMethod.PHONE;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  deliveryReadiness?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  deliveryPreference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  averagePreparationTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  numberOfStaff?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  catalogueCategory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  estimatedCatalogueSize?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  existingDelivery?: string;

  @IsOptional()
  brandAssets?: Record<string, unknown>;

  @IsOptional()
  documentPlaceholders?: Record<string, unknown>;

  @IsBoolean()
  declarationAccepted!: boolean;

  @IsBoolean()
  privacyAccepted!: boolean;

  @IsBoolean()
  contactConsentAccepted!: boolean;
}
