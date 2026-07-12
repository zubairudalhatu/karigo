import { api } from "./client";

export type CustomerReferralStatus =
  | "REGISTERED"
  | "ACCOUNT_ACTIVATED"
  | "FIRST_VALID_TRANSACTION_COMPLETED"
  | "ELIGIBLE_FOR_REWARD"
  | "REWARD_REVIEW_PENDING"
  | "REWARD_APPROVED"
  | "REWARD_ISSUED"
  | "INELIGIBLE"
  | "CANCELLED";
export type ReferralRewardTrigger = "ACCOUNT_ACTIVATED" | "FIRST_COMPLETED_ORDER" | "FIRST_COMPLETED_UTILITY_TRANSACTION" | "MANUAL_ADMIN_REVIEW";
export type ReferralRewardType = "WALLET_CREDIT" | "PROMO_CODE" | "AIRTIME" | "DATA" | "MANUAL_REVIEW";

export interface AdminReferralRecord {
  id: string;
  referralCode: string;
  status: CustomerReferralStatus;
  referrerCustomer: ReferralCustomer;
  referredCustomer: ReferralCustomer;
  rewardRule?: { id: string; name: string; trigger: ReferralRewardTrigger; rewardType: ReferralRewardType; isActive: boolean } | null;
  accountActivatedAt?: string | null;
  firstValidTransactionAt?: string | null;
  eligibleAt?: string | null;
  rewardReviewedAt?: string | null;
  rewardIssuedAt?: string | null;
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
  fulfillmentEnabled: boolean;
}

export interface ReferralCustomer {
  id: string;
  user: {
    id: string;
    fullName: string;
    phoneNumber: string;
    email?: string | null;
  };
}

export interface AdminReferralsResult {
  summary: {
    total: number;
    registered: number;
    accountActivated: number;
    eligibleForReward: number;
    rewardReviewPending: number;
    rewardApproved: number;
    rewardsIssued: number;
    automaticRewardFulfillmentEnabled: boolean;
  };
  items: AdminReferralRecord[];
}

export interface ReferralRewardRule {
  id: string;
  name: string;
  description?: string | null;
  trigger: ReferralRewardTrigger;
  rewardType: ReferralRewardType;
  referrerRewardValue: string | number;
  referredCustomerRewardValue: string | number;
  minimumTransactionAmount?: string | number | null;
  requiredValidTransactions: number;
  currency: string;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  createdByAdmin?: { id: string; fullName: string; email?: string | null; adminRole?: string | null } | null;
  createdAt: string;
  updatedAt: string;
  fulfillmentEnabled: boolean;
}

function query(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value) search.set(key, value); });
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const referralsApi = {
  list: (filters: { status?: CustomerReferralStatus | "ALL"; search?: string } = {}) =>
    api.get<AdminReferralsResult>(`admin/referrals${query({ status: filters.status === "ALL" ? undefined : filters.status, search: filters.search })}`),
  detail: (referralId: string) => api.get<AdminReferralRecord>(`admin/referrals/${referralId}`),
  review: (referralId: string, body: { status: CustomerReferralStatus; rewardRuleId?: string | null; adminNote?: string }) =>
    api.patch<AdminReferralRecord>(`admin/referrals/${referralId}/review`, body),
  rewardRules: (filters: { isActive?: "ALL" | "true" | "false"; rewardType?: ReferralRewardType | "ALL" } = {}) =>
    api.get<ReferralRewardRule[]>(`admin/referrals/reward-rules${query({
      isActive: filters.isActive === "ALL" ? undefined : filters.isActive,
      rewardType: filters.rewardType === "ALL" ? undefined : filters.rewardType
    })}`)
};
