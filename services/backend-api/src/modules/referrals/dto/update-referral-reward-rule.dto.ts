import { PartialType } from "@nestjs/swagger";
import { CreateReferralRewardRuleDto } from "./create-referral-reward-rule.dto";

export class UpdateReferralRewardRuleDto extends PartialType(CreateReferralRewardRuleDto) {}
