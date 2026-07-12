import { api } from "./client";

export type CustomerReferralProfileStatus = "ACTIVE" | "SUSPENDED";
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

export interface CustomerReferralProfileResult {
  id: string;
  code: string;
  status: CustomerReferralProfileStatus;
  shareEnabled: boolean;
  totalReferrals: number;
  activatedReferrals: number;
  eligibleReferrals: number;
  lastReferralAt?: string | null;
  createdAt: string;
  updatedAt: string;
  summary: {
    totalReferrals: number;
    activatedReferrals: number;
    eligibleReferrals: number;
    rewardFulfillmentEnabled: boolean;
    note: string;
  };
}

export interface CustomerReferralRecord {
  id: string;
  referralCode: string;
  status: CustomerReferralStatus;
  referredCustomer: {
    id: string;
    fullName: string;
  };
  accountActivatedAt?: string | null;
  firstValidTransactionAt?: string | null;
  eligibleAt?: string | null;
  rewardIssuedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const referralsApi = {
  profile: () => api.get<CustomerReferralProfileResult>("referrals/me"),
  mine: () => api.get<CustomerReferralRecord[]>("referrals/my-referrals")
};
