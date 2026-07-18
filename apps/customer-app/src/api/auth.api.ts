import type {
  AuthenticatedUser,
  ChangePasswordRequest,
  ConfirmPasswordResetRequest,
  LogoutRequest,
  LoginRequest,
  LoginResponse,
  LoginResult,
  RegisterCustomerRequest,
  RefreshSessionRequest,
  RequestPasswordResetRequest,
  RequestPasswordResetResult,
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
  requestPasswordReset: (body: RequestPasswordResetRequest) =>
    api.post<RequestPasswordResetResult>("auth/password-reset/request", body, { authenticated: false }),
  confirmPasswordReset: (body: ConfirmPasswordResetRequest) =>
    api.post<{ passwordReset: boolean }>("auth/password-reset/confirm", body, { authenticated: false }),
  verifyOtp: (body: VerifyOtpRequest) => api.post<LoginResult>("auth/verify-otp", body, { authenticated: false }),
  login: (body: LoginRequest) => api.post<LoginResponse>("auth/login", body, { authenticated: false }),
  changePassword: (body: ChangePasswordRequest) => api.post<{ passwordChanged: boolean }>("auth/change-password", body),
  refresh: (body: RefreshSessionRequest) => api.post<LoginResult>("auth/refresh", body, { authenticated: false }),
  logout: (body: LogoutRequest) => api.post<{ loggedOut: boolean }>("auth/logout", body),
  me: () => api.get<AuthenticatedUser>("auth/me")
};
