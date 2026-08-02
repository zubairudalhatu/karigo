import type { AuthenticatedUser, LoginRequest, LoginResult, LogoutRequest, RefreshSessionRequest } from "@karigo/shared-types";
import { api } from "./client";

export interface VendorApplicantAccountInput {
  fullName: string;
  phoneNumber: string;
  email?: string;
}

export interface VendorApplicantOtpInput {
  phoneNumber: string;
  otp: string;
}

export interface VendorApplicantPasswordInput {
  phoneNumber: string;
  password: string;
}

export interface ApplicantOnboardingResult {
  userId?: string;
  role?: string;
  phoneNumber?: string;
  phoneVerified?: boolean;
  email?: string | null;
  nextStep: "CREATE_ACCOUNT" | "OTP_REQUIRED" | "PASSWORD_REQUIRED" | "READY_FOR_APPLICATION" | "SIGN_IN_REQUIRED";
  message?: string;
  otpExpiresAt?: string;
  mockOtp?: string;
}

export interface PasswordResetRequestResult {
  requestAccepted: boolean;
  otpExpiresAt?: string;
  mockOtp?: string;
}

export const authApi = {
  login: (body: LoginRequest) => api.post<LoginResult>("auth/login", body, { authenticated: false, retryOnNetworkFailure: true }),
  refresh: (body: RefreshSessionRequest) => api.post<LoginResult>("auth/refresh", body, { authenticated: false }),
  logout: (body: LogoutRequest) => api.post<{ loggedOut: boolean }>("auth/logout", body),
  me: () => api.get<AuthenticatedUser>("auth/me"),
  requestPasswordReset: (body: { phoneNumber: string }) =>
    api.post<PasswordResetRequestResult>("auth/password-reset/request", body, { authenticated: false }),
  confirmPasswordReset: (body: { phoneNumber: string; otp: string; newPassword: string }) =>
    api.post<{ passwordReset: boolean }>("auth/password-reset/confirm", body, { authenticated: false }),
  createVendorApplicantAccount: (body: VendorApplicantAccountInput) =>
    api.post<ApplicantOnboardingResult>("auth/vendor-onboarding/account", body, { authenticated: false }),
  resendVendorApplicantOtp: (body: { phoneNumber: string }) =>
    api.post<{ resendAccepted: boolean; otpExpiresAt?: string; mockOtp?: string }>("auth/vendor-onboarding/resend-otp", body, { authenticated: false }),
  verifyVendorApplicantOtp: (body: VendorApplicantOtpInput) =>
    api.post<ApplicantOnboardingResult>("auth/vendor-onboarding/verify-otp", body, { authenticated: false }),
  createVendorApplicantPassword: (body: VendorApplicantPasswordInput) =>
    api.post<ApplicantOnboardingResult>("auth/vendor-onboarding/password", body, { authenticated: false }),
  vendorApplicantStatus: (phoneNumber: string) =>
    api.get<ApplicantOnboardingResult>(`auth/vendor-onboarding/status?phoneNumber=${encodeURIComponent(phoneNumber)}`, { authenticated: false }),
  requestVendorActivationLink: (body: { phoneNumber?: string; email?: string }) =>
    api.post<{ requestAccepted: boolean }>("auth/vendor/activation-link/request", body, { authenticated: false })
};
