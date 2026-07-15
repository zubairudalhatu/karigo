import { IsEnum } from "class-validator";

export enum VendorUploadPurpose {
  ONBOARDING_DOCUMENT = "onboarding-document",
  PRODUCT_IMAGE = "product-image",
  SERVICE_IMAGE = "service-image",
  LOGO = "logo",
  COVER = "cover"
}

export class VendorUploadDto {
  @IsEnum(VendorUploadPurpose)
  purpose!: VendorUploadPurpose;
}
