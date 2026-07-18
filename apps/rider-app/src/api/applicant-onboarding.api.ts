import { api } from "./client";

export type ApplicantNextStep = "OTP_REQUIRED" | "PASSWORD_REQUIRED" | "READY_FOR_APPLICATION";

export interface ApplicantAccount {
  id: string;
  fullName: string;
  phoneNumber: string;
  email?: string | null;
  role: string;
  accountStatus: string;
  phoneVerified: boolean;
  passwordCreated: boolean;
}

export interface ApplicantOnboardingResult {
  account: ApplicantAccount;
  nextStep: ApplicantNextStep;
  otpExpiresAt?: string;
}

const prefix = "auth/captain-onboarding";

export const applicantOnboardingApi = {
  createAccount: (body: { fullName: string; phoneNumber: string; email?: string }) =>
    api.post<ApplicantOnboardingResult>(`${prefix}/account`, body, { authenticated: false }),
  resendOtp: (body: { phoneNumber: string }) =>
    api.post<{ resendAccepted: boolean; otpExpiresAt?: string }>(`${prefix}/resend-otp`, body, { authenticated: false }),
  verifyOtp: (body: { phoneNumber: string; otp: string }) =>
    api.post<ApplicantOnboardingResult>(`${prefix}/verify-otp`, body, { authenticated: false }),
  createPassword: (body: { phoneNumber: string; password: string }) =>
    api.post<ApplicantOnboardingResult>(`${prefix}/password`, body, { authenticated: false })
};
