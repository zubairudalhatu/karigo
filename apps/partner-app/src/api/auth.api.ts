import type { AuthenticatedUser, LoginRequest, LoginResult, LogoutRequest, RefreshSessionRequest, StartPhoneChangeRequest, StartPhoneChangeResult, ConfirmPhoneChangeRequest, ConfirmPhoneChangeResult } from "@karigo/shared-types";
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
  verificationTicket: string;
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
  verificationTicket?: string;
  mockOtp?: string;
}

export interface PasswordResetRequestResult {
  requestAccepted: boolean;
  otpExpiresAt?: string;
  verificationTicket?: string;
  mockOtp?: string;
}

export const authApi = {
  login: (body: LoginRequest) => api.post<LoginResult>("partner-mobile/session", body, { authenticated: false, retryOnNetworkFailure: true }),
  refresh: (body: RefreshSessionRequest) => api.post<LoginResult>("auth/refresh", body, { authenticated: false }),
  logout: (body: LogoutRequest) => api.post<{ loggedOut: boolean }>("partner-mobile/session/logout", body),
  me: () => api.get<AuthenticatedUser>("partner-mobile/me"),
  startPhoneChange: (body: StartPhoneChangeRequest) => api.post<StartPhoneChangeResult>("auth/phone-change/start", body),
  confirmPhoneChange: (body: ConfirmPhoneChangeRequest) => api.post<ConfirmPhoneChangeResult>("auth/phone-change/confirm", body),
  requestPasswordReset: (body: { phoneNumber: string }) =>
    api.post<PasswordResetRequestResult>("auth/password-reset/request", body, { authenticated: false }),
  confirmPasswordReset: (body: { phoneNumber: string; otp: string; newPassword: string }) =>
    api.post<{ passwordReset: boolean }>("auth/password-reset/confirm", body, { authenticated: false }),
  createVendorApplicantAccount: (body: VendorApplicantAccountInput) =>
    api.post<ApplicantOnboardingResult>("auth/vendor-onboarding/account", body, { authenticated: false }),
  resendVendorApplicantOtp: (body: { phoneNumber: string }) =>
    api.post<{ resendAccepted: boolean; otpExpiresAt?: string; mockOtp?: string }>("auth/vendor-onboarding/resend-otp", body, { authenticated: false }),
  verifyVendorApplicantOtp: (body: VendorApplicantOtpInput) =>
    api.post<ApplicantOnboardingResult>("partner-mobile/verification", body, { authenticated: false }),
  createVendorApplicantPassword: (body: VendorApplicantPasswordInput) =>
    api.post<ApplicantOnboardingResult>("partner-mobile/password", body, { authenticated: false }),
  vendorApplicantStatus: (phoneNumber: string) =>
    api.get<ApplicantOnboardingResult>(`auth/vendor-onboarding/status?phoneNumber=${encodeURIComponent(phoneNumber)}`, { authenticated: false }),
  requestVendorActivationLink: (body: { phoneNumber?: string; email?: string }) =>
    api.post<{ requestAccepted: boolean }>("auth/vendor/activation-link/request", body, { authenticated: false })
};
