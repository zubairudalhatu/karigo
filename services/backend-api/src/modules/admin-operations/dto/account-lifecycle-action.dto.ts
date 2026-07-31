import { IsIn, IsString, MaxLength, MinLength } from "class-validator";

export const ACCOUNT_LIFECYCLE_ACTIONS = ["ACTIVATE", "SUSPEND", "REACTIVATE"] as const;
export type AccountLifecycleAction = typeof ACCOUNT_LIFECYCLE_ACTIONS[number];

export class AccountLifecycleActionDto {
  @IsIn(ACCOUNT_LIFECYCLE_ACTIONS)
  action!: AccountLifecycleAction;

  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}
