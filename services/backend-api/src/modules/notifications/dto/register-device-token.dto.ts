import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AppSurface, DevicePlatform, PushProvider } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class RegisterDeviceTokenDto {
  @ApiProperty({ example: "ExponentPushToken[development-token]" })
  @IsString()
  @MinLength(10)
  @MaxLength(2048)
  token!: string;

  @ApiProperty({ enum: DevicePlatform, example: DevicePlatform.ANDROID })
  @IsEnum(DevicePlatform)
  platform!: DevicePlatform;

  @ApiProperty({ enum: PushProvider, example: PushProvider.EXPO })
  @IsEnum(PushProvider)
  provider!: PushProvider;

  @ApiProperty({ enum: AppSurface, example: AppSurface.CUSTOMER_APP })
  @IsEnum(AppSurface)
  appSurface!: AppSurface;

  @ApiPropertyOptional({ example: "development-device-id" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  deviceId?: string;
}
