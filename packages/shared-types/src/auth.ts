import type { UserRole } from "./index";

export interface AuthenticatedUser {
  id: string;
  fullName: string;
  phoneNumber: string;
  email?: string | null;
  role: UserRole;
}

export interface LoginRequest {
  phoneNumber: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken?: string;
  user: AuthenticatedUser;
}

export interface LoginVerificationRequiredResult {
  verificationRequired: true;
  phoneNumber: string;
  otpExpiresAt?: string;
  mockOtp?: string;
  message: string;
}

export type LoginResponse = LoginResult | LoginVerificationRequiredResult;

export interface RefreshSessionRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken?: string;
}

export interface RegisterCustomerRequest {
  fullName: string;
  phoneNumber: string;
  email?: string;
  password: string;
  referralCode?: string;
}

export interface VerifyOtpRequest {
  phoneNumber: string;
  otp: string;
}

export interface ResendOtpRequest {
  phoneNumber: string;
}

export interface ResendOtpResult {
  resendAccepted: boolean;
  otpExpiresAt?: string;
  mockOtp?: string;
}
