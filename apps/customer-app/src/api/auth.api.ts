import type {
  AuthenticatedUser,
  LoginRequest,
  LoginResult,
  RegisterCustomerRequest,
  ResendOtpRequest,
  ResendOtpResult,
  VerifyOtpRequest
} from "@karigo/shared-types";
import { api } from "./client";

export interface RegisterResult {
  user: AuthenticatedUser;
  otpExpiresAt: string;
  mockOtp?: string;
}

export const authApi = {
  register: (body: RegisterCustomerRequest) => api.post<RegisterResult>("auth/customer/register", body, { authenticated: false }),
  resendOtp: (body: ResendOtpRequest) => api.post<ResendOtpResult>("auth/resend-otp", body, { authenticated: false }),
  verifyOtp: (body: VerifyOtpRequest) => api.post<LoginResult>("auth/verify-otp", body, { authenticated: false }),
  login: (body: LoginRequest) => api.post<LoginResult>("auth/login", body, { authenticated: false }),
  me: () => api.get<AuthenticatedUser>("auth/me")
};
