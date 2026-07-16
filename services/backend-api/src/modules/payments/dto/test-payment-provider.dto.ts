import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";

export const SANDBOX_INITIALIZATION_TEST_PROVIDERS = ["paystack", "monnify", "squad"] as const;

export type SandboxInitializationTestProvider = typeof SANDBOX_INITIALIZATION_TEST_PROVIDERS[number];

export class TestPaymentProviderDto {
  @ApiProperty({ enum: SANDBOX_INITIALIZATION_TEST_PROVIDERS })
  @IsIn(SANDBOX_INITIALIZATION_TEST_PROVIDERS)
  provider!: SandboxInitializationTestProvider;
}
