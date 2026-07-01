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
  user: AuthenticatedUser;
}

export interface RegisterCustomerRequest {
  fullName: string;
  phoneNumber: string;
  email?: string;
  password: string;
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
